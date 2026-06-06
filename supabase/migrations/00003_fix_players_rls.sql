-- ==========================================
-- Fix Row Level Security para inserción de Jugadores
-- ==========================================

DO $$ 
BEGIN
    -- Crear una política específica para la inserción (INSERT) de jugadores
    -- Esto permite que cualquier admin, coach o metodologo pueda crear un jugador,
    -- incluso si el jugador aún no tiene un equipo asignado (team_id es null).
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Permitir insercion a personal del club') THEN
        CREATE POLICY "Permitir insercion a personal del club" 
        ON public.players 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coach', 'metodologo'))
        );
    END IF;
END $$;
