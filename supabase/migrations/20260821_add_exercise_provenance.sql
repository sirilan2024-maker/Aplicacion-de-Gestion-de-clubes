-- 20260821_add_exercise_provenance.sql
-- Fase 1: Trazabilidad, procedencia y validación de ejercicios en banco_ejercicios

ALTER TABLE public.banco_ejercicios 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal',
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'Sporting Saladar',
ADD COLUMN IF NOT EXISTS license TEXT DEFAULT 'Proprietary / Internal',
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT true;

-- Asegurar que los ejercicios existentes tengan trazabilidad base
UPDATE public.banco_ejercicios 
SET 
  source = COALESCE(source, 'internal'),
  author = COALESCE(author, 'Sporting Saladar'),
  license = COALESCE(license, 'Club Internal / Curated'),
  is_verified = COALESCE(is_verified, true)
WHERE is_verified IS NULL;

-- Índice para consultas de biblioteca homologada vs candidatos
CREATE INDEX IF NOT EXISTS idx_banco_ejercicios_verified ON public.banco_ejercicios(club_id, is_verified);
