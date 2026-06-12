-- ==========================================
-- Migración: Tabla para el Foro del Partido
-- ==========================================

CREATE TABLE IF NOT EXISTS public.match_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES public.partidos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.match_comments ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura/escritura (permitir todo a usuarios autenticados temporalmente)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Lectura de comentarios' AND tablename = 'match_comments') THEN
        CREATE POLICY "Lectura de comentarios" ON public.match_comments
            FOR SELECT USING (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Inserción de comentarios' AND tablename = 'match_comments') THEN
        CREATE POLICY "Inserción de comentarios" ON public.match_comments
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
