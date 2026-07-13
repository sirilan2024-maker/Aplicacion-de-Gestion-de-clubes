-- ============================================================
-- FASE 2: AUDITORÍA GENERAL LEGAL (IP y Timestamps)
-- ============================================================
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS consent_ip TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS consent_user_agent TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS consent_tutela_at TIMESTAMPTZ;

-- ============================================================
-- FASE 3: AUDITORÍA INTERNA DE CONTROL DE ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auditoria_roles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    usuario_afectado_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    rol_anterior TEXT,
    rol_nuevo TEXT,
    fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.auditoria_roles ENABLE ROW LEVEL SECURITY;

-- Solo admins o service_role pueden ver
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view auditoria_roles') THEN
        CREATE POLICY "Admins can view auditoria_roles" ON public.auditoria_roles 
        FOR SELECT TO authenticated 
        USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));
    END IF;
END $$;
-- Las inserciones se harán con service_role (ignorando RLS), así que no necesitamos política INSERT para usuarios normales.

-- ============================================================
-- FASE 4: SEGURIDAD RLS Y VISTAS SEGURAS (Entrenadores)
-- ============================================================
-- Ya está habilitado RLS en players, pero nos aseguramos:
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    -- Política Padres (lectura y modificación solo si son tutores)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Padres solo leen sus propios hijos') THEN
        CREATE POLICY "Padres solo leen sus propios hijos" ON public.players 
        FOR SELECT TO authenticated 
        USING (tutor_id = auth.uid() OR user_auth_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Padres solo actualizan sus propios hijos') THEN
        CREATE POLICY "Padres solo actualizan sus propios hijos" ON public.players 
        FOR UPDATE TO authenticated 
        USING (tutor_id = auth.uid() OR user_auth_id = auth.uid());
    END IF;

    -- Política Directivos (acceso total)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Directivos acceso total a players') THEN
        CREATE POLICY "Directivos acceso total a players" ON public.players 
        FOR ALL TO authenticated 
        USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin', 'coordinador', 'directivo')));
    END IF;
END $$;

-- Vista segura para entrenadores (oculta DNI, cuotas, direcciones)
CREATE OR REPLACE VIEW public.vista_entrenadores AS
SELECT 
    id,
    club_id,
    team_id,
    first_name,
    last_name,
    birth_date,
    medical_info,
    allergies,
    consent_image,
    consent_medical_at
FROM public.players;

-- Otorgar permiso de lectura a usuarios autenticados sobre la vista
GRANT SELECT ON public.vista_entrenadores TO authenticated;

-- ============================================================
-- FASE 5: STORAGE - PRIVACIDAD DE DNI Y DOCUMENTOS
-- ============================================================
-- Se requiere que el bucket 'documentos-dni' exista. Lo creamos si no existe, public=false.
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documentos-dni', 'documentos-dni', false) 
ON CONFLICT (id) DO UPDATE SET public = false;

-- Políticas de Storage para 'documentos-dni'
DO $$ 
BEGIN
    -- Los padres pueden subir archivos solo a su propia carpeta (UID)
    IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'Padres suben DNI a su carpeta') THEN
        INSERT INTO storage.policies (name, bucket_id, definition, role, action, check_expr)
        VALUES ('Padres suben DNI a su carpeta', 'documentos-dni', 'auth.uid()::text = (storage.foldername(name))[1]', 'authenticated', 'INSERT', 'auth.uid()::text = (storage.foldername(name))[1]');
    END IF;

    -- Los directivos ven todo, los padres ven lo suyo
    IF NOT EXISTS (SELECT 1 FROM storage.policies WHERE name = 'Directivos y Padres leen DNI') THEN
        INSERT INTO storage.policies (name, bucket_id, definition, role, action, check_expr)
        VALUES ('Directivos y Padres leen DNI', 'documentos-dni', 
        'auth.uid()::text = (storage.foldername(name))[1] OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN (''admin'',''coordinador'',''directivo''))', 
        'authenticated', 'SELECT', null);
    END IF;
END $$;
