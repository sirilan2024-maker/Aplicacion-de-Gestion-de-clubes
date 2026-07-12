-- ============================================================
-- MÓDULO: SISTEMA DE INSCRIPCIONES INTELIGENTE V2
-- ============================================================

-- 1. Ficha Familiar (Agrupa a los jugadores de una misma unidad)
CREATE TABLE IF NOT EXISTS public.families (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    tutor_1_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    tutor_1_dni_url TEXT,
    tutor_2_name TEXT,
    tutor_2_dni_url TEXT,
    iban_account TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

-- Políticas de Families
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage families') THEN
        CREATE POLICY "Admins can manage families" ON public.families FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinador'))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tutors can view own family') THEN
        CREATE POLICY "Tutors can view own family" ON public.families FOR SELECT TO authenticated USING (tutor_1_profile_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tutors can update own family') THEN
        CREATE POLICY "Tutors can update own family" ON public.families FOR UPDATE TO authenticated USING (tutor_1_profile_id = auth.uid());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tutors can insert own family') THEN
        CREATE POLICY "Tutors can insert own family" ON public.families FOR INSERT TO authenticated WITH CHECK (tutor_1_profile_id = auth.uid());
    END IF;
END $$;

-- 2. Modificaciones en la tabla players
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.families(id) ON DELETE SET NULL;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS category_auto TEXT;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS is_foreign BOOLEAN DEFAULT false;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS never_federated BOOLEAN DEFAULT false;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT false;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS volunteer_interest TEXT;

-- Estados de inscripción y pago
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'draft' CHECK (registration_status IN ('draft', 'pending_revision', 'request_correction', 'pending_payment', 'formalized'));
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('Stripe', 'Transferencia', 'Contado', null));
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS payment_plan TEXT CHECK (payment_plan IN ('Total', 'Fraccionado', null));

-- Timestamps de RGPD y firmas
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS consent_inscription_at TIMESTAMPTZ;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS consent_rgpd_at TIMESTAMPTZ;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS consent_image_at TIMESTAMPTZ;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS consent_video_at TIMESTAMPTZ;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS consent_whatsapp_at TIMESTAMPTZ;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS consent_medical_at TIMESTAMPTZ;

-- 3. Tabla Documentos FFCV e Identidad (player_documents)
CREATE TABLE IF NOT EXISTS public.player_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('foto_carnet', 'foto_medio_cuerpo', 'foto_cuerpo_entero', 'foto_horizontal', 'pasaporte', 'empadronamiento', 'contrato_laboral', 'certificado_escolar', 'carta_explicativa')),
    status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'recibido', 'validado', 'rechazado', 'caducado')),
    file_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(player_id, document_type)
);

ALTER TABLE public.player_documents ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage player documents') THEN
        CREATE POLICY "Admins can manage player documents" ON public.player_documents FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinador'))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tutors can view own player documents') THEN
        CREATE POLICY "Tutors can view own player documents" ON public.player_documents FOR SELECT TO authenticated USING (
            EXISTS (SELECT 1 FROM public.players WHERE id = player_documents.player_id AND tutor_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.players WHERE id = player_documents.player_id AND user_auth_id = auth.uid())
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tutors can update own player documents') THEN
        CREATE POLICY "Tutors can update own player documents" ON public.player_documents FOR UPDATE TO authenticated USING (
            EXISTS (SELECT 1 FROM public.players WHERE id = player_documents.player_id AND tutor_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.players WHERE id = player_documents.player_id AND user_auth_id = auth.uid())
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Tutors can insert own player documents') THEN
        CREATE POLICY "Tutors can insert own player documents" ON public.player_documents FOR INSERT TO authenticated WITH CHECK (
            EXISTS (SELECT 1 FROM public.players WHERE id = player_id AND tutor_id = auth.uid()) OR
            EXISTS (SELECT 1 FROM public.players WHERE id = player_id AND user_auth_id = auth.uid())
        );
    END IF;
END $$;

-- 4. Patrocinadores (Hospitality)
CREATE TABLE IF NOT EXISTS public.family_sponsors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_name TEXT,
    contact_phone TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.family_sponsors ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage sponsors') THEN
        CREATE POLICY "Admins can manage sponsors" ON public.family_sponsors FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinador'))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Families can view own sponsors') THEN
        CREATE POLICY "Families can view own sponsors" ON public.family_sponsors FOR SELECT TO authenticated USING (
            EXISTS (SELECT 1 FROM public.families WHERE id = family_sponsors.family_id AND tutor_1_profile_id = auth.uid())
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Families can manage own sponsors') THEN
        CREATE POLICY "Families can manage own sponsors" ON public.family_sponsors FOR ALL TO authenticated USING (
            EXISTS (SELECT 1 FROM public.families WHERE id = family_sponsors.family_id AND tutor_1_profile_id = auth.uid())
        );
    END IF;
END $$;

-- 5. Webhook / Trigger para enviar email (Llamada a Edge Function)
-- Configuración del Trigger para llamar a document-rejection-email vía HTTP POST
CREATE OR REPLACE FUNCTION public.handle_document_rejection()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'rechazado' AND OLD.status != 'rechazado' THEN
        -- Asumiendo que pg_net está activo y que tenemos las vars de entorno en config
        PERFORM net.http_post(
            url := current_setting('app.settings.edge_function_url', true) || '/document-rejection-email',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
            ),
            body := jsonb_build_object(
                'type', 'UPDATE',
                'record', row_to_json(NEW),
                'old_record', row_to_json(OLD)
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_document_rejected ON public.player_documents;
CREATE TRIGGER on_document_rejected
    AFTER UPDATE ON public.player_documents
    FOR EACH ROW EXECUTE PROCEDURE public.handle_document_rejection();
