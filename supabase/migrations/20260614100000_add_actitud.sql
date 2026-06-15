-- Añadir columna actitud a la tabla convocatorias
ALTER TABLE public.convocatorias
ADD COLUMN IF NOT EXISTS actitud INTEGER DEFAULT 0;

-- Comentarios explicativos
COMMENT ON COLUMN public.convocatorias.actitud IS 'Nota de actitud del jugador en el partido (1-10)';
