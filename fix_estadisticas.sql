-- ============================================================
-- FIX FASE 1.5: Mover las métricas al club correcto
-- ============================================================

-- 1. Mover las definiciones de las métricas (club_metrics)
UPDATE public.club_metrics
  SET club_id = '7ff5dbeb-2942-4576-8e74-b45a17646fb7'
  WHERE club_id = '733c8cea-0204-447a-8696-fbcbd6c429e4';

-- 2. Asegurar que los registros de eventos de partido estén en la temporada
UPDATE public.match_events
  SET season_id = '1f95102d-1d00-43fa-9e4c-408681a03e7f'
  WHERE season_id IS NULL;

-- ─── VERIFICACIÓN ───────────────────────────────────────────
SELECT
  'club_metrics'         AS tabla, COUNT(*) AS registros
  FROM public.club_metrics WHERE club_id = '7ff5dbeb-2942-4576-8e74-b45a17646fb7'
UNION ALL SELECT
  'player_training_metrics', COUNT(*)
  FROM public.player_training_metrics
UNION ALL SELECT
  'match_events',        COUNT(*)
  FROM public.match_events WHERE season_id = '1f95102d-1d00-43fa-9e4c-408681a03e7f';
