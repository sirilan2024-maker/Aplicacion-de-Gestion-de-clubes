-- Crear tabla de eventos de equipo
CREATE TABLE IF NOT EXISTS public.team_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    team_id UUID REFERENCES public.equipos(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('Entrenamiento', 'Partido', 'Reunión', 'Otro')),
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    location TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.team_events ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para team_events
CREATE POLICY "Users can view team_events for their club"
    ON public.team_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.equipos e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = team_events.team_id
            AND p.id = auth.uid()
        )
    );

CREATE POLICY "Users can manage team_events for their club"
    ON public.team_events FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.equipos e
            JOIN public.profiles p ON p.club_id = e.club_id
            WHERE e.id = team_events.team_id
            AND p.id = auth.uid()
            AND p.role IN ('admin', 'metodologo', 'coach', 'entrenador', 'delegado')
        )
    );

-- Modificar tabla attendance para añadir event_id
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.team_events(id) ON DELETE CASCADE;

-- Si se quiere permitir que event_id y date estén ambos, no hacemos cambios estrictos, 
-- pero event_id será la relación fuerte cuando la asistencia sea de un evento.
