-- Add highlight_jornada column to partidos
-- This allows admins to manually pin a match to appear in the "Jornada" tab
-- even if it falls outside the automatic ±72h window
ALTER TABLE public.partidos
  ADD COLUMN IF NOT EXISTS highlight_jornada BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.partidos.highlight_jornada IS
  'Si es TRUE, el partido aparece siempre en la pestaña Jornada del dashboard, independientemente de la ventana de ±72h automática.';
