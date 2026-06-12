-- ============================================================
-- Migración 00028 — Motor de Análisis IA
-- ============================================================

CREATE TABLE IF NOT EXISTS public.ai_analysis_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.equipos(id) ON DELETE CASCADE,
    match_id UUID REFERENCES public.partidos(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('match_evaluation', 'training_evaluation', 'player_evaluation')),
    analysis_text TEXT NOT NULL,
    rating NUMERIC CHECK (rating >= 1 AND rating <= 10),
    metrics_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_analysis_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view all AI reports"
ON public.ai_analysis_reports FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND role = 'admin'));

CREATE POLICY "Coaches can view their team AI reports"
ON public.ai_analysis_reports FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.equipos WHERE equipos.id = ai_analysis_reports.team_id AND equipos.coach_id = auth.uid()));

CREATE POLICY "Admin and Coaches can create AI reports"
ON public.ai_analysis_reports FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND role = 'admin') OR
    EXISTS (SELECT 1 FROM public.equipos WHERE equipos.id = ai_analysis_reports.team_id AND equipos.coach_id = auth.uid())
);
