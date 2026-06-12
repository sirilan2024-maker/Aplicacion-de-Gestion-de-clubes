-- ==========================================
-- Módulo: Consolidación Equipos y Triggers
-- ==========================================

-- 1. Trigger para actualizar el número de jugadores (members) en equipos
CREATE OR REPLACE FUNCTION update_equipos_members_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.team_id IS NOT NULL THEN
            UPDATE public.equipos SET members = (SELECT count(*) FROM public.players WHERE team_id = NEW.team_id) WHERE id = NEW.team_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.team_id IS NOT NULL THEN
            UPDATE public.equipos SET members = (SELECT count(*) FROM public.players WHERE team_id = OLD.team_id) WHERE id = OLD.team_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
            IF OLD.team_id IS NOT NULL THEN
                UPDATE public.equipos SET members = (SELECT count(*) FROM public.players WHERE team_id = OLD.team_id) WHERE id = OLD.team_id;
            END IF;
            IF NEW.team_id IS NOT NULL THEN
                UPDATE public.equipos SET members = (SELECT count(*) FROM public.players WHERE team_id = NEW.team_id) WHERE id = NEW.team_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_equipos_members ON public.players;
CREATE TRIGGER trg_update_equipos_members
AFTER INSERT OR UPDATE OR DELETE ON public.players
FOR EACH ROW EXECUTE FUNCTION update_equipos_members_count();

-- 2. Trigger para actualizar el número de entrenadores (coaches) en equipos
CREATE OR REPLACE FUNCTION update_equipos_coaches_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.team_id IS NOT NULL THEN
            UPDATE public.equipos SET coaches = (SELECT count(*) FROM public.team_coaches WHERE team_id = NEW.team_id) WHERE id = NEW.team_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.team_id IS NOT NULL THEN
            UPDATE public.equipos SET coaches = (SELECT count(*) FROM public.team_coaches WHERE team_id = OLD.team_id) WHERE id = OLD.team_id;
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.team_id IS DISTINCT FROM NEW.team_id THEN
            IF OLD.team_id IS NOT NULL THEN
                UPDATE public.equipos SET coaches = (SELECT count(*) FROM public.team_coaches WHERE team_id = OLD.team_id) WHERE id = OLD.team_id;
            END IF;
            IF NEW.team_id IS NOT NULL THEN
                UPDATE public.equipos SET coaches = (SELECT count(*) FROM public.team_coaches WHERE team_id = NEW.team_id) WHERE id = NEW.team_id;
            END IF;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_equipos_coaches ON public.team_coaches;
CREATE TRIGGER trg_update_equipos_coaches
AFTER INSERT OR UPDATE OR DELETE ON public.team_coaches
FOR EACH ROW EXECUTE FUNCTION update_equipos_coaches_count();

-- Actualizar los contadores actuales para los equipos existentes
UPDATE public.equipos e
SET 
  members = (SELECT count(*) FROM public.players p WHERE p.team_id = e.id),
  coaches = (SELECT count(*) FROM public.team_coaches tc WHERE tc.team_id = e.id);
