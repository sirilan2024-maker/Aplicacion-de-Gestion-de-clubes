-- ==============================================================================
-- Migration: 00033_normalize_notifications_and_preferences.sql
-- Description: Estandarización y normalización de notificaciones, preferencias
--              de usuario y registro de entregas auditadas (idempotencia multi-canal).
-- ==============================================================================

-- 1. Normalización de public.notifications
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Asegurar columnas estándar sin alterar existentes
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'general';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'Notificación';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS link TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES public.partidos(id) ON DELETE CASCADE;

-- Sincronizar datos legacy si existen columnas previas
DO $$
BEGIN
    -- Sincronizar read -> is_read
    UPDATE public.notifications 
    SET is_read = COALESCE(is_read, read, false) 
    WHERE is_read IS NULL OR (read IS NOT NULL AND read != is_read);

    -- Sincronizar profile_id -> user_id
    UPDATE public.notifications 
    SET user_id = profile_id 
    WHERE user_id IS NULL AND profile_id IS NOT NULL;

    -- Sincronizar user_id -> profile_id
    UPDATE public.notifications 
    SET profile_id = user_id 
    WHERE profile_id IS NULL AND user_id IS NOT NULL;

    -- Sincronizar message -> content
    UPDATE public.notifications 
    SET content = message 
    WHERE (content IS NULL OR content = '') AND message IS NOT NULL AND message != '';
END $$;

-- Índices optimizados para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_is_read ON public.notifications (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_club_created_at ON public.notifications (club_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_profile_is_read ON public.notifications (profile_id, is_read);

-- Habilitar RLS en notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_select_policy') THEN
        CREATE POLICY "notifications_select_policy" 
        ON public.notifications FOR SELECT TO authenticated 
        USING (
            user_id = auth.uid() OR 
            profile_id = auth.uid() OR 
            (user_id IS NULL AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'coordinador', 'metodologo')))
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_update_policy') THEN
        CREATE POLICY "notifications_update_policy" 
        ON public.notifications FOR UPDATE TO authenticated 
        USING (user_id = auth.uid() OR profile_id = auth.uid())
        WITH CHECK (user_id = auth.uid() OR profile_id = auth.uid());
    END IF;
END $$;


-- 2. Tabla de Preferencias de Usuario (user_notification_preferences)
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Constraint único por usuario, club y tipo de notificación
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_club_notification_type'
    ) THEN
        ALTER TABLE public.user_notification_preferences 
        ADD CONSTRAINT uq_user_club_notification_type UNIQUE (user_id, club_id, notification_type);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_notif_prefs_lookup 
ON public.user_notification_preferences (user_id, club_id, notification_type);

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_notification_preferences' AND policyname = 'user_notif_prefs_all_owner') THEN
        CREATE POLICY "user_notif_prefs_all_owner" 
        ON public.user_notification_preferences FOR ALL TO authenticated 
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;


-- 3. Tabla de Registro de Entregas e Idempotencia (notification_deliveries)
CREATE TABLE IF NOT EXISTS public.notification_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notifications(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    idempotency_key TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'PUSH')),
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'SKIPPED')),
    provider TEXT,
    provider_message_id TEXT,
    attempts INTEGER NOT NULL DEFAULT 1,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_notification_deliveries_idempotency_key'
    ) THEN
        ALTER TABLE public.notification_deliveries 
        ADD CONSTRAINT uq_notification_deliveries_idempotency_key UNIQUE (idempotency_key);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_status 
ON public.notification_deliveries (user_id, channel, status);

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_key 
ON public.notification_deliveries (idempotency_key);

ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_deliveries' AND policyname = 'notification_deliveries_select_owner') THEN
        CREATE POLICY "notification_deliveries_select_owner" 
        ON public.notification_deliveries FOR SELECT TO authenticated 
        USING (user_id = auth.uid());
    END IF;
END $$;
