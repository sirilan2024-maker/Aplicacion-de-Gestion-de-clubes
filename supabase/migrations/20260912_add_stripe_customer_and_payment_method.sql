-- Migration: Add stripe_customer_id and stripe_payment_method_id for off_session future installment processing

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.fees ADD COLUMN IF NOT EXISTS stripe_payment_method_id TEXT;

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_players_stripe_customer_id ON public.players(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_fees_stripe_customer_id ON public.fees(stripe_customer_id);
