-- Migración para añadir soporte de recordatorios de asistencia automáticos usando pg_cron

-- 1. Añadir columnas a team_events
ALTER TABLE public.team_events 
ADD COLUMN IF NOT EXISTS rsvp_reminder_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rsvp_reminder_sent BOOLEAN DEFAULT false;

-- 2. Añadir columnas a partidos
ALTER TABLE public.partidos 
ADD COLUMN IF NOT EXISTS rsvp_reminder_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rsvp_reminder_sent BOOLEAN DEFAULT false;

-- 3. Habilitar pg_cron si no está habilitado (Requiere privilegios de superusuario)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 4. Crear la función que procesa los recordatorios
CREATE OR REPLACE FUNCTION public.send_scheduled_rsvps()
RETURNS void AS $$
DECLARE
    v_event RECORD;
    v_match RECORD;
BEGIN
    -- Procesar team_events (Ej: Entrenamientos)
    FOR v_event IN 
        SELECT id, team_id, title, start_time 
        FROM public.team_events 
        WHERE rsvp_reminder_time <= NOW() AND (rsvp_reminder_sent IS NULL OR rsvp_reminder_sent = false)
    LOOP
        -- Insertar notificaciones para los tutores de los jugadores del equipo
        INSERT INTO public.notifications (profile_id, title, content, read, created_at)
        SELECT 
            p.tutor_id,
            'Recordatorio: ' || COALESCE(v_event.title, 'Evento'),
            'Tienes un evento programado (' || COALESCE(v_event.title, 'Evento') || '). ¿Vas a asistir? Por favor, confirma asistencia.',
            false,
            NOW()
        FROM public.players p
        WHERE p.team_id = v_event.team_id AND p.tutor_id IS NOT NULL;
        
        -- Marcar el evento como procesado
        UPDATE public.team_events 
        SET rsvp_reminder_sent = true 
        WHERE id = v_event.id;
    END LOOP;

    -- Procesar partidos
    FOR v_match IN 
        SELECT id, equipo_id, rival_nombre, fecha_hora 
        FROM public.partidos 
        WHERE rsvp_reminder_time <= NOW() AND (rsvp_reminder_sent IS NULL OR rsvp_reminder_sent = false)
    LOOP
        -- Insertar notificaciones para los tutores de los jugadores convocados
        INSERT INTO public.notifications (profile_id, title, content, read, match_id, created_at)
        SELECT 
            p.tutor_id,
            'Convocatoria: Partido vs ' || COALESCE(v_match.rival_nombre, 'Rival'),
            'Recordatorio de partido contra ' || COALESCE(v_match.rival_nombre, 'Rival') || '. ¿Vas a asistir? Por favor, confirma asistencia.',
            false,
            v_match.id,
            NOW()
        FROM public.convocatorias c
        JOIN public.players p ON c.player_id = p.id
        WHERE c.partido_id = v_match.id 
          AND c.status = 'convocado'
          AND p.tutor_id IS NOT NULL;
        
        -- Marcar el partido como procesado
        UPDATE public.partidos 
        SET rsvp_reminder_sent = true 
        WHERE id = v_match.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Programar el trabajo en pg_cron (ejecutar cada 5 minutos)
-- Nota: Si pg_cron ya tiene un trabajo con este nombre, lo eliminamos primero para actualizarlo
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Eliminar si existe para evitar duplicados
        PERFORM cron.unschedule('send-auto-rsvps');
        -- Programar de nuevo
        PERFORM cron.schedule('send-auto-rsvps', '*/5 * * * *', 'SELECT public.send_scheduled_rsvps()');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignorar errores si el usuario actual no tiene permisos sobre cron
        RAISE NOTICE 'No se pudo programar el trabajo en pg_cron automáticamente. Asegúrese de ejecutarlo como superusuario.';
END $$;
