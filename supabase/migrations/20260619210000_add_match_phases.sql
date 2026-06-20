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
    'Amarilla', 'Cambio', 'Tiro al larguero', 'Tiro al palo', 'Penalti', 'Lesión', 'Gol en propia puerta',
    'Descanso', 'Fin de Partido'
  ));
