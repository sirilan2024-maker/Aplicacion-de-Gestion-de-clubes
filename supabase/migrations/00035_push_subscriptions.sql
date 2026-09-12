-- ==============================================================================
-- Migration: 00035_push_subscriptions.sql
-- Description: Creación de la tabla push_subscriptions para soporte multi-dispositivo
--              de Web Push (1 usuario -> N dispositivos) con RLS estricto.
-- ==============================================================================

-- 1. Tabla de Suscripciones Push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Restricción de unicidad sobre endpoint (1 endpoint = 1 suscripción activa)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_push_subscriptions_endpoint'
    ) THEN
        ALTER TABLE public.push_subscriptions 
        ADD CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint);
    END IF;
END $$;

-- 3. Índices optimizados para consulta por user_id y endpoint
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id 
ON public.push_subscriptions (user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint 
ON public.push_subscriptions (endpoint);

-- 4. Habilitar Row Level Security (RLS)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de seguridad: Usuario autenticado gestiona exclusivamente sus dispositivos
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'push_subscriptions' 
        AND policyname = 'push_subscriptions_owner_all'
    ) THEN
        CREATE POLICY "push_subscriptions_owner_all" 
        ON public.push_subscriptions 
        FOR ALL 
        TO authenticated 
        USING (user_id = auth.uid()) 
        WITH CHECK (user_id = auth.uid());
    END IF;
END $$;
