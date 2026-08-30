-- P11-D: Extensión mínima del modelo para SEPA
-- Preparar el modelo de datos para soportar posteriormente remesas SEPA

-- Añadir en players
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS iban TEXT,
ADD COLUMN IF NOT EXISTS sepa_mandate_id TEXT,
ADD COLUMN IF NOT EXISTS sepa_mandate_date DATE;

-- Añadir en clubs
ALTER TABLE public.clubs
ADD COLUMN IF NOT EXISTS sepa_creditor_id TEXT,
ADD COLUMN IF NOT EXISTS sepa_iban TEXT;
