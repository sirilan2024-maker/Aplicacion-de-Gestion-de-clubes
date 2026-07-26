-- Migration: Create registrations table for the Unified Registration Workflow

DO $$ BEGIN
    CREATE TYPE registration_status AS ENUM ('PENDING_VALIDATION', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    status registration_status DEFAULT 'PENDING_VALIDATION',
    
    -- Datos del Formulario en JSON para mayor flexibilidad dado el volumen de campos
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Archivos (Rutas en Storage)
    dni_front_url TEXT,
    dni_back_url TEXT,
    photo_url TEXT,
    sip_url TEXT,
    
    -- Datos de Pago
    payment_method TEXT NOT NULL,
    payment_plan TEXT NOT NULL,
    stripe_payment_intent_id TEXT,
    stripe_setup_intent_id TEXT,
    payment_status TEXT DEFAULT 'PENDING',
    
    -- Metadatos de Validación
    admin_notes TEXT,
    correction_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Policies
ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

-- Admins can read/write all registrations in their club
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view registrations for their club') THEN
        CREATE POLICY "Admins can view registrations for their club"
            ON public.registrations FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role IN ('admin', 'secretaria', 'entrenador')
                AND club_id = registrations.club_id
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage registrations for their club') THEN
        CREATE POLICY "Admins can manage registrations for their club"
            ON public.registrations FOR ALL
            USING (EXISTS (
                SELECT 1 FROM profiles
                WHERE id = auth.uid() AND role IN ('admin', 'secretaria', 'entrenador')
                AND club_id = registrations.club_id
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public inserts') THEN
        CREATE POLICY "Allow public inserts"
            ON public.registrations FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

-- Grants for PostgREST
GRANT ALL ON TABLE public.registrations TO anon, authenticated, service_role;
