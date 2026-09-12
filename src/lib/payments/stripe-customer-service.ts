import Stripe from 'stripe';
import { createAdminClient } from '@/lib/supabase/server';

function getStripeClient(): Stripe {
  return new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16' as any,
  });
}

export interface GetOrCreateStripeCustomerParams {
  email: string;
  name: string;
  clubId: string;
  profileId?: string;
  phone?: string;
}

export interface StripeCustomerResult {
  customerId: string;
  created: boolean;
}

/**
 * Retrieves an existing Stripe Customer or creates a new one, ensuring strict
 * multi-tenant isolation by club_id and preventing duplicate customers per family/tutor.
 */
export async function getOrCreateStripeCustomer(
  params: GetOrCreateStripeCustomerParams
): Promise<StripeCustomerResult> {
  const { email, name, clubId, profileId, phone } = params;

  if (!email) {
    throw new Error('[stripe-customer-service] Email is required to get or create a Stripe Customer.');
  }
  if (!clubId) {
    throw new Error('[stripe-customer-service] clubId is required for multi-tenant customer isolation.');
  }

  const supabaseAdmin = await createAdminClient();
  const stripe = getStripeClient();

  // 1. Check if profile already has a stripe_customer_id stored in Supabase
  if (profileId) {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, club_id, stripe_customer_id')
      .eq('id', profileId)
      .maybeSingle();

    if (profile?.stripe_customer_id) {
      // Validate multi-tenant isolation: profile must belong to the requested club
      if (profile.club_id && profile.club_id !== clubId) {
        throw new Error(`[stripe-customer-service] Multi-tenant violation: Profile club (${profile.club_id}) != requested club (${clubId})`);
      }

      try {
        const existingCustomer = await stripe.customers.retrieve(profile.stripe_customer_id);
        if (!existingCustomer.deleted) {
          // Verify customer metadata matches club_id
          const custClubId = (existingCustomer as Stripe.Customer).metadata?.club_id;
          if (!custClubId || custClubId === clubId) {
            return { customerId: existingCustomer.id, created: false };
          }
        }
      } catch (err: any) {
        console.warn('[stripe-customer-service] Stored customerId not found in Stripe, will create/search fresh:', err.message);
      }
    }
  }

  // 2. Search existing Customer in Stripe with matching email and club_id to prevent duplicate creation
  try {
    const existingList = await stripe.customers.list({
      email: email.trim().toLowerCase(),
      limit: 10,
    });

    const matchingCustomer = existingList.data.find(
      (c) => !c.deleted && c.metadata?.club_id === clubId
    );

    if (matchingCustomer) {
      // If found in Stripe, persist to profile
      if (profileId) {
        await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: matchingCustomer.id })
          .eq('id', profileId);
      }
      return { customerId: matchingCustomer.id, created: false };
    }
  } catch (searchErr: any) {
    console.warn('[stripe-customer-service] Error searching Stripe customers:', searchErr.message);
  }

  // 3. Create fresh Stripe Customer with explicit club and profile metadata
  const newCustomer = await stripe.customers.create({
    email: email.trim().toLowerCase(),
    name: name?.trim() || email.split('@')[0],
    phone: phone?.trim() || undefined,
    metadata: {
      club_id: clubId,
      profile_id: profileId || '',
      created_from: 'registration_wizard',
    },
  });

  // 4. Persist newly created stripe_customer_id in Supabase profile
  if (profileId) {
    await supabaseAdmin
      .from('profiles')
      .update({ stripe_customer_id: newCustomer.id })
      .eq('id', profileId);
  }

  return { customerId: newCustomer.id, created: true };
}
