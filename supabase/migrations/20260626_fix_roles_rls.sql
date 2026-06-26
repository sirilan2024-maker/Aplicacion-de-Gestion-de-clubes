-- Parche: Resolución de permisos en Asistencia para Admins y Entrenadores
-- IMPORTANTE: Ejecuta este parche en el SQL Editor de tu Dashboard de Supabase.

-- Eliminar política defectuosa que apuntaba a la tabla obsoleta 'equipos'
DROP POLICY IF EXISTS "Users can manage attendance in their club" ON public.attendance;
DROP POLICY IF EXISTS "Attendance can be managed by admins or assigned coach." ON public.attendance;

-- Recrear la política usando la nueva tabla 'teams' y 'team_events'
CREATE POLICY "Users can manage attendance in their club"
ON public.attendance FOR ALL TO authenticated USING (
    team_id IN (SELECT id FROM public.teams WHERE club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()))
    OR
    event_id IN (SELECT id FROM public.team_events WHERE team_id IN (SELECT id FROM public.teams WHERE club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid())))
    OR
    session_id IN (SELECT id FROM public.training_sessions WHERE club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()))
);

-- Además, aseguramos que los entrenadores y administradores tengan acceso a player_training_metrics
DROP POLICY IF EXISTS "Users can view their club's player training metrics" ON public.player_training_metrics;
DROP POLICY IF EXISTS "Coaches and Admins can manage training metrics" ON public.player_training_metrics;

CREATE POLICY "Users can view their club's player training metrics"
    ON public.player_training_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.players p
            JOIN public.player_season_history psh ON psh.player_id = p.id
            JOIN public.teams e ON psh.team_id = e.id
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
            JOIN public.player_season_history psh ON psh.player_id = p.id
            JOIN public.teams e ON psh.team_id = e.id
            JOIN public.profiles pr ON pr.club_id = e.club_id
            WHERE p.id = player_training_metrics.player_id
            AND pr.id = auth.uid()
            AND pr.role IN ('admin', 'superadmin', 'coach', 'entrenador', 'metodologo')
        )
    );
