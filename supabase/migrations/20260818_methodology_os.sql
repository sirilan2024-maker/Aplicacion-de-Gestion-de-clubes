-- 20260818_methodology_os.sql
-- Migration file for Methodology OS module

-- methodology_curriculum
CREATE TABLE IF NOT EXISTS public.methodology_curriculum (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    category_code TEXT NOT NULL,
    category_label TEXT NOT NULL,
    age_min INT,
    age_max INT,
    philosophy_text TEXT,
    objectives TEXT[] DEFAULT '{}',
    priority_families TEXT[] DEFAULT '{}',
    color TEXT DEFAULT '#3b82f6',
    sort_order INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(club_id, category_code)
);

-- methodology_principles
CREATE TABLE IF NOT EXISTS public.methodology_principles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    curriculum_id UUID NOT NULL REFERENCES public.methodology_curriculum(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    game_phase TEXT NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- methodology_subprinciples
CREATE TABLE IF NOT EXISTS public.methodology_subprinciples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    principle_id UUID NOT NULL REFERENCES public.methodology_principles(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- methodology_behaviours
CREATE TABLE IF NOT EXISTS public.methodology_behaviours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subprinciple_id UUID NOT NULL REFERENCES public.methodology_subprinciples(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    age_categories TEXT[] DEFAULT '{}',
    performance_indicators TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- macrocycles
CREATE TABLE IF NOT EXISTS public.macrocycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
    team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phase_type TEXT NOT NULL DEFAULT 'Pretemporada',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    objectives TEXT[] DEFAULT '{}',
    notes TEXT,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- mesocycles
CREATE TABLE IF NOT EXISTS public.mesocycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    macrocycle_id UUID NOT NULL REFERENCES public.macrocycles(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    focus_phase TEXT NOT NULL DEFAULT 'Aprendizaje',
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    weekly_load_target INT DEFAULT 60,
    objectives TEXT[] DEFAULT '{}',
    priority_content TEXT[] DEFAULT '{}',
    sort_order INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- microcycles
CREATE TABLE IF NOT EXISTS public.microcycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mesocycle_id UUID REFERENCES public.mesocycles(id) ON DELETE SET NULL,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    match_day_date DATE,
    match_opponent TEXT,
    total_minutes INT DEFAULT 0,
    weekly_load_index INT DEFAULT 50,
    objective TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- player_objectives
CREATE TABLE IF NOT EXISTS public.player_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
    coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    objective_type TEXT NOT NULL,
    description TEXT NOT NULL,
    target_date DATE,
    status TEXT DEFAULT 'pendiente',
    progress_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- team_objectives
CREATE TABLE IF NOT EXISTS public.team_objectives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL,
    objective_type TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'pendiente',
    priority INT DEFAULT 2,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- banco_ejercicios additions
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS principle_id UUID REFERENCES public.methodology_principles(id) ON DELETE SET NULL;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS subprinciple_id UUID REFERENCES public.methodology_subprinciples(id) ON DELETE SET NULL;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS bloque_sesion TEXT;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS carga_fisica INT DEFAULT 2 CHECK (carga_fisica BETWEEN 1 AND 4);
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS carga_cognitiva INT DEFAULT 2 CHECK (carga_cognitiva BETWEEN 1 AND 4);
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS oposicion INT DEFAULT 2 CHECK (oposicion BETWEEN 1 AND 4);
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS representatividad INT DEFAULT 2 CHECK (representatividad BETWEEN 1 AND 4);
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS criterios_exito TEXT[] DEFAULT '{}';
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS progresion_descripcion TEXT;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS regresion_descripcion TEXT;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS correcciones TEXT;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS jugadores_min_old TEXT;
ALTER TABLE public.banco_ejercicios ADD COLUMN IF NOT EXISTS espacio TEXT;

-- training_sessions addition
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS microcycle_id UUID REFERENCES public.microcycles(id) ON DELETE SET NULL;
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS objective TEXT;
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS objectives_secondary TEXT[] DEFAULT '{}';
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS num_players INT;
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS num_goalkeepers INT DEFAULT 0;
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS available_space TEXT;
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS available_material TEXT[] DEFAULT '{}';
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS estimated_load INT DEFAULT 50;
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS season_id UUID REFERENCES public.seasons(id) ON DELETE SET NULL;

-- RLS POLICIES

-- methodology_curriculum
ALTER TABLE public.methodology_curriculum ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members can view methodology_curriculum"
    ON public.methodology_curriculum FOR SELECT
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins and metodologos can manage methodology_curriculum"
    ON public.methodology_curriculum FOR ALL
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coordinador')));

-- methodology_principles
ALTER TABLE public.methodology_principles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members can view methodology_principles"
    ON public.methodology_principles FOR SELECT
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins and metodologos can manage methodology_principles"
    ON public.methodology_principles FOR ALL
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coordinador')));

-- methodology_subprinciples
ALTER TABLE public.methodology_subprinciples ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members can view methodology_subprinciples"
    ON public.methodology_subprinciples FOR SELECT
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins and metodologos can manage methodology_subprinciples"
    ON public.methodology_subprinciples FOR ALL
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coordinador')));

-- methodology_behaviours
ALTER TABLE public.methodology_behaviours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members can view methodology_behaviours"
    ON public.methodology_behaviours FOR SELECT
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins and metodologos can manage methodology_behaviours"
    ON public.methodology_behaviours FOR ALL
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coordinador')));

-- macrocycles
ALTER TABLE public.macrocycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members can view macrocycles"
    ON public.macrocycles FOR SELECT
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins and metodologos can manage macrocycles"
    ON public.macrocycles FOR ALL
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coordinador')));

-- mesocycles
ALTER TABLE public.mesocycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members can view mesocycles"
    ON public.mesocycles FOR SELECT
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins and metodologos can manage mesocycles"
    ON public.mesocycles FOR ALL
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coordinador')));

-- microcycles
ALTER TABLE public.microcycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members can view microcycles"
    ON public.microcycles FOR SELECT
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins and metodologos can manage microcycles"
    ON public.microcycles FOR ALL
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coordinador')));

-- player_objectives
ALTER TABLE public.player_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members can view player_objectives"
    ON public.player_objectives FOR SELECT
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins and metodologos can manage player_objectives"
    ON public.player_objectives FOR ALL
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coordinador')));

-- team_objectives
ALTER TABLE public.team_objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members can view team_objectives"
    ON public.team_objectives FOR SELECT
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "Admins and metodologos can manage team_objectives"
    ON public.team_objectives FOR ALL
    USING (club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'metodologo', 'coordinador')));
