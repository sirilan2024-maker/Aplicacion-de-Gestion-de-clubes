-- 1. Eliminar viejas Foreign Keys que restringen los IDs a la tabla 'equipos' ANTES de actualizar
ALTER TABLE public.partidos DROP CONSTRAINT IF EXISTS partidos_equipo_id_fkey;
ALTER TABLE public.team_coaches DROP CONSTRAINT IF EXISTS team_coaches_team_id_fkey;
ALTER TABLE public.team_events DROP CONSTRAINT IF EXISTS team_events_team_id_fkey;
ALTER TABLE public.player_season_history DROP CONSTRAINT IF EXISTS player_season_history_team_id_fkey;

-- 2. Asegurar que TODOS los equipos existen en 'teams' y sincronizar datos
DO $$
DECLARE
  rec RECORD;
  v_new_id UUID;
  v_club_id UUID;
BEGIN
  -- Obtener un club_id por defecto para los equipos que falten
  SELECT id INTO v_club_id FROM public.clubs LIMIT 1;

  FOR rec IN SELECT * FROM public.equipos LOOP
    SELECT id INTO v_new_id FROM public.teams WHERE lower(name) = lower(rec.name) LIMIT 1;
    
    -- Si el equipo NO existe en 'teams' (ej. Infantil C), lo creamos ahora mismo
    IF v_new_id IS NULL THEN
      INSERT INTO public.teams (name, category, members, coaches, color, club_id)
      VALUES (rec.name, rec.category, rec.members, rec.coaches, rec.color, v_club_id)
      RETURNING id INTO v_new_id;
    ELSE
      -- Si ya existe, simplemente le sincronizamos los contadores
      UPDATE public.teams SET members = rec.members, coaches = rec.coaches WHERE id = v_new_id;
    END IF;

    -- Ahora que v_new_id es 100% seguro que existe, migramos todo el historial:
    
    -- Migrar team_coaches
    UPDATE public.team_coaches SET team_id = v_new_id WHERE team_id = rec.id;
    
    -- Migrar partidos (columna equipo_id)
    UPDATE public.partidos SET equipo_id = v_new_id WHERE equipo_id = rec.id;
    
    -- Migrar entrenamientos (team_events)
    UPDATE public.team_events SET team_id = v_new_id WHERE team_id = rec.id;
    
    -- Migrar player_season_history
    UPDATE public.player_season_history SET team_id = v_new_id WHERE team_id = rec.id;
    
  END LOOP;
END $$;

-- 3. Crear las nuevas Foreign Keys apuntando a 'teams' AHORA que todos los IDs ya están actualizados
ALTER TABLE public.partidos ADD CONSTRAINT partidos_equipo_id_fkey FOREIGN KEY (equipo_id) REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.team_coaches ADD CONSTRAINT team_coaches_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.team_events ADD CONSTRAINT team_events_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.player_season_history ADD CONSTRAINT player_season_history_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;

-- 4. Renombrar la tabla antigua por seguridad
ALTER TABLE public.equipos RENAME TO equipos_old_archive;
