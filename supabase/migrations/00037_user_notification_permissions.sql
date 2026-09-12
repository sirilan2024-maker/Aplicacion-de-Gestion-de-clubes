-- ==============================================================================
-- Migration: 00037_user_notification_permissions.sql
-- Description: Capa de control administrativo de notificaciones por usuario:
--              Permisos de visualización (can_view), edición (can_modify),
--              indicador de override individual (is_custom_override) y auditoría (updated_by).
--              SEGURIDAD ESTRICTA: can_modify tiene por defecto FALSE (mínimo privilegio).
--              Incluye Trigger de Base de Datos SECURITY DEFINER endurecido con
--              search_path explícito para prevenir escalada de privilegios y bypass RLS.
-- ==============================================================================

-- 1. Añadir columnas de control administrativo y permisos a user_notification_preferences
ALTER TABLE public.user_notification_preferences 
ADD COLUMN IF NOT EXISTS can_view BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.user_notification_preferences 
ADD COLUMN IF NOT EXISTS can_modify BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_notification_preferences 
ADD COLUMN IF NOT EXISTS is_custom_override BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.user_notification_preferences 
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Índices para optimizar consultas administrativas
CREATE INDEX IF NOT EXISTS idx_user_notif_prefs_admin_lookup 
ON public.user_notification_preferences (club_id, user_id, notification_type);

CREATE INDEX IF NOT EXISTS idx_user_notif_prefs_override 
ON public.user_notification_preferences (user_id, is_custom_override);

-- 3. Habilitar y reforzar Row Level Security (RLS)
ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "user_notif_prefs_all_owner" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "user_notif_prefs_select_policy" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "user_notif_prefs_user_update_policy" ON public.user_notification_preferences;
DROP POLICY IF EXISTS "user_notif_prefs_admin_manage_policy" ON public.user_notification_preferences;

-- 3a. Política de LECTURA para el usuario propietario y administradores del club
CREATE POLICY "user_notif_prefs_select_policy" 
ON public.user_notification_preferences 
FOR SELECT 
TO authenticated 
USING (
    user_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'superadmin')
        AND (club_id = public.user_notification_preferences.club_id OR role = 'superadmin')
    )
);

-- 3b. Política de ACTUALIZACIÓN para el usuario propietario (solo si can_modify = true)
CREATE POLICY "user_notif_prefs_user_update_policy" 
ON public.user_notification_preferences 
FOR UPDATE 
TO authenticated 
USING (
    user_id = auth.uid() AND can_modify = true
)
WITH CHECK (
    user_id = auth.uid() AND can_modify = true
);

-- 3c. Política de GESTIÓN TOTAL para Admin / Superadmin del club
CREATE POLICY "user_notif_prefs_admin_manage_policy" 
ON public.user_notification_preferences 
FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'superadmin')
        AND (club_id = public.user_notification_preferences.club_id OR role = 'superadmin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'superadmin')
        AND (club_id = public.user_notification_preferences.club_id OR role = 'superadmin')
    )
);

-- 4. Trigger de base de datos SECURITY DEFINER con search_path explícito
CREATE OR REPLACE FUNCTION public.fn_protect_user_notif_prefs_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_role TEXT;
BEGIN
    -- Obtener rol del usuario que ejecuta la mutación desde public.profiles
    SELECT role INTO v_caller_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Si no es admin ni superadmin (usuario regular o anónimo):
    IF v_caller_role NOT IN ('admin', 'superadmin') OR v_caller_role IS NULL THEN
        -- A. Bloquear mutación de permisos y metadatos administrativos
        IF (NEW.can_view IS DISTINCT FROM OLD.can_view) OR
           (NEW.can_modify IS DISTINCT FROM OLD.can_modify) OR
           (NEW.is_custom_override IS DISTINCT FROM OLD.is_custom_override) OR
           (NEW.updated_by IS DISTINCT FROM OLD.updated_by) THEN
            RAISE EXCEPTION 'Acceso denegado: No tiene autorización para modificar permisos o atributos administrativos de notificación';
        END IF;

        -- B. Bloquear alteración de claves foráneas o reasignación de usuario / club / tipo
        IF (NEW.user_id IS DISTINCT FROM OLD.user_id) OR
           (NEW.club_id IS DISTINCT FROM OLD.club_id) OR
           (NEW.notification_type IS DISTINCT FROM OLD.notification_type) THEN
            RAISE EXCEPTION 'Acceso denegado: No se permite transferir o reasignar registros de preferencias de notificación';
        END IF;

        -- C. Bloquear mutación si can_modify no era TRUE
        IF OLD.can_modify IS NOT TRUE THEN
            RAISE EXCEPTION 'Acceso denegado: Esta preferencia de notificación no permite modificaciones';
        END IF;
    END IF;

    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Permisos sobre la función trigger
REVOKE ALL ON FUNCTION public.fn_protect_user_notif_prefs_immutability() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_protect_user_notif_prefs_immutability() TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_protect_user_notif_prefs_immutability() TO service_role;

DROP TRIGGER IF EXISTS trg_protect_user_notif_prefs_immutability ON public.user_notification_preferences;
CREATE TRIGGER trg_protect_user_notif_prefs_immutability
BEFORE UPDATE ON public.user_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION public.fn_protect_user_notif_prefs_immutability();

-- 5. Notificar a PostgREST para recarga inmediata de caché
NOTIFY pgrst, 'reload schema';
