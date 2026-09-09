import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { generateAndUploadReceiptAction } from '@/app/actions/treasury-actions';

function getStripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
  });
}

/**
 * Resolves the effective payment method used from a confirmed Stripe PaymentIntent
 * Priority:
 * 1. Confirmed Charge details (charges.data[0].payment_method_details.type)
 * 2. PaymentMethod object if expanded (intent.payment_method.type)
 * 3. PaymentMethod retrieved via Stripe SDK if string ID
 * 4. Fallback mapping
 */
export async function resolveStripePaymentMethod(
  intent: Stripe.PaymentIntent,
  stripeClient?: Stripe
): Promise<string> {
  let methodType: string | null = null;

  // 1. Charge payment_method_details (most accurate on confirmed intents)
  const charges = (intent as any).charges?.data;
  if (Array.isArray(charges) && charges.length > 0) {
    const latestCharge = charges[charges.length - 1];
    if (latestCharge.payment_method_details?.type) {
      methodType = latestCharge.payment_method_details.type;
    }
  }

  // 2. Expanded PaymentMethod object
  if (!methodType && intent.payment_method && typeof intent.payment_method === 'object') {
    methodType = (intent.payment_method as Stripe.PaymentMethod).type;
  }

  // 3. Retrieve PaymentMethod via Stripe API if string ID
  const stripe = stripeClient || (process.env.STRIPE_SECRET_KEY ? getStripeClient() : null);

  if (!methodType && typeof intent.payment_method === 'string' && intent.payment_method.startsWith('pm_')) {
    if (stripe) {
      try {
        const pm = await stripe.paymentMethods.retrieve(intent.payment_method);
        if (pm?.type) {
          methodType = pm.type;
        }
      } catch (err) {
        console.warn('[stripe-payment-service] Error retrieving payment method:', err);
      }
    }
  }

  // 4. Retrieve Charge via latest_charge if needed
  if (!methodType && (intent as any).latest_charge && stripe) {
    const chargeId = typeof (intent as any).latest_charge === 'string'
      ? (intent as any).latest_charge
      : (intent as any).latest_charge?.id;
    if (chargeId) {
      try {
        const charge = await stripe.charges.retrieve(chargeId);
        if (charge.payment_method_details?.type) {
          methodType = charge.payment_method_details.type;
        }
      } catch (err) {
        console.warn('[stripe-payment-service] Error retrieving charge:', err);
      }
    }
  }

  // 5. Fallback to first payment_method_types if available and only 1 type was specified
  if (!methodType && Array.isArray(intent.payment_method_types) && intent.payment_method_types.length === 1) {
    methodType = intent.payment_method_types[0];
  }

  // Map to friendly application terminology
  switch (methodType?.toLowerCase()) {
    case 'bizum':
      return 'Bizum';
    case 'paypal':
      return 'PayPal';
    case 'card':
      return 'Tarjeta';
    case 'sepa_debit':
      return 'SEPA';
    default:
      return 'Stripe';
  }
}

/**
 * Service to process Stripe Webhook events and record verified payments
 * using Supabase Admin client with zero dependency on user session / cookies.
 */
export async function recordStripePaymentWebhook(intent: Stripe.PaymentIntent) {
  if (intent.status !== 'succeeded') {
    return { success: false, reason: `PaymentIntent not succeeded (status: ${intent.status})` };
  }

  const supabaseAdmin = await createAdminClient();
  const feeId = intent.metadata?.fee_id;
  const playerId = intent.metadata?.player_id;
  const clubId = intent.metadata?.club_id;
  const paymentReference = intent.metadata?.payment_reference;
  const amountCents = intent.amount;

  // 1. Idempotency Check: verify if this payment_intent has already been recorded in fee_payments
  const { data: existingPayment } = await supabaseAdmin
    .from('fee_payments')
    .select('id, fee_id, status')
    .eq('provider', 'stripe')
    .eq('provider_payment_id', intent.id)
    .maybeSingle();

  if (existingPayment && existingPayment.status === 'succeeded') {
    console.log(`[stripe-payment-service] PaymentIntent ${intent.id} already recorded. Idempotent return.`);
    return { success: true, duplicate: true, paymentId: existingPayment.id };
  }

  // 2. Locate the target fee
  let fee: any = null;
  if (feeId) {
    const { data: f } = await supabaseAdmin
      .from('fees')
      .select('id, club_id, player_id, amount_cents, amount_paid_cents, estado, payment_reference, currency')
      .eq('id', feeId)
      .single();
    fee = f;
  }

  // Fallback: If feeId is missing or not found, try by player_id (first pending fee)
  if (!fee && playerId) {
    const { data: f } = await supabaseAdmin
      .from('fees')
      .select('id, club_id, player_id, amount_cents, amount_paid_cents, estado, payment_reference, currency')
      .eq('player_id', playerId)
      .order('creado_en', { ascending: true })
      .limit(1)
      .single();
    fee = f;
  }

  if (!fee) {
    console.error(`[stripe-payment-service] Target fee not found for intent ${intent.id}, feeId: ${feeId}, playerId: ${playerId}`);
    return { success: false, error: 'Fee not found' };
  }

  // Multi-tenant validation: ensure club matches if provided in metadata
  if (clubId && fee.club_id && fee.club_id !== clubId) {
    console.error(`[stripe-payment-service] Multi-tenant mismatch: fee.club_id (${fee.club_id}) != intent.club_id (${clubId})`);
    return { success: false, error: 'Club multi-tenant mismatch' };
  }

  // Currency validation: verify that intent currency matches expected fee currency
  const expectedCurrency = (fee.currency || 'eur').toLowerCase();
  const intentCurrency = (intent.currency || 'eur').toLowerCase();
  if (expectedCurrency !== intentCurrency) {
    console.error(`[stripe-payment-service] Currency mismatch: fee (${expectedCurrency}) != intent (${intentCurrency})`);
    return { success: false, error: 'Currency mismatch' };
  }

  // 3. Resolve effective payment method (Tarjeta, Bizum, PayPal, etc.)
  const resolvedMethod = await resolveStripePaymentMethod(intent);

  // 4. Insert or update into fee_payments with provider idempotency
  let insertedPayment: any = null;
  if (existingPayment) {
    // If was previously in 'processing', update to 'succeeded'
    const { data: updatedPayment, error: updateError } = await supabaseAdmin
      .from('fee_payments')
      .update({
        amount_cents: amountCents,
        payment_method: resolvedMethod,
        status: 'succeeded',
        currency: intentCurrency,
        metadata: {
          stripe_payment_intent_id: intent.id,
          payment_method_type: resolvedMethod,
          created: intent.created,
        },
      })
      .eq('id', existingPayment.id)
      .select('id')
      .single();

    if (updateError) {
      console.error('[stripe-payment-service] Error updating existing fee_payment:', updateError);
      return { success: false, error: updateError.message };
    }
    insertedPayment = updatedPayment;
  } else {
    const { data: newPayment, error: paymentError } = await supabaseAdmin
      .from('fee_payments')
      .insert({
        fee_id: fee.id,
        club_id: fee.club_id,
        player_id: fee.player_id || playerId || null,
        amount_cents: amountCents,
        payment_method: resolvedMethod,
        provider: 'stripe',
        provider_payment_id: intent.id,
        payment_reference: paymentReference || fee.payment_reference || null,
        status: 'succeeded',
        currency: intentCurrency,
        metadata: {
          stripe_payment_intent_id: intent.id,
          payment_method_type: resolvedMethod,
          created: intent.created,
        },
      })
      .select('id')
      .single();

    if (paymentError) {
      // If unique constraint was triggered by concurrent webhook, treat as duplicate
      if (paymentError.code === '23505') {
        console.log(`[stripe-payment-service] Unique constraint on intent ${intent.id}. Idempotent return.`);
        return { success: true, duplicate: true };
      }
      console.error('[stripe-payment-service] Error inserting fee_payment:', paymentError);
      return { success: false, error: paymentError.message };
    }
    insertedPayment = newPayment;
  }

  // 5. Recalculate fee paid total from all succeeded payments (Stripe, Manual, etc.)
  const { data: allPayments } = await supabaseAdmin
    .from('fee_payments')
    .select('amount_cents')
    .eq('fee_id', fee.id)
    .eq('status', 'succeeded');

  const totalPaidCents = (allPayments || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0);
  const boundedPaidCents = Math.min(totalPaidCents, fee.amount_cents);
  const isFullyPaid = totalPaidCents >= fee.amount_cents;

  await supabaseAdmin
    .from('fees')
    .update({
      amount_paid_cents: boundedPaidCents,
      estado: isFullyPaid ? 'pagado' : 'pendiente',
      fecha_pago: new Date().toISOString(),
      payment_method: resolvedMethod,
      stripe_payment_intent_id: intent.id,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', fee.id);

  // 6. Generate official receipt (with built-in deduplication)
  try {
    await generateAndUploadReceiptAction(fee.id);
  } catch (receiptErr) {
    console.error('[stripe-payment-service] Error generating receipt:', receiptErr);
  }

  return { success: true, paymentId: insertedPayment?.id, paymentMethod: resolvedMethod };
}

export async function recordStripePaymentProcessing(intent: Stripe.PaymentIntent) {
  console.log(`[stripe-payment-service] PaymentIntent ${intent.id} is in 'processing' state.`);
  return { success: true, handled: true, status: 'processing' };
}

export async function recordStripeFailure(intent: Stripe.PaymentIntent) {
  console.log(`[stripe-payment-service] PaymentIntent ${intent.id} failed or was canceled (status: ${intent.status})`);
  return { success: true, handled: true, status: intent.status };
}

export async function recordStripeRefund(charge: Stripe.Charge) {
  const supabaseAdmin = await createAdminClient();
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  
  if (!paymentIntentId) {
    return { success: false, error: 'No payment intent id on charge' };
  }

  // Find original payment
  const { data: origPayment } = await supabaseAdmin
    .from('fee_payments')
    .select('id, fee_id, club_id, player_id, amount_cents, fees(*)')
    .eq('provider', 'stripe')
    .eq('provider_payment_id', paymentIntentId)
    .maybeSingle();

  if (!origPayment) {
    console.log(`[stripe-payment-service] Original payment for refund not found (PI: ${paymentIntentId})`);
    return { success: false, error: 'Original payment not found' };
  }

  const refundAmountCents = charge.amount_refunded || origPayment.amount_cents;
  const refundRef = `REFUND_${paymentIntentId}_${Date.now()}`;

  // Insert compensatory refund record
  await supabaseAdmin.from('fee_payments').insert({
    fee_id: origPayment.fee_id,
    club_id: origPayment.club_id,
    player_id: origPayment.player_id,
    amount_cents: -refundAmountCents,
    payment_method: 'Stripe Refund',
    provider: 'stripe',
    provider_payment_id: refundRef,
    status: 'refunded',
    currency: charge.currency || 'eur',
    metadata: {
      original_payment_id: origPayment.id,
      charge_id: charge.id,
      refund_amount_cents: refundAmountCents,
    },
  });

  // Recalculate fee paid total
  const { data: allPayments } = await supabaseAdmin
    .from('fee_payments')
    .select('amount_cents')
    .eq('fee_id', origPayment.fee_id)
    .eq('status', 'succeeded');

  const totalPaidCents = Math.max(0, (allPayments || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0) - refundAmountCents);
  
  await supabaseAdmin
    .from('fees')
    .update({
      amount_paid_cents: totalPaidCents,
      estado: totalPaidCents >= ((origPayment.fees as any)?.amount_cents || 0) ? 'pagado' : 'pendiente',
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', origPayment.fee_id);

  return { success: true, refundRecorded: true };
}
