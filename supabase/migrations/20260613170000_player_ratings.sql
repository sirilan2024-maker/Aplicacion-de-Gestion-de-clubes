-- Añadir la columna coach_rating a la tabla convocatorias
ALTER TABLE public.convocatorias
ADD COLUMN IF NOT EXISTS coach_rating INTEGER DEFAULT 0;

-- Opcionalmente añadir un comentario a la columna
COMMENT ON COLUMN public.convocatorias.coach_rating IS 'Nota del 1 al 10 dada por el cuerpo técnico al jugador tras el partido';
