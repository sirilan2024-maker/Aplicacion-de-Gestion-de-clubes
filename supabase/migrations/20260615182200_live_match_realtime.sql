-- Add realtime timer columns to partidos
ALTER TABLE public.partidos
ADD COLUMN IF NOT EXISTS live_timer_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS live_timer_elapsed_seconds INTEGER DEFAULT 0;

-- Expand the allowed event types in match_events
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.match_events'::regclass
      AND contype = 'c'
      AND conname LIKE '%tipo_evento%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.match_events DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE public.match_events
  ADD CONSTRAINT match_events_tipo_evento_check 
  CHECK (tipo_evento IN (
    'Gol', 'Asistencia', 'Tarjeta Amarilla', 'Tarjeta Roja', 'Cambio Entra', 'Cambio Sale', 'Penalty', 'Gol en Propia',
    'Amarilla', 'Cambio', 'Tiro al larguero', 'Tiro al palo', 'Penalti', 'Lesión', 'Gol en propia puerta'
  ));

-- Enable real-time for the tables
DO $$
BEGIN
    -- Comprobar si supabase_realtime existe (en entornos locales a veces no existe si no se creó, pero en prod sí)
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'partidos' AND schemaname = 'public'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.partidos;
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' AND tablename = 'match_events' AND schemaname = 'public'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.match_events;
        END IF;
    END IF;
END $$;
