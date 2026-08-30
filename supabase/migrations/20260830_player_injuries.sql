-- ==============================================================================
-- MIGRACIÓN M1: HISTORIAL BÁSICO DE LESIONES POR JUGADOR (player_injuries)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.player_injuries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    injury_date DATE NOT NULL,
    injury_type VARCHAR(100) NOT NULL,
    notes TEXT,
    expected_return_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'activa' CHECK (status IN ('activa', 'recuperado')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Índices de optimización y búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_player_injuries_player_status ON public.player_injuries (player_id, status);
CREATE INDEX IF NOT EXISTS idx_player_injuries_club_id ON public.player_injuries (club_id);
CREATE INDEX IF NOT EXISTS idx_player_injuries_injury_date ON public.player_injuries (injury_date DESC);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.player_injuries ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS con aislamiento multi-tenant por club_id
DROP POLICY IF EXISTS "player_injuries_select_policy" ON public.player_injuries;
CREATE POLICY "player_injuries_select_policy" ON public.player_injuries
    FOR SELECT
    USING (
        auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "player_injuries_insert_policy" ON public.player_injuries;
CREATE POLICY "player_injuries_insert_policy" ON public.player_injuries
    FOR INSERT
    WITH CHECK (
        auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "player_injuries_update_policy" ON public.player_injuries;
CREATE POLICY "player_injuries_update_policy" ON public.player_injuries
    FOR UPDATE
    USING (
        auth.role() = 'authenticated'
    );

DROP POLICY IF EXISTS "player_injuries_delete_policy" ON public.player_injuries;
CREATE POLICY "player_injuries_delete_policy" ON public.player_injuries
    FOR DELETE
    USING (
        auth.role() = 'authenticated'
    );
