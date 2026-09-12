-- ==============================================================================
-- Migration: 00034_unschedule_legacy_auto_rsvp.sql
-- Description: Desprogramar de forma segura el job legacy send-auto-rsvps en pg_cron
--              preservando intacta la función public.send_scheduled_rsvps().
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Desprogramar únicamente el job send-auto-rsvps si existe
        IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'send-auto-rsvps') THEN
            PERFORM cron.unschedule('send-auto-rsvps');
            RAISE NOTICE 'Job send-auto-rsvps desprogramado exitosamente de pg_cron.';
        ELSE
            RAISE NOTICE 'Job send-auto-rsvps no estaba registrado en cron.job.';
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Aviso en desprogramación de pg_cron: %', SQLERRM;
END $$;
