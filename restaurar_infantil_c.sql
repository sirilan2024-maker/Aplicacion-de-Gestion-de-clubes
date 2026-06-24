-- 1. Obtener el ID del club y de la temporada activa (25/26) y guardar el nuevo equipo
DO $$
DECLARE
  v_club_id UUID;
  v_season_id UUID;
  v_new_team_id UUID := gen_random_uuid();
BEGIN
  -- Coger el club_id del administrador actual (Sporting Saladar)
  SELECT id INTO v_club_id FROM public.clubs LIMIT 1;
  
  -- Coger la temporada activa (25/26)
  SELECT id INTO v_season_id FROM public.seasons WHERE club_id = v_club_id AND is_active = true LIMIT 1;

  -- 2. Insertar el Infantil C en la tabla de equipos
  INSERT INTO public.teams (id, club_id, season_id, name, category, color, created_at, updated_at)
  VALUES (v_new_team_id, v_club_id, v_season_id, 'Infantil C', 'Infantil', '#0ea5e9', now(), now());

  -- 3. Rescatar a los 22 jugadores que se quedaron huérfanos (los únicos con team_id NULL)
  -- y asignarlos automáticamente a este nuevo Infantil C.
  UPDATE public.players
  SET team_id = v_new_team_id
  WHERE team_id IS NULL AND club_id = v_club_id;
  
END $$;
