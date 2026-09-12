import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { recordStripePaymentWebhook } from '@/lib/payments/stripe-payment-service';

function getStripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
  });
}

export interface AutomaticFeeResult {
  success: boolean;
  status: string;
  feeId: string;
  intentId?: string;
  amountChargedCents?: number;
  reason?: string;
  skipped?: boolean;
}

export interface BatchProcessSummary {
  processed: number;
  succeeded: number;
  requiresAction: number;
  failed: number;
  skipped: number;
  items: Array<{ feeId: string; status: string; reason?: string }>;
}

/**
 * Safely processes an automatic off_session payment for a fractional installment fee (Cuota 2).
 * Validates due date (fecha_pago <= now), prior payment of Cuota 1, multi-tenant isolation, idempotency, and non-hardcoded amount.
 */
export async function processAutomaticFeePayment(
  feeId: string,
  options?: { force?: boolean }
): Promise<AutomaticFeeResult> {
  const supabaseAdmin = await createAdminClient();
  const stripe = getStripeClient();

  // 1. Fetch target fee with player details
  const { data: fee, error: feeErr } = await supabaseAdmin
    .from('fees')
    .select('id, club_id, player_id, concept, amount_cents, amount_paid_cents, estado, fecha_pago, currency, stripe_payment_intent_id, payment_reference, players(id, first_name, last_name, parent1_email, payment_plan, tutor_id)')
    .eq('id', feeId)
    .single();

  if (feeErr || !fee) {
    return { success: false, status: 'error', feeId, reason: 'Cuota no encontrada' };
  }

  // 2. Validate that fee is still pending
  if (fee.estado === 'pagado') {
    return { success: false, status: 'skipped', feeId, skipped: true, reason: 'La cuota ya está pagada' };
  }

  const remainingCents = (fee.amount_cents || 0) - (fee.amount_paid_cents || 0);
  if (remainingCents <= 0) {
    return { success: false, status: 'skipped', feeId, skipped: true, reason: 'Saldo pendiente es cero' };
  }

  // 3. Validate due date: due_date (fecha_pago) <= now
  const dueDate = fee.fecha_pago ? new Date(fee.fecha_pago) : new Date(0);
  const now = new Date();
  if (!options?.force && dueDate > now) {
    return { success: false, status: 'skipped', feeId, skipped: true, reason: 'Fecha de vencimiento futura' };
  }

  // 4. Validate that this is Cuota 2 of a fractional plan
  const isFractionalConcept = fee.concept.includes('(2/') || fee.concept.includes('(2 de');
  const playerObj = Array.isArray(fee.players) ? fee.players[0] : fee.players;
  const isPlayerFractional = playerObj?.payment_plan === 'Fraccionado';

  if (!isFractionalConcept && !isPlayerFractional) {
    return { success: false, status: 'skipped', feeId, skipped: true, reason: 'No es una segunda cuota fraccionada' };
  }

  // 5. Verify that Cuota 1 for this player exists and was successfully paid
  if (fee.player_id) {
    const { data: cuota1 } = await supabaseAdmin
      .from('fees')
      .select('id, estado, amount_cents, amount_paid_cents, stripe_payment_intent_id')
      .eq('player_id', fee.player_id)
      .neq('id', fee.id)
      .ilike('concept', '%(1/%')
      .order('creado_en', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (cuota1 && cuota1.estado !== 'pagado') {
      const { data: cuota1Payments } = await supabaseAdmin
        .from('fee_payments')
        .select('id')
        .eq('fee_id', cuota1.id)
        .eq('status', 'succeeded')
        .limit(1);

      if (!cuota1Payments || cuota1Payments.length === 0) {
        return { success: false, status: 'skipped', feeId, skipped: true, reason: 'La primera cuota (1/2) aún no ha sido completada' };
      }
    }
  }

  // 6. Resolve Stripe Customer and PaymentMethod
  let stripeCustomerId: string | null = null;
  let stripePaymentMethodId: string | null = null;

  if (fee.player_id) {
    const { data: pastPayments } = await supabaseAdmin
      .from('fee_payments')
      .select('metadata, provider_payment_id')
      .eq('player_id', fee.player_id)
      .eq('provider', 'stripe')
      .eq('status', 'succeeded')
      .order('created_at', { ascending: false });

    if (pastPayments && pastPayments.length > 0) {
      for (const p of pastPayments) {
        if (p.metadata?.stripe_customer_id) {
          stripeCustomerId = p.metadata.stripe_customer_id;
        }
        if (p.metadata?.stripe_payment_method_id) {
          stripePaymentMethodId = p.metadata.stripe_payment_method_id;
        }
        if (stripeCustomerId && stripePaymentMethodId) break;
      }
    }
  }

  if (!stripeCustomerId && playerObj?.parent1_email) {
    try {
      const custList = await stripe.customers.list({
        email: playerObj.parent1_email.trim().toLowerCase(),
        limit: 5,
      });
      const match = custList.data.find((c) => !c.deleted && c.metadata?.club_id === fee.club_id);
      if (match) stripeCustomerId = match.id;
    } catch (e) {}
  }

  if (!stripeCustomerId) {
    return { success: false, status: 'requires_manual_payment', feeId, reason: 'No se encontró Stripe Customer para cobro automático' };
  }

  // 7. Multi-tenant and Customer Verification against Stripe API
  let customerObj: Stripe.Customer | null = null;
  try {
    const cust = await stripe.customers.retrieve(stripeCustomerId);
    if (cust.deleted) {
      return { success: false, status: 'rejected', feeId, reason: 'Stripe Customer eliminado' };
    }
    customerObj = cust as Stripe.Customer;

    if (customerObj.metadata?.club_id && customerObj.metadata.club_id !== fee.club_id) {
      return { success: false, status: 'rejected', feeId, reason: `Multi-tenant violation: Customer club (${customerObj.metadata.club_id}) != Fee club (${fee.club_id})` };
    }
  } catch (custErr: any) {
    return { success: false, status: 'error', feeId, reason: `Error verificando Customer en Stripe: ${custErr.message}` };
  }

  // 8. Resolve and Validate PaymentMethod attached to Customer
  if (!stripePaymentMethodId) {
    try {
      const pmList = await stripe.paymentMethods.list({
        customer: stripeCustomerId,
        type: 'card',
        limit: 1,
      });
      if (pmList.data.length > 0) {
        stripePaymentMethodId = pmList.data[0].id;
      }
    } catch (pmErr: any) {
      console.warn('[stripe-automatic-fee] Error listing payment methods for customer:', pmErr.message);
    }
  }

  if (!stripePaymentMethodId) {
    return { success: false, status: 'requires_manual_payment', feeId, reason: 'No se encontró PaymentMethod guardado en Stripe' };
  }

  // Validate PaymentMethod ownership
  try {
    const pm = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
    const pmCustomer = typeof pm.customer === 'string' ? pm.customer : pm.customer?.id;
    if (pmCustomer && pmCustomer !== stripeCustomerId) {
      return { success: false, status: 'rejected', feeId, reason: 'PaymentMethod no pertenece al Customer esperado' };
    }
  } catch (pmCheckErr: any) {
    return { success: false, status: 'error', feeId, reason: `Error verificando PaymentMethod: ${pmCheckErr.message}` };
  }

  // 9. Concurrency & In-flight Idempotency Check
  if (fee.stripe_payment_intent_id && fee.stripe_payment_intent_id.startsWith('pi_')) {
    try {
      const existingIntent = await stripe.paymentIntents.retrieve(fee.stripe_payment_intent_id);
      if (existingIntent.status === 'succeeded') {
        await recordStripePaymentWebhook(existingIntent);
        return { success: true, status: 'succeeded', feeId, intentId: existingIntent.id, amountChargedCents: existingIntent.amount };
      }
      if (existingIntent.status === 'processing') {
        return { success: false, status: 'processing', feeId, intentId: existingIntent.id, reason: 'PaymentIntent en procesamiento' };
      }
    } catch (retrieveErr) {}
  }

  // 10. Execute Off-Session PaymentIntent with strict Idempotency Key
  const currentYear = new Date().getFullYear();
  const paymentRef = fee.payment_reference || `PAY-${currentYear}-${(fee.player_id || fee.id).substring(0, 8).toUpperCase()}`;
  const playerName = playerObj ? `${playerObj.first_name || ''} ${playerObj.last_name || ''}`.trim() : 'Jugador';

  try {
    const intent = await stripe.paymentIntents.create({
      amount: remainingCents, // STRICTLY DYNAMIC FROM FEE (NEVER HARDCODED)
      currency: (fee.currency || 'eur').toLowerCase(),
      customer: stripeCustomerId,
      payment_method: stripePaymentMethodId,
      off_session: true,
      confirm: true,
      description: `${fee.concept || 'CUOTA INSCRIPCIÓN'} - CLUB SPORTING SALADAR`,
      metadata: {
        fee_id: fee.id,
        player_id: fee.player_id || '',
        club_id: fee.club_id || '',
        customer_id: stripeCustomerId,
        payment_reference: paymentRef,
        player: playerName,
        type: 'cuota_fraccionada_2_auto',
        is_automated_cron: 'true',
      },
    }, {
      idempotencyKey: `auto_fee_${fee.id}`,
    });

    await supabaseAdmin
      .from('fees')
      .update({ stripe_payment_intent_id: intent.id })
      .eq('id', fee.id);

    if (intent.status === 'succeeded') {
      await recordStripePaymentWebhook(intent);
      return {
        success: true,
        status: 'succeeded',
        feeId,
        intentId: intent.id,
        amountChargedCents: remainingCents,
      };
    } else if (intent.status === 'requires_action') {
      return {
        success: false,
        status: 'requires_action',
        feeId,
        intentId: intent.id,
        reason: 'Se requiere autenticación 3D Secure (SCA). La familia puede abonar mediante "Pagar cuota".',
      };
    } else if (intent.status === 'processing') {
      return {
        success: true,
        status: 'processing',
        feeId,
        intentId: intent.id,
        amountChargedCents: remainingCents,
      };
    } else {
      return {
        success: false,
        status: intent.status,
        feeId,
        intentId: intent.id,
        reason: `Estado del intento: ${intent.status}`,
      };
    }
  } catch (stripeErr: any) {
    if (stripeErr.code === 'authentication_required' || stripeErr.type === 'StripeCardError') {
      return {
        success: false,
        status: 'requires_action',
        feeId,
        reason: stripeErr.message || 'Autenticación requerida por el banco emisor (SCA)',
      };
    }

    return {
      success: false,
      status: 'failed',
      feeId,
      reason: stripeErr.message || 'Error en pasarela Stripe',
    };
  }
}

/**
 * Batch processor called by Vercel Cron.
 * Scans for due fractional installment fees and processes them up to the specified limit.
 */
export async function processAllDueFractionalFees(
  options?: { limit?: number }
): Promise<BatchProcessSummary> {
  const limit = options?.limit || 25;
  const supabaseAdmin = await createAdminClient();
  const now = new Date().toISOString();

  const { data: dueFees, error } = await supabaseAdmin
    .from('fees')
    .select('id, concept, fecha_pago, amount_cents, amount_paid_cents')
    .eq('estado', 'pendiente')
    .lte('fecha_pago', now)
    .ilike('concept', '%(2/%')
    .order('fecha_pago', { ascending: true })
    .limit(limit);

  if (error || !dueFees || dueFees.length === 0) {
    return {
      processed: 0,
      succeeded: 0,
      requiresAction: 0,
      failed: 0,
      skipped: 0,
      items: [],
    };
  }

  const summary: BatchProcessSummary = {
    processed: 0,
    succeeded: 0,
    requiresAction: 0,
    failed: 0,
    skipped: 0,
    items: [],
  };

  for (const fee of dueFees) {
    summary.processed++;
    try {
      const res = await processAutomaticFeePayment(fee.id);
      summary.items.push({ feeId: fee.id, status: res.status, reason: res.reason });

      if (res.success && res.status === 'succeeded') {
        summary.succeeded++;
      } else if (res.status === 'requires_action') {
        summary.requiresAction++;
      } else if (res.skipped) {
        summary.skipped++;
      } else {
        summary.failed++;
      }
    } catch (itemErr: any) {
      summary.failed++;
      summary.items.push({ feeId: fee.id, status: 'error', reason: itemErr.message });
    }
  }

  return summary;
}
