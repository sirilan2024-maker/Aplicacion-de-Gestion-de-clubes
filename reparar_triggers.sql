-- 1. Actualizar las funciones Trigger para que apunten a la nueva tabla 'teams' en lugar de 'equipos'
CREATE OR REPLACE FUNCTION public.update_equipos_members_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.team_id IS NOT NULL THEN
    UPDATE public.teams SET members = members + 1 WHERE id = NEW.team_id;
  ELSIF TG_OP = 'DELETE' AND OLD.team_id IS NOT NULL THEN
    UPDATE public.teams SET members = members - 1 WHERE id = OLD.team_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
      IF OLD.team_id IS NOT NULL THEN
        UPDATE public.teams SET members = members - 1 WHERE id = OLD.team_id;
      END IF;
      IF NEW.team_id IS NOT NULL THEN
        UPDATE public.teams SET members = members + 1 WHERE id = NEW.team_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_equipos_coaches_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.team_id IS NOT NULL THEN
    UPDATE public.teams SET coaches = coaches + 1 WHERE id = NEW.team_id;
  ELSIF TG_OP = 'DELETE' AND OLD.team_id IS NOT NULL THEN
    UPDATE public.teams SET coaches = coaches - 1 WHERE id = OLD.team_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
      IF OLD.team_id IS NOT NULL THEN
        UPDATE public.teams SET coaches = coaches - 1 WHERE id = OLD.team_id;
      END IF;
      IF NEW.team_id IS NOT NULL THEN
        UPDATE public.teams SET coaches = coaches + 1 WHERE id = NEW.team_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Ahora que los Triggers están arreglados, asignar a los 22 jugadores huérfanos al nuevo Infantil C
UPDATE public.players 
SET team_id = 'f10ffbaf-56ef-4d23-bab7-4bb9a4918570' 
WHERE team_id IS NULL OR team_id = '115b9de7-3630-4ba2-beb4-ccc19a2b9b78';
