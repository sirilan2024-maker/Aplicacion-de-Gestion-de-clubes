// src/actions/stripeActions.ts
'use server';

import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server'; // adjust path if needed

// Initialise Stripe with secret key from env (must be set in .env.local)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16' as any,
});

/**
 * Create a one‑time Checkout Session for a specific fee.
 * @param feeId - UUID of the fee row in the database
 * @param successUrl - URL to redirect after successful payment
 * @param cancelUrl - URL to redirect if the user cancels
 */
export async function createCheckoutSession(params: {
  feeId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const { feeId, successUrl, cancelUrl } = params;

  const supabase = await createClient();
  const { data: fee, error: feeErr } = await supabase
    .from('fees')
    .select('id, amount_cents, currency, status, family_id, concept')
    .eq('id', feeId)
    .single();

  if (feeErr) {
    throw new Error(`Fee not found: ${feeErr.message}`);
  }
  if (fee.status !== 'pending') {
    throw new Error('Only pending fees can be paid');
  }

  // Create a Checkout Session – we embed feeId as metadata for later reconciliation
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: fee.currency,
          product_data: {
            name: fee.concept,
          },
          unit_amount: fee.amount_cents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      fee_id: fee.id,
      family_id: fee.family_id,
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return { sessionId: session.id };
}

/**
 * Create a Subscription Session for a family.
 * @param familyId - UUID of the family (customer)
 * @param priceId - Stripe Price ID for the subscription plan
 * @param successUrl - URL after successful subscription
 * @param cancelUrl - URL if subscription is cancelled
 */
export async function createSubscriptionSession(params: {
  familyId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const { familyId, priceId, successUrl, cancelUrl } = params;

  const supabase = await createClient();
  // Ensure the family exists – we just fetch the email for customer creation
  const { data: family, error: famErr } = await supabase
    .from('families')
    .select('id, email')
    .eq('id', familyId)
    .single();

  if (famErr) {
    throw new Error(`Family not found: ${famErr.message}`);
  }

  // If the family already has a Stripe customer ID we could store it, but for
  // simplicity we create a new customer each time (Stripe deduplicates by email).
  const customer = await stripe.customers.create({
    email: family.email,
    metadata: { family_id: familyId },
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer: customer.id,
    line_items: [{ price: priceId, quantity: 1 }],
    allow_promotion_codes: true,
    metadata: { family_id: familyId },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return { sessionId: session.id };
}
