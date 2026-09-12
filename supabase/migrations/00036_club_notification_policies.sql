-- ==============================================================================
-- Migration: 00036_club_notification_policies.sql
-- Description: Políticas administrativas de canales de notificación por club y tipo.
--              Controla qué canales (IN_APP, EMAIL, PUSH) están autorizados a nivel club.
--              SEGURIDAD ESTRICTA: Solo accesible para roles admin y superadmin.
-- ==============================================================================

-- 1. Tabla de Políticas Administrativas del Club
CREATE TABLE IF NOT EXISTS public.club_notification_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_club_notification_policies_club_type UNIQUE (club_id, notification_type)
);

-- 2. Índices optimizados para consulta por club_id y notification_type
CREATE INDEX IF NOT EXISTS idx_club_notif_policies_lookup 
ON public.club_notification_policies (club_id, notification_type);

CREATE INDEX IF NOT EXISTS idx_club_notif_policies_club_id 
ON public.club_notification_policies (club_id);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.club_notification_policies ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad RLS estrictas (Solo admin y superadmin)
DROP POLICY IF EXISTS "club_notif_policies_select_policy" ON public.club_notification_policies;
CREATE POLICY "club_notif_policies_select_policy" 
ON public.club_notification_policies 
FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'superadmin')
        AND (club_id = public.club_notification_policies.club_id OR role = 'superadmin')
    )
);

DROP POLICY IF EXISTS "club_notif_policies_admin_write_policy" ON public.club_notification_policies;
CREATE POLICY "club_notif_policies_admin_write_policy" 
ON public.club_notification_policies 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'superadmin')
        AND (club_id = public.club_notification_policies.club_id OR role = 'superadmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'superadmin')
        AND (club_id = public.club_notification_policies.club_id OR role = 'superadmin')
    )
);

-- 5. Recargar esquema PostgREST
NOTIFY pgrst, 'reload schema';

