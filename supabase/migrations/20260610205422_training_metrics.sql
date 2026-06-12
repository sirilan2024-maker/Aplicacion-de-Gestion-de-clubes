-- Create table for Club Metrics (Dynamic physical parameters)
CREATE TABLE IF NOT EXISTS public.club_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., 'RPE', 'Minutes', 'Fatigue Level'
    description TEXT,
    unit TEXT, -- e.g., '1-10', 'mins', 'km'
    type TEXT NOT NULL CHECK (type IN ('number', 'text', 'boolean')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(club_id, name)
);

-- RLS for club_metrics
ALTER TABLE public.club_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their club's metrics"
    ON public.club_metrics FOR SELECT
    USING (club_id IN (
        SELECT club_id FROM public.profiles WHERE profiles.id = auth.uid()
    ));

CREATE POLICY "Admins can manage their club's metrics"
    ON public.club_metrics FOR ALL
    USING (
        club_id IN (
            SELECT club_id FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'superadmin')
        )
    );

-- Create table for Player Training Metrics
CREATE TABLE IF NOT EXISTS public.player_training_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES public.team_events(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES public.club_metrics(id) ON DELETE CASCADE,
    value_number NUMERIC,
    value_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(event_id, player_id, metric_id)
);

-- RLS for player_training_metrics
ALTER TABLE public.player_training_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their club's player training metrics"
    ON public.player_training_metrics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.players p
            JOIN public.equipos e ON p.team_id = e.id
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
            JOIN public.equipos e ON p.team_id = e.id
            JOIN public.profiles pr ON pr.club_id = e.club_id
            WHERE p.id = player_training_metrics.player_id
            AND pr.id = auth.uid()
            AND pr.role IN ('admin', 'superadmin', 'coach', 'entrenador', 'metodologo')
        )
    );
