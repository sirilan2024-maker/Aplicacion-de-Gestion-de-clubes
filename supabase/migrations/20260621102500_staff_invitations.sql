-- Migration: 20260621102500_staff_invitations.sql
-- Description: Crea la tabla para gestionar las invitaciones de un solo uso para el staff.

CREATE TABLE IF NOT EXISTS public.staff_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'coordinador', 'entrenador')),
    token UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
    used BOOLEAN NOT NULL DEFAULT false,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE
);

-- Habilitar RLS
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad (RLS)

-- 1. Los administradores pueden leer todas las invitaciones de su club
CREATE POLICY "Admins can view their club invitations" ON public.staff_invitations
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.club_id = staff_invitations.club_id
            AND profiles.role = 'admin'
        )
    );

-- 2. Los administradores pueden crear invitaciones para su club
CREATE POLICY "Admins can create invitations" ON public.staff_invitations
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() 
            AND profiles.club_id = staff_invitations.club_id
            AND profiles.role = 'admin'
        )
    );

-- 3. Cualquiera puede validar un token (lectura pública temporal para el registro)
-- Como el registro ocurre antes de tener sesión, necesitamos permitir leer si se conoce el token.
-- Sin embargo, para mayor seguridad, dejaremos que el servidor (Service Role) consulte la tabla
-- directamente durante el registro para evitar exponer la tabla al acceso anónimo.
-- Así que no hace falta política pública para anónimos.

-- Indice para búsquedas rápidas por token
CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON public.staff_invitations(token);
