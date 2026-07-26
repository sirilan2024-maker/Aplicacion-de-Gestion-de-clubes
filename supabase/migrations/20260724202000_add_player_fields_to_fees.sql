-- Migración: Añadir campos de jugador y pago a la tabla fees
-- Para poder asociar pagos directamente a la ficha del jugador

ALTER TABLE public.fees 
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES public.players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_method TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

-- Índice para búsquedas rápidas por jugador
CREATE INDEX IF NOT EXISTS idx_fees_player ON public.fees (player_id);

