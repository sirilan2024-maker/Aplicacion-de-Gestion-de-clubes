-- Migracion: Endurecimiento de trazabilidad e idempotencia en pagos y cuotas
-- Preserva todo el historico contable existente sin cascades destructivos.

ALTER TABLE IF EXISTS public.fee_payments
  ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'succeeded',
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'eur',
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Indice unico para idempotencia estricta en pagos de proveedores (Stripe, etc.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_fee_payments_provider_unique
ON public.fee_payments(provider, provider_payment_id)
WHERE provider_payment_id IS NOT NULL;

-- Campo de referencia de cobro en fees (para conciliacion de transferencias / pasarelas)
ALTER TABLE IF EXISTS public.fees
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_fees_stripe_pi
ON public.fees(stripe_payment_intent_id)
WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fees_payment_reference
ON public.fees(payment_reference)
WHERE payment_reference IS NOT NULL;