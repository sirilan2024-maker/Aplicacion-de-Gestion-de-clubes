-- Añadir columnas de estadísticas a la tabla convocatorias
ALTER TABLE public.convocatorias
ADD COLUMN IF NOT EXISTS goals INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS assists INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS yellow_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS red_cards INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS minutes_played INTEGER DEFAULT 0;

-- Comentarios explicativos
COMMENT ON COLUMN public.convocatorias.goals IS 'Goles anotados por el jugador en este partido';
COMMENT ON COLUMN public.convocatorias.assists IS 'Asistencias dadas por el jugador en este partido';
COMMENT ON COLUMN public.convocatorias.yellow_cards IS 'Tarjetas amarillas (max 2)';
COMMENT ON COLUMN public.convocatorias.red_cards IS 'Tarjetas rojas (max 1)';
COMMENT ON COLUMN public.convocatorias.minutes_played IS 'Minutos que ha jugado en total en este partido';
