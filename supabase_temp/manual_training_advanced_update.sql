-- ========================================================
-- ACTUALIZACIÓN MÓDULO AVANZADO DE ENTRENAMIENTOS
-- ========================================================

-- 1. Modificar club_metrics para soportar categorías y opciones de dropdown
ALTER TABLE public.club_metrics ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.club_metrics ADD COLUMN IF NOT EXISTS module_type TEXT DEFAULT 'rendimiento' CHECK (module_type IN ('rendimiento', 'formativo'));
ALTER TABLE public.club_metrics ADD COLUMN IF NOT EXISTS options JSONB;

-- 2. Actualizar las métricas existentes a 'rendimiento'
UPDATE public.club_metrics SET category = 'Carga Interna', module_type = 'rendimiento' WHERE name = 'RPE';
UPDATE public.club_metrics SET category = 'Carga Externa', module_type = 'rendimiento' WHERE name = 'Minutos de Sesión';

-- 3. Crear el seed de las nuevas métricas (Para el primer club)
DO $$
DECLARE
  v_club_id UUID;
BEGIN
  -- Pillamos el primer club
  SELECT id INTO v_club_id FROM public.clubs LIMIT 1;
  
  IF v_club_id IS NOT NULL THEN
    -- Módulo Rendimiento (Físico)
    INSERT INTO public.club_metrics (club_id, name, category, module_type, type, unit) VALUES
      (v_club_id, 'Frecuencia Cardíaca Media', 'Carga Interna', 'rendimiento', 'number', 'lpm'),
      (v_club_id, 'Frecuencia Cardíaca Max', 'Carga Interna', 'rendimiento', 'number', 'lpm'),
      (v_club_id, 'Distancia Total', 'Carga Externa', 'rendimiento', 'number', 'km'),
      (v_club_id, 'High Speed Running (HSR)', 'Carga Externa', 'rendimiento', 'number', 'm'),
      (v_club_id, 'Sprints (>24km/h)', 'Carga Externa', 'rendimiento', 'number', 'm'),
      (v_club_id, 'Aceleraciones Intensas', 'Carga Externa', 'rendimiento', 'number', 'uds')
    ON CONFLICT DO NOTHING;

    -- Módulo Formativo (Fútbol Base) - Todas con desplegable
    INSERT INTO public.club_metrics (club_id, name, category, module_type, type, options) VALUES
      -- Cognitivo
      (v_club_id, 'Percepción y Visión', 'Cognitivo', 'formativo', 'text', '["Deficiente", "Regular", "Bueno", "Excelente"]'),
      (v_club_id, 'Velocidad de Ejecución', 'Cognitivo', 'formativo', 'text', '["Lenta", "Adecuada", "Rápida"]'),
      (v_club_id, 'Resolución de Problemas', 'Cognitivo', 'formativo', 'text', '["Mala", "Aceptable", "Óptima"]'),
      -- Táctico
      (v_club_id, 'Posicionamiento', 'Táctico', 'formativo', 'text', '["Despistado", "Mantiene Zona", "Domina Espacios"]'),
      (v_club_id, 'Transiciones', 'Táctico', 'formativo', 'text', '["Lento", "Reactivo", "Proactivo"]'),
      -- Técnico
      (v_club_id, 'Pierna menos hábil', 'Técnico', 'formativo', 'text', '["Nulo", "Básico", "Fluido"]'),
      (v_club_id, 'Control Orientado', 'Técnico', 'formativo', 'text', '["Se le escapa", "Hacia el rival", "Hacia espacio libre"]'),
      -- Socioafectivo y Psicológico
      (v_club_id, 'Gestión del Error (Resiliencia)', 'Socioafectivo', 'formativo', 'text', '["Se frustra", "Lo intenta", "Se crece"]'),
      (v_club_id, 'Compañerismo', 'Socioafectivo', 'formativo', 'text', '["Individualista", "Colaborador", "Líder Positivo"]'),
      -- Volitivo
      (v_club_id, 'Intensidad en disputa', 'Volitivo', 'formativo', 'text', '["Baja", "Media", "Alta"]'),
      (v_club_id, 'Atención y Escucha', 'Volitivo', 'formativo', 'text', '["Distraído", "Atento"]'),
      -- Madurativo
      (v_club_id, 'Coordinación Motriz', 'Madurativo', 'formativo', 'text', '["Torpe (Estirón)", "Normal", "Muy Agil"]')
    ON CONFLICT DO NOTHING;
    
    -- Módulo Madurativo Numérico
    INSERT INTO public.club_metrics (club_id, name, category, module_type, type, unit) VALUES
      (v_club_id, 'Altura (PHV)', 'Madurativo', 'formativo', 'number', 'cm'),
      (v_club_id, 'Peso', 'Madurativo', 'formativo', 'number', 'kg')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- 4. Vista para el cálculo de ACWR
CREATE OR REPLACE VIEW public.player_workload_stats AS
WITH session_loads AS (
    -- Calculamos la Carga de la Sesión = RPE * Minutos para cada jugador
    SELECT 
        pm_rpe.player_id,
        te.date,
        (pm_rpe.value_number * pm_min.value_number) AS daily_load
    FROM public.team_events te
    JOIN public.player_training_metrics pm_rpe ON te.id = pm_rpe.event_id
    JOIN public.club_metrics cm_rpe ON pm_rpe.metric_id = cm_rpe.id AND cm_rpe.name = 'RPE'
    JOIN public.player_training_metrics pm_min ON te.id = pm_min.event_id AND pm_rpe.player_id = pm_min.player_id
    JOIN public.club_metrics cm_min ON pm_min.metric_id = cm_min.id AND cm_min.name = 'Minutos de Sesión'
    WHERE te.event_type = 'Entrenamiento'
),
daily_totals AS (
    -- Sumamos si hay más de un entrenamiento en un día (raro pero posible)
    SELECT 
        player_id,
        date,
        SUM(daily_load) as total_daily_load
    FROM session_loads
    GROUP BY player_id, date
)
SELECT 
    p.id AS player_id,
    p.first_name,
    p.last_name,
    p.team_id,
    (
        SELECT COALESCE(AVG(total_daily_load), 0)
        FROM daily_totals dt
        WHERE dt.player_id = p.id AND dt.date >= CURRENT_DATE - INTERVAL '7 days'
    ) AS acute_load,
    (
        SELECT COALESCE(AVG(total_daily_load), 0)
        FROM daily_totals dt
        WHERE dt.player_id = p.id AND dt.date >= CURRENT_DATE - INTERVAL '28 days'
    ) AS chronic_load,
    CASE 
        WHEN (SELECT COALESCE(AVG(total_daily_load), 0) FROM daily_totals dt WHERE dt.player_id = p.id AND dt.date >= CURRENT_DATE - INTERVAL '28 days') = 0 THEN 0
        ELSE (
            (SELECT COALESCE(AVG(total_daily_load), 0) FROM daily_totals dt WHERE dt.player_id = p.id AND dt.date >= CURRENT_DATE - INTERVAL '7 days') 
            / 
            (SELECT COALESCE(AVG(total_daily_load), 0) FROM daily_totals dt WHERE dt.player_id = p.id AND dt.date >= CURRENT_DATE - INTERVAL '28 days')
        )
    END AS acwr
FROM public.players p;
