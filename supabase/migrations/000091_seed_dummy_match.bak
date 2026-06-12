-- ==========================================
-- AÑADIR PARTIDO DE PRUEBA (Automático)
-- ==========================================

DO $$
DECLARE
  default_club_id UUID;
  default_equipo_id UUID;
BEGIN
  -- 1. Buscamos el club al que pertenece el usuario
  SELECT club_id INTO default_club_id FROM public.profiles LIMIT 1;
  
  -- 2. Buscamos cualquier equipo que exista en la base de datos
  SELECT id INTO default_equipo_id FROM public.teams LIMIT 1;

  IF default_club_id IS NOT NULL AND default_equipo_id IS NOT NULL THEN
    
    -- 3. Insertamos el partido de prueba si no existe ya
    IF NOT EXISTS (SELECT 1 FROM public.partidos WHERE rival_nombre = 'Rayo Vallecano Juv') THEN
      INSERT INTO public.partidos (club_id, equipo_id, rival_nombre, fecha_hora, lugar, estado)
      VALUES (
        default_club_id, 
        default_equipo_id, 
        'Rayo Vallecano Juv', 
        now() + interval '3 days', 
        'Local', 
        'Programado'
      );
    END IF;

  END IF;
END $$;
