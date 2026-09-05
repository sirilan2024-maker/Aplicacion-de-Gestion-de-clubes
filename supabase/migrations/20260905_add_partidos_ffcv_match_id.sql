ALTER TABLE public.partidos ADD COLUMN IF NOT EXISTS ffcv_match_id TEXT;
CREATE INDEX IF NOT EXISTS idx_partidos_ffcv_match_id ON public.partidos(ffcv_match_id);
