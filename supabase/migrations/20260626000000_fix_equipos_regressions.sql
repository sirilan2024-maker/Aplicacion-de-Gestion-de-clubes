-- Parche: Resolución de Regresiones - Reemplazo de 'equipos' por 'teams'
-- IMPORTANTE: Ejecuta este parche en el SQL Editor de tu Dashboard de Supabase.

-- ==========================================
-- 1. Arreglar tabla 'team_events'
-- ==========================================
-- Eliminar políticas antiguas (que apuntaban a equipos)
DROP POLICY IF EXISTS "Users can view team_events for their club" ON public.team_events;
DROP POLICY IF EXISTS "Users can manage team_events for their club" ON public.team_events;

-- Recrear políticas usando 'teams' en lugar de 'equipos'
CREATE POLICY "Users can view team_events for their club"
    ON public.team_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.teams e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = team_events.team_id
            AND p.id = auth.uid()
        )
    );

CREATE POLICY "Users can manage team_events for their club"
    ON public.team_events FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.teams e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = team_events.team_id
            AND p.id = auth.uid()
            AND p.role IN ('admin', 'metodologo', 'coach', 'entrenador', 'delegado')
        )
    );

-- Limpiar registros huérfanos antes de la clave foránea
DELETE FROM public.team_events WHERE team_id NOT IN (SELECT id FROM public.teams);

-- Cambiar Foreign Key
ALTER TABLE public.team_events DROP CONSTRAINT IF EXISTS team_events_team_id_fkey;
ALTER TABLE public.team_events ADD CONSTRAINT team_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


-- ==========================================
-- 2. Arreglar tabla 'player_training_metrics'
-- ==========================================
DROP POLICY IF EXISTS "Users can view their club's player training metrics" ON public.player_training_metrics;
DROP POLICY IF EXISTS "Coaches and Admins can manage training metrics" ON public.player_training_metrics;

CREATE POLICY "Users can view their club's player training metrics"
    ON public.player_training_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.players p
            JOIN public.teams e ON p.team_id = e.id
            JOIN public.profiles pr ON pr.club_id = e.club_id
            WHERE p.id = player_training_metrics.player_id
            AND pr.id = auth.uid()
        )
    );

CREATE POLICY "Coaches and Admins can manage training metrics"
    ON public.player_training_metrics FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.players p
            JOIN public.teams e ON p.team_id = e.id
            JOIN public.profiles pr ON pr.club_id = e.club_id
            WHERE p.id = player_training_metrics.player_id
            AND pr.id = auth.uid()
            AND pr.role IN ('admin', 'superadmin', 'coach', 'entrenador', 'metodologo')
        )
    );


-- ==========================================
-- 3. Arreglar tabla 'player_season_teams' y 'player_season_history'
-- ==========================================
-- Limpiar registros huérfanos antes de crear la FK
DELETE FROM public.player_season_teams WHERE team_id NOT IN (SELECT id FROM public.teams);

-- Cambiar Foreign Keys
ALTER TABLE public.player_season_teams DROP CONSTRAINT IF EXISTS player_season_teams_team_id_fkey;
ALTER TABLE public.player_season_teams ADD CONSTRAINT player_season_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- En caso de que la historia también arrastre la referencia:
DELETE FROM public.player_season_history WHERE team_id NOT IN (SELECT id FROM public.teams) AND team_id IS NOT NULL;

ALTER TABLE public.player_season_history DROP CONSTRAINT IF EXISTS player_season_history_team_id_fkey;
ALTER TABLE public.player_season_history ADD CONSTRAINT player_season_history_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- ¡Completado!
