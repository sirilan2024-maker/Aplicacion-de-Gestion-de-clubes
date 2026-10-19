-- ==============================================================================
-- MIGRACIÓN LOCAL (SOLO REVISIÓN - NO APLICAR A SUPABASE)
-- Sporting Saladar — Módulo de Rendimiento: Bienestar Diario, Incidencias y Feedback de Sesión
-- Archivo: supabase/migrations/20261012_performance_wellness_and_feedback.sql
-- ==============================================================================

-- 1. TABLA: player_daily_wellness
-- Finalidad: Registrar la evaluación de bienestar previa basal diaria (Hooper-Mackinnon)
-- Invariable: Un único registro biológico basal por jugador por día que nunca se sobrescribe.
CREATE TABLE IF NOT EXISTS public.player_daily_wellness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Métricas de bienestar (Escala Hooper 1 a 5, donde 1 = óptimo / menor molestia)
    sleep_quality INTEGER NOT NULL CHECK (sleep_quality BETWEEN 1 AND 5),
    fatigue INTEGER NOT NULL CHECK (fatigue BETWEEN 1 AND 5),
    soreness INTEGER NOT NULL CHECK (soreness BETWEEN 1 AND 5),
    stress INTEGER NOT NULL CHECK (stress BETWEEN 1 AND 5),
    mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 5),
    
    -- Puntuación total opcional (dejada como nullable para no forzar fórmulas no aprobadas)
    wellness_score NUMERIC CHECK (wellness_score >= 0),
    
    -- Detección de molestias basales de inicio del día
    has_discomfort BOOLEAN NOT NULL DEFAULT false,
    discomfort_zone TEXT,
    discomfort_intensity INTEGER CHECK (discomfort_intensity BETWEEN 1 AND 10),
    notes TEXT,
    
    -- Trazabilidad de origen y estado
    source_event_id UUID REFERENCES public.team_events(id) ON DELETE SET NULL,
    response_status TEXT NOT NULL DEFAULT 'completed' CHECK (response_status IN ('completed', 'reused', 'draft')),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Restricción fundamental: un único registro biológico basal por jugador por día
    CONSTRAINT uq_player_daily_wellness_player_date UNIQUE (player_id, date)
);

-- Índices de búsqueda y rendimiento
CREATE INDEX IF NOT EXISTS idx_player_daily_wellness_player_date ON public.player_daily_wellness (player_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_player_daily_wellness_club_id ON public.player_daily_wellness (club_id);

-- RLS: player_daily_wellness
ALTER TABLE public.player_daily_wellness ENABLE ROW LEVEL SECURITY;

-- Lectura:
-- 1. Admins, coordinadores, preparadores físicos y metodólogos del club (acceso global club).
-- 2. Entrenadores ('coach', 'entrenador'): ÚNICAMENTE si están asignados al equipo del jugador (team_coaches o teams.coach_id).
-- 3. Jugador autenticado o su tutor legal.
DROP POLICY IF EXISTS "player_daily_wellness_select" ON public.player_daily_wellness;
CREATE POLICY "player_daily_wellness_select"
    ON public.player_daily_wellness FOR SELECT TO authenticated
    USING (
        club_id IN (SELECT pr.club_id FROM public.profiles pr WHERE pr.id = auth.uid())
        AND (
            -- Roles globales de gestión o rendimiento del club
            EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid()
                AND pr.role IN ('admin', 'superadmin', 'coordinador', 'metodologo', 'preparador_fisico', 'fisio')
            )
            OR
            -- Entrenadores estrictamente asignados al equipo del jugador
            EXISTS (
                SELECT 1 FROM public.players p
                WHERE p.id = player_daily_wellness.player_id
                AND (
                    EXISTS (
                        SELECT 1 FROM public.team_coaches tc
                        WHERE tc.team_id = p.team_id AND tc.profile_id = auth.uid()
                    )
                    OR
                    EXISTS (
                        SELECT 1 FROM public.teams t
                        WHERE t.id = p.team_id AND t.coach_id = auth.uid()
                    )
                )
            )
            OR
            -- El propio jugador logueado
            auth.uid() = (SELECT p.user_auth_id FROM public.players p WHERE p.id = player_daily_wellness.player_id)
            OR
            -- El tutor legal del menor
            auth.uid() = (SELECT p.tutor_id FROM public.players p WHERE p.id = player_daily_wellness.player_id)
            OR
            -- Tutor vinculado en player_tutors
            EXISTS (
                SELECT 1 FROM public.player_tutors pt
                WHERE pt.player_id = player_daily_wellness.player_id AND pt.tutor_id = auth.uid()
            )
        )
    );

-- Inserción / Edición autenticada:
DROP POLICY IF EXISTS "player_daily_wellness_insert" ON public.player_daily_wellness;
CREATE POLICY "player_daily_wellness_insert"
    ON public.player_daily_wellness FOR INSERT TO authenticated
    WITH CHECK (
        club_id IN (SELECT pr.club_id FROM public.profiles pr WHERE pr.id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.players p
            WHERE p.id = player_daily_wellness.player_id
            AND p.club_id = player_daily_wellness.club_id
        )
        AND (
            -- Roles con potestad de gestión o preparación física pueden registrar justificadamente
            EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid()
                AND pr.role IN ('admin', 'superadmin', 'coordinador', 'preparador_fisico')
            )
            OR (
                -- Jugadores, tutores y entrenadores solo pueden registrar para la fecha biológica del día en curso (peninsular)
                date = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::DATE
                AND (
                    EXISTS (
                        SELECT 1 FROM public.players p
                        WHERE p.id = player_daily_wellness.player_id
                        AND (
                            EXISTS (
                                SELECT 1 FROM public.team_coaches tc
                                WHERE tc.team_id = p.team_id AND tc.profile_id = auth.uid()
                            )
                            OR
                            EXISTS (
                                SELECT 1 FROM public.teams t
                                WHERE t.id = p.team_id AND t.coach_id = auth.uid()
                            )
                        )
                    )
                    OR auth.uid() = (SELECT p.user_auth_id FROM public.players p WHERE p.id = player_daily_wellness.player_id)
                    OR auth.uid() = (SELECT p.tutor_id FROM public.players p WHERE p.id = player_daily_wellness.player_id)
                    OR EXISTS (
                        SELECT 1 FROM public.player_tutors pt
                        WHERE pt.player_id = player_daily_wellness.player_id AND pt.tutor_id = auth.uid()
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "player_daily_wellness_update" ON public.player_daily_wellness;
CREATE POLICY "player_daily_wellness_update"
    ON public.player_daily_wellness FOR UPDATE TO authenticated
    USING (
        club_id IN (SELECT pr.club_id FROM public.profiles pr WHERE pr.id = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid()
                AND pr.role IN ('admin', 'superadmin', 'coordinador', 'preparador_fisico')
            )
            OR (
                date = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::DATE
                AND (
                    EXISTS (
                        SELECT 1 FROM public.players p
                        WHERE p.id = player_daily_wellness.player_id
                        AND (
                            EXISTS (
                                SELECT 1 FROM public.team_coaches tc
                                WHERE tc.team_id = p.team_id AND tc.profile_id = auth.uid()
                            )
                            OR
                            EXISTS (
                                SELECT 1 FROM public.teams t
                                WHERE t.id = p.team_id AND t.coach_id = auth.uid()
                            )
                        )
                    )
                    OR auth.uid() = (SELECT p.user_auth_id FROM public.players p WHERE p.id = player_daily_wellness.player_id)
                    OR auth.uid() = (SELECT p.tutor_id FROM public.players p WHERE p.id = player_daily_wellness.player_id)
                    OR EXISTS (
                        SELECT 1 FROM public.player_tutors pt
                        WHERE pt.player_id = player_daily_wellness.player_id AND pt.tutor_id = auth.uid()
                    )
                )
            )
        )
    )
    WITH CHECK (
        club_id IN (SELECT pr.club_id FROM public.profiles pr WHERE pr.id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.players p
            WHERE p.id = player_daily_wellness.player_id
            AND p.club_id = player_daily_wellness.club_id
        )
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid()
                AND pr.role IN ('admin', 'superadmin', 'coordinador', 'preparador_fisico')
            )
            OR (
                -- Impide cambiar la fecha a una fecha pasada o futura mediante UPDATE
                date = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::DATE
                AND (
                    EXISTS (
                        SELECT 1 FROM public.players p
                        WHERE p.id = player_daily_wellness.player_id
                        AND (
                            EXISTS (
                                SELECT 1 FROM public.team_coaches tc
                                WHERE tc.team_id = p.team_id AND tc.profile_id = auth.uid()
                            )
                            OR
                            EXISTS (
                                SELECT 1 FROM public.teams t
                                WHERE t.id = p.team_id AND t.coach_id = auth.uid()
                            )
                        )
                    )
                    OR auth.uid() = (SELECT p.user_auth_id FROM public.players p WHERE p.id = player_daily_wellness.player_id)
                    OR auth.uid() = (SELECT p.tutor_id FROM public.players p WHERE p.id = player_daily_wellness.player_id)
                    OR EXISTS (
                        SELECT 1 FROM public.player_tutors pt
                        WHERE pt.player_id = player_daily_wellness.player_id AND pt.tutor_id = auth.uid()
                    )
                )
            )
        )
    );


-- 2. TABLA: player_session_discomfort_incidents
-- Finalidad: Persistencia normalizada de molestias sobrevenidas por sesión/evento.
-- Resuelve dobles sesiones sin sobrescribir el bienestar basal matinal.
CREATE TABLE IF NOT EXISTS public.player_session_discomfort_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
    
    -- Momento y clasificación del registro
    timing TEXT NOT NULL CHECK (timing IN ('pre_session', 'in_session', 'post_session')),
    zone TEXT NOT NULL,
    intensity INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 10),
    notes TEXT,
    
    -- Auditoría de quién/cómo se originó
    source TEXT NOT NULL DEFAULT 'wellness_flow' CHECK (source IN ('wellness_flow', 'session_feedback', 'coach_entry', 'kiosk')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Evita duplicación de idéntica incidencia para el mismo momento de una misma sesión
    CONSTRAINT uq_session_discomfort_player_event_timing UNIQUE (player_id, event_id, timing)
);

CREATE INDEX IF NOT EXISTS idx_discomfort_incidents_player ON public.player_session_discomfort_incidents (player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discomfort_incidents_event ON public.player_session_discomfort_incidents (event_id);

ALTER TABLE public.player_session_discomfort_incidents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "discomfort_incidents_select" ON public.player_session_discomfort_incidents;
CREATE POLICY "discomfort_incidents_select"
    ON public.player_session_discomfort_incidents FOR SELECT TO authenticated
    USING (
        club_id IN (SELECT pr.club_id FROM public.profiles pr WHERE pr.id = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid()
                AND pr.role IN ('admin', 'superadmin', 'coordinador', 'metodologo', 'preparador_fisico', 'fisio')
            )
            OR
            EXISTS (
                SELECT 1 FROM public.players p
                WHERE p.id = player_session_discomfort_incidents.player_id
                AND (
                    EXISTS (
                        SELECT 1 FROM public.team_coaches tc
                        WHERE tc.team_id = p.team_id AND tc.profile_id = auth.uid()
                    )
                    OR
                    EXISTS (
                        SELECT 1 FROM public.teams t
                        WHERE t.id = p.team_id AND t.coach_id = auth.uid()
                    )
                )
            )
            OR auth.uid() = (SELECT p.user_auth_id FROM public.players p WHERE p.id = player_session_discomfort_incidents.player_id)
            OR auth.uid() = (SELECT p.tutor_id FROM public.players p WHERE p.id = player_session_discomfort_incidents.player_id)
            OR EXISTS (
                SELECT 1 FROM public.player_tutors pt
                WHERE pt.player_id = player_session_discomfort_incidents.player_id AND pt.tutor_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "discomfort_incidents_insert" ON public.player_session_discomfort_incidents;
CREATE POLICY "discomfort_incidents_insert"
    ON public.player_session_discomfort_incidents FOR INSERT TO authenticated
    WITH CHECK (
        club_id IN (SELECT pr.club_id FROM public.profiles pr WHERE pr.id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.players p
            WHERE p.id = player_session_discomfort_incidents.player_id
            AND p.club_id = player_session_discomfort_incidents.club_id
        )
        AND EXISTS (
            SELECT 1 FROM public.team_events te
            JOIN public.teams t_ev ON t_ev.id = te.team_id
            WHERE te.id = player_session_discomfort_incidents.event_id
            AND t_ev.club_id = player_session_discomfort_incidents.club_id
        )
        AND (created_by IS NULL OR created_by = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid()
                AND pr.role IN ('admin', 'superadmin', 'coordinador', 'preparador_fisico')
            )
            OR
            EXISTS (
                SELECT 1 FROM public.players p
                WHERE p.id = player_session_discomfort_incidents.player_id
                AND (
                    EXISTS (
                        SELECT 1 FROM public.team_coaches tc
                        WHERE tc.team_id = p.team_id AND tc.profile_id = auth.uid()
                    )
                    OR
                    EXISTS (
                        SELECT 1 FROM public.teams t
                        WHERE t.id = p.team_id AND t.coach_id = auth.uid()
                    )
                )
            )
            OR (
                source IN ('wellness_flow', 'session_feedback', 'kiosk')
                AND (
                    auth.uid() = (SELECT p.user_auth_id FROM public.players p WHERE p.id = player_session_discomfort_incidents.player_id)
                    OR auth.uid() = (SELECT p.tutor_id FROM public.players p WHERE p.id = player_session_discomfort_incidents.player_id)
                    OR EXISTS (
                        SELECT 1 FROM public.player_tutors pt
                        WHERE pt.player_id = player_session_discomfort_incidents.player_id AND pt.tutor_id = auth.uid()
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "discomfort_incidents_update" ON public.player_session_discomfort_incidents;
CREATE POLICY "discomfort_incidents_update"
    ON public.player_session_discomfort_incidents FOR UPDATE TO authenticated
    USING (
        club_id IN (SELECT pr.club_id FROM public.profiles pr WHERE pr.id = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid()
                AND pr.role IN ('admin', 'superadmin', 'coordinador', 'preparador_fisico')
            )
            OR
            EXISTS (
                SELECT 1 FROM public.players p
                WHERE p.id = player_session_discomfort_incidents.player_id
                AND (
                    EXISTS (
                        SELECT 1 FROM public.team_coaches tc
                        WHERE tc.team_id = p.team_id AND tc.profile_id = auth.uid()
                    )
                    OR
                    EXISTS (
                        SELECT 1 FROM public.teams t
                        WHERE t.id = p.team_id AND t.coach_id = auth.uid()
                    )
                )
            )
            OR (
                source IN ('wellness_flow', 'session_feedback', 'kiosk')
                AND (
                    auth.uid() = (SELECT p.user_auth_id FROM public.players p WHERE p.id = player_session_discomfort_incidents.player_id)
                    OR auth.uid() = (SELECT p.tutor_id FROM public.players p WHERE p.id = player_session_discomfort_incidents.player_id)
                    OR EXISTS (
                        SELECT 1 FROM public.player_tutors pt
                        WHERE pt.player_id = player_session_discomfort_incidents.player_id AND pt.tutor_id = auth.uid()
                    )
                )
            )
        )
    )
    WITH CHECK (
        club_id IN (SELECT pr.club_id FROM public.profiles pr WHERE pr.id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.players p
            WHERE p.id = player_session_discomfort_incidents.player_id
            AND p.club_id = player_session_discomfort_incidents.club_id
        )
        AND EXISTS (
            SELECT 1 FROM public.team_events te
            JOIN public.teams t_ev ON t_ev.id = te.team_id
            WHERE te.id = player_session_discomfort_incidents.event_id
            AND t_ev.club_id = player_session_discomfort_incidents.club_id
        )
        AND (created_by IS NULL OR created_by = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid()
                AND pr.role IN ('admin', 'superadmin', 'coordinador', 'preparador_fisico')
            )
            OR
            EXISTS (
                SELECT 1 FROM public.players p
                WHERE p.id = player_session_discomfort_incidents.player_id
                AND (
                    EXISTS (
                        SELECT 1 FROM public.team_coaches tc
                        WHERE tc.team_id = p.team_id AND tc.profile_id = auth.uid()
                    )
                    OR
                    EXISTS (
                        SELECT 1 FROM public.teams t
                        WHERE t.id = p.team_id AND t.coach_id = auth.uid()
                    )
                )
            )
            OR (
                source IN ('wellness_flow', 'session_feedback', 'kiosk')
                AND (
                    auth.uid() = (SELECT p.user_auth_id FROM public.players p WHERE p.id = player_session_discomfort_incidents.player_id)
                    OR auth.uid() = (SELECT p.tutor_id FROM public.players p WHERE p.id = player_session_discomfort_incidents.player_id)
                    OR EXISTS (
                        SELECT 1 FROM public.player_tutors pt
                        WHERE pt.player_id = player_session_discomfort_incidents.player_id AND pt.tutor_id = auth.uid()
                    )
                )
            )
        )
    );


-- 3. TABLA: player_session_feedback
-- Finalidad: Registrar la autoevaluación post-entrenamiento (RPE, minutos individuales y molestias de sesión).
-- Complementa a player_training_metrics para no perder trazabilidad ni datos cualitativos.
CREATE TABLE IF NOT EXISTS public.player_session_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    
    -- Esfuerzo y participación real
    rpe INTEGER NOT NULL CHECK (rpe BETWEEN 0 AND 10),
    minutes_played INTEGER CHECK (minutes_played >= 0 AND minutes_played <= 300),
    training_load NUMERIC, -- sRPE = rpe * minutes_played (NULL si los minutos están sin confirmar)
    
    -- Molestias sobrevenidas durante la sesión específica
    has_discomfort BOOLEAN NOT NULL DEFAULT false,
    discomfort_zone TEXT,
    discomfort_intensity INTEGER CHECK (discomfort_intensity BETWEEN 1 AND 10),
    notes TEXT,

    -- Estado de validación por cuerpo técnico
    validation_status TEXT NOT NULL DEFAULT 'provisional' CHECK (validation_status IN ('provisional', 'confirmed', 'rejected')),
    source TEXT NOT NULL DEFAULT 'player_feedback' CHECK (source IN ('player_feedback', 'coach_entry', 'kiosk')),
    
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),

    -- Una única valoración post-entrenamiento por jugador y sesión
    CONSTRAINT uq_player_session_feedback_event_player UNIQUE (event_id, player_id)
);

-- Garantía de equivalencia estructural: si la tabla preexistía con el CHECK antiguo (1..10),
-- fuerza la actualización idempotente de la restricción a 0..10.
ALTER TABLE public.player_session_feedback
    DROP CONSTRAINT IF EXISTS player_session_feedback_rpe_check,
    ADD CONSTRAINT player_session_feedback_rpe_check CHECK (rpe BETWEEN 0 AND 10);

CREATE INDEX IF NOT EXISTS idx_player_session_feedback_event ON public.player_session_feedback (event_id);
CREATE INDEX IF NOT EXISTS idx_player_session_feedback_player ON public.player_session_feedback (player_id);

-- RLS: player_session_feedback
ALTER TABLE public.player_session_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_session_feedback_select" ON public.player_session_feedback;
CREATE POLICY "player_session_feedback_select"
    ON public.player_session_feedback FOR SELECT TO authenticated
    USING (
        club_id IN (SELECT pr.club_id FROM public.profiles pr WHERE pr.id = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid()
                AND pr.role IN ('admin', 'superadmin', 'coordinador', 'metodologo', 'preparador_fisico', 'fisio')
            )
            OR
            EXISTS (
                SELECT 1 FROM public.players p
                WHERE p.id = player_session_feedback.player_id
                AND (
                    EXISTS (
                        SELECT 1 FROM public.team_coaches tc
                        WHERE tc.team_id = p.team_id AND tc.profile_id = auth.uid()
                    )
                    OR
                    EXISTS (
                        SELECT 1 FROM public.teams t
                        WHERE t.id = p.team_id AND t.coach_id = auth.uid()
                    )
                )
            )
            OR auth.uid() = (SELECT p.user_auth_id FROM public.players p WHERE p.id = player_session_feedback.player_id)
            OR auth.uid() = (SELECT p.tutor_id FROM public.players p WHERE p.id = player_session_feedback.player_id)
            OR EXISTS (
                SELECT 1 FROM public.player_tutors pt
                WHERE pt.player_id = player_session_feedback.player_id AND pt.tutor_id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "player_session_feedback_insert" ON public.player_session_feedback;
CREATE POLICY "player_session_feedback_insert"
    ON public.player_session_feedback FOR INSERT TO authenticated
    WITH CHECK (
        club_id IN (SELECT pr.club_id FROM public.profiles pr WHERE pr.id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.players p
            WHERE p.id = player_session_feedback.player_id
            AND p.club_id = player_session_feedback.club_id
        )
        AND EXISTS (
            SELECT 1 FROM public.team_events te
            JOIN public.teams t_ev ON t_ev.id = te.team_id
            WHERE te.id = player_session_feedback.event_id
            AND t_ev.club_id = player_session_feedback.club_id
        )
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid()
                AND pr.role IN ('admin', 'superadmin', 'coordinador', 'preparador_fisico')
            )
            OR
            EXISTS (
                SELECT 1 FROM public.players p
                WHERE p.id = player_session_feedback.player_id
                AND (
                    EXISTS (
                        SELECT 1 FROM public.team_coaches tc
                        WHERE tc.team_id = p.team_id AND tc.profile_id = auth.uid()
                    )
                    OR
                    EXISTS (
                        SELECT 1 FROM public.teams t
                        WHERE t.id = p.team_id AND t.coach_id = auth.uid()
                    )
                )
            )
            OR (
                validation_status = 'provisional'
                AND source IN ('player_feedback', 'kiosk')
                AND (
                    auth.uid() = (SELECT p.user_auth_id FROM public.players p WHERE p.id = player_session_feedback.player_id)
                    OR auth.uid() = (SELECT p.tutor_id FROM public.players p WHERE p.id = player_session_feedback.player_id)
                    OR EXISTS (
                        SELECT 1 FROM public.player_tutors pt
                        WHERE pt.player_id = player_session_feedback.player_id AND pt.tutor_id = auth.uid()
                    )
                )
            )
        )
    );

DROP POLICY IF EXISTS "player_session_feedback_update" ON public.player_session_feedback;
CREATE POLICY "player_session_feedback_update"
    ON public.player_session_feedback FOR UPDATE TO authenticated
    USING (
        club_id IN (SELECT pr.club_id FROM public.profiles pr WHERE pr.id = auth.uid())
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid()
                AND pr.role IN ('admin', 'superadmin', 'coordinador', 'preparador_fisico')
            )
            OR
            EXISTS (
                SELECT 1 FROM public.players p
                WHERE p.id = player_session_feedback.player_id
                AND (
                    EXISTS (
                        SELECT 1 FROM public.team_coaches tc
                        WHERE tc.team_id = p.team_id AND tc.profile_id = auth.uid()
                    )
                    OR
                    EXISTS (
                        SELECT 1 FROM public.teams t
                        WHERE t.id = p.team_id AND t.coach_id = auth.uid()
                    )
                )
            )
            OR (
                -- Jugadores y tutores solo pueden editar filas que aún estén en estado 'provisional'
                validation_status = 'provisional'
                AND (
                    auth.uid() = (SELECT p.user_auth_id FROM public.players p WHERE p.id = player_session_feedback.player_id)
                    OR auth.uid() = (SELECT p.tutor_id FROM public.players p WHERE p.id = player_session_feedback.player_id)
                    OR EXISTS (
                        SELECT 1 FROM public.player_tutors pt
                        WHERE pt.player_id = player_session_feedback.player_id AND pt.tutor_id = auth.uid()
                    )
                )
            )
        )
    )
    WITH CHECK (
        club_id IN (SELECT pr.club_id FROM public.profiles pr WHERE pr.id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.players p
            WHERE p.id = player_session_feedback.player_id
            AND p.club_id = player_session_feedback.club_id
        )
        AND EXISTS (
            SELECT 1 FROM public.team_events te
            JOIN public.teams t_ev ON t_ev.id = te.team_id
            WHERE te.id = player_session_feedback.event_id
            AND t_ev.club_id = player_session_feedback.club_id
        )
        AND (
            EXISTS (
                SELECT 1 FROM public.profiles pr
                WHERE pr.id = auth.uid()
                AND pr.role IN ('admin', 'superadmin', 'coordinador', 'preparador_fisico')
            )
            OR
            EXISTS (
                SELECT 1 FROM public.players p
                WHERE p.id = player_session_feedback.player_id
                AND (
                    EXISTS (
                        SELECT 1 FROM public.team_coaches tc
                        WHERE tc.team_id = p.team_id AND tc.profile_id = auth.uid()
                    )
                    OR
                    EXISTS (
                        SELECT 1 FROM public.teams t
                        WHERE t.id = p.team_id AND t.coach_id = auth.uid()
                    )
                )
            )
            OR (
                -- Jugadores y tutores no pueden auto-confirmar, rechazar ni suplantar 'coach_entry'
                validation_status = 'provisional'
                AND source IN ('player_feedback', 'kiosk')
                AND (
                    auth.uid() = (SELECT p.user_auth_id FROM public.players p WHERE p.id = player_session_feedback.player_id)
                    OR auth.uid() = (SELECT p.tutor_id FROM public.players p WHERE p.id = player_session_feedback.player_id)
                    OR EXISTS (
                        SELECT 1 FROM public.player_tutors pt
                        WHERE pt.player_id = player_session_feedback.player_id AND pt.tutor_id = auth.uid()
                    )
                )
            )
        )
    );

-- ==============================================================================
-- CONTROL ESTRICTO DE PRIVILEGIOS DCL (Principio de Mínimo Privilegio)
-- ==============================================================================
-- Neutraliza los privilegios predeterminados amplios (DEFAULT PRIVILEGES) de Supabase.
-- RLS no protege contra TRUNCATE ni operaciones de trigger/foreign key. Se revoca
-- todo acceso heredado o directo y se concede únicamente el DML estrictamente necesario.

-- 1. Revocar absolutamente todos los privilegios a PUBLIC, anon, authenticated y service_role
REVOKE ALL ON TABLE 
    public.player_daily_wellness,
    public.player_session_discomfort_incidents,
    public.player_session_feedback
FROM PUBLIC, anon, authenticated, service_role;

-- 2. Conceder a 'authenticated' ÚNICAMENTE las operaciones contempladas en sus 9 políticas RLS
-- (Excluye terminantemente DELETE, TRUNCATE, REFERENCES y TRIGGER)
GRANT SELECT, INSERT, UPDATE ON TABLE 
    public.player_daily_wellness,
    public.player_session_discomfort_incidents,
    public.player_session_feedback
TO authenticated;

-- 3. Conceder a 'service_role' exactamente el conjunto DML requerido por feedback-actions.ts
-- (Excluye terminantemente TRUNCATE y DELETE; los borrados en cascada son gestionados por el owner de la FK)
GRANT SELECT, INSERT, UPDATE ON TABLE 
    public.player_daily_wellness,
    public.player_session_discomfort_incidents,
    public.player_session_feedback
TO service_role;
