-- ==============================================================================
-- MIGRACIÓN M1.1: MAPA CORPORAL PARA LESIONES (player_injuries)
-- ==============================================================================

ALTER TABLE public.player_injuries
  ADD COLUMN IF NOT EXISTS body_view VARCHAR(20) CHECK (body_view IN ('front', 'back') OR body_view IS NULL),
  ADD COLUMN IF NOT EXISTS body_region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS body_side VARCHAR(20) CHECK (body_side IN ('left', 'right', 'center', 'none') OR body_side IS NULL);

-- Índice para búsquedas estadísticas por región anatómica
CREATE INDEX IF NOT EXISTS idx_player_injuries_body_region ON public.player_injuries (body_region);
