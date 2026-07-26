-- Migration: Add medical and physical columns to players table
-- This maps the extensive medical and physical data collected in the new RegistrationWizard

ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS altura text,
ADD COLUMN IF NOT EXISTS peso text,
ADD COLUMN IF NOT EXISTS talla_pie text,
ADD COLUMN IF NOT EXISTS clubes_anteriores text,
ADD COLUMN IF NOT EXISTS posicion_secundaria text,
ADD COLUMN IF NOT EXISTS posicion_gustaria text,
ADD COLUMN IF NOT EXISTS pie_dominante text,
ADD COLUMN IF NOT EXISTS anos_jugando text,
ADD COLUMN IF NOT EXISTS objetivo_temporada text,
ADD COLUMN IF NOT EXISTS enfermedades text,
ADD COLUMN IF NOT EXISTS medicacion text,
ADD COLUMN IF NOT EXISTS lesiones text,
ADD COLUMN IF NOT EXISTS operaciones text,
ADD COLUMN IF NOT EXISTS observaciones_medicas text,
ADD COLUMN IF NOT EXISTS sip text;
