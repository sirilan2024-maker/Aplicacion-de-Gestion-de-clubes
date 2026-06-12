-- Create seasons table
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- RLS for seasons
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their club's seasons"
    ON public.seasons FOR SELECT
    USING (club_id IN (
        SELECT club_id FROM public.profiles WHERE profiles.id = auth.uid()
    ));

CREATE POLICY "Admins can manage their club's seasons"
    ON public.seasons FOR ALL
    USING (
        club_id IN (
            SELECT club_id FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Add season_id to equipos
ALTER TABLE public.equipos ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;

-- Create player_season_teams to track player history
CREATE TABLE IF NOT EXISTS public.player_season_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.equipos(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(player_id, season_id)
);

-- RLS for player_season_teams
ALTER TABLE public.player_season_teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their club's player seasons"
    ON public.player_season_teams FOR SELECT
    USING (club_id IN (
        SELECT club_id FROM public.profiles WHERE profiles.id = auth.uid()
    ));

CREATE POLICY "Admins can manage their club's player seasons"
    ON public.player_season_teams FOR ALL
    USING (
        club_id IN (
            SELECT club_id FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
        )
    );
