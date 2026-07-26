import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';
import { addPartialPaymentAction } from '@/app/actions/treasury-actions';

export const runtime = 'nodejs';

// Configurar Stripe y webhooks
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build', {
  apiVersion: '2023-10-16' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    let event: Stripe.Event;

    // Validate the Stripe signature if the secret is present
    if (webhookSecret && signature) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err: any) {
        console.error(`⚠️  Webhook signature verification failed:`, err.message);
        return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
      }
    } else {
      const data = JSON.parse(body);
      event = data as Stripe.Event;
    }

    const supabaseAdmin = await createAdminClient();

    // ────────────────────────────────────────────────────────────────────────
    // FLUJO A: Pagos de Registro (Payment Intent)
    // ────────────────────────────────────────────────────────────────────────
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const playerId = intent.metadata?.player_id;
      const amountCents = intent.amount;

      if (playerId) {
        // Asegurar que el estado esté formalizado (aunque ya lo debería estar por defecto)
        await supabaseAdmin
          .from('players')
          .update({ registration_status: 'formalized' })
          .eq('id', playerId);

        // Buscar la primera cuota (de inscripción) del jugador
        const { data: firstFee } = await supabaseAdmin
          .from('fees')
          .select('id')
          .eq('player_id', playerId)
          .order('creado_en', { ascending: true })
          .limit(1)
          .single();

        if (firstFee) {
          try {
            await addPartialPaymentAction(firstFee.id, amountCents, 'Stripe');
          } catch (err) {
            console.error("Error al inyectar pago Stripe en la cuota:", err);
          }
        }
      }
    }

    // ────────────────────────────────────────────────────────────────────────
    // FLUJO B: Pagos desde el Dashboard de Familia (Checkout Session)
    // ────────────────────────────────────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const feeId = session.metadata?.fee_id;
      const amountCents = session.amount_total || 0;

      if (feeId) {
        try {
          await addPartialPaymentAction(feeId, amountCents, 'Stripe');
        } catch (err) {
          console.error("Error al inyectar pago Stripe manual en la cuota:", err);
        }
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error handling webhook:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
