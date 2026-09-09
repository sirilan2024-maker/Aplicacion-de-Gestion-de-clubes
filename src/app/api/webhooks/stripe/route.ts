import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  recordStripePaymentWebhook,
  recordStripePaymentProcessing,
  recordStripeFailure,
  recordStripeRefund,
} from '@/lib/payments/stripe-payment-service';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy_key_for_build', {
  apiVersion: '2023-10-16' as any,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');
    let event: Stripe.Event;

    // Validar firma estricta de Stripe
    if (!webhookSecret || !signature) {
      console.warn('[webhook/stripe] Webhook secret o firma ausente');
      return NextResponse.json({ error: 'Firma de webhook ausente o no configurada' }, { status: 400 });
    }

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('⚠️ Webhook signature verification failed:', err.message);
      return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 });
    }

    // ────────────────────────────────────────────────────────────────────────
    // PROCESAMIENTO DE EVENTOS STRIPE (Desacoplado de cookies / sesión)
    // ────────────────────────────────────────────────────────────────────────
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await recordStripePaymentWebhook(intent);
        break;
      }

      case 'payment_intent.processing': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await recordStripePaymentProcessing(intent);
        break;
      }

      case 'payment_intent.payment_failed':
      case 'payment_intent.canceled': {
        const intent = event.data.object as Stripe.PaymentIntent;
        await recordStripeFailure(intent);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        await recordStripeRefund(charge);
        break;
      }

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.payment_intent && typeof session.payment_intent === 'string') {
          try {
            const intent = await stripe.paymentIntents.retrieve(session.payment_intent);
            await recordStripePaymentWebhook(intent);
          } catch (err) {
            console.error('[webhook/stripe] Error retrieving payment intent for checkout session:', err);
          }
        }
        break;
      }

      default:
        // Otros eventos no relevantes para conciliación económica se ignoran
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err: any) {
    console.error('Error handling stripe webhook:', err);
    return NextResponse.json(
      { error: 'Webhook handler failed: ' + (err.message || 'Desconocido') },
      { status: 500 }
    );
  }
}

