-- Migration: Create registrations table for the Unified Registration Workflow

CREATE TYPE registration_status AS ENUM ('PENDING_VALIDATION', 'NEEDS_CORRECTION', 'APPROVED', 'REJECTED');

CREATE TABLE IF NOT EXISTS public.registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL, -- Si se asignó desde un enlace específico
    
    status registration_status DEFAULT 'PENDING_VALIDATION',
    
    -- Datos del Formulario en JSON para mayor flexibilidad dado el volumen de campos
    form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Archivos (Rutas en Storage)
    dni_front_url TEXT,
    dni_back_url TEXT,
    photo_url TEXT,
    sip_url TEXT,
    
    -- Datos de Pago
    payment_method TEXT NOT NULL, -- 'Stripe', 'Transferencia', 'Contado'
    payment_plan TEXT NOT NULL,   -- 'Total', 'Fraccionado'
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
CREATE POLICY "Admins can view registrations for their club"
    ON public.registrations FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'secretary')
        AND club_id = registrations.club_id
    ));

CREATE POLICY "Admins can manage registrations for their club"
    ON public.registrations FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = auth.uid() AND role IN ('admin', 'secretary')
        AND club_id = registrations.club_id
    ));

-- Allow inserts from authenticated users or public (depending on setup, for now public can insert via anon key but only their own via RLS, or we use a secure Edge Function)
-- Since registrations are public via a form without login, we need to allow anonymous inserts.
CREATE POLICY "Allow public inserts"
    ON public.registrations FOR INSERT
    WITH CHECK (true);
