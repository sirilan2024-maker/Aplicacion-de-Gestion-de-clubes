CREATE OR REPLACE FUNCTION public.protect_profiles_elevation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  -- Si la petición viene de service_role o no hay usuario autenticado en JWT, permitir
  IF auth.role() = 'service_role' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Comprobar si se intenta cambiar rol, roles o club_id
  IF (NEW.role IS DISTINCT FROM OLD.role) OR 
     (NEW.roles IS DISTINCT FROM OLD.roles) OR 
     (NEW.club_id IS DISTINCT FROM OLD.club_id) THEN
     
    SELECT (role IN ('admin', 'superadmin', 'directivo')) INTO caller_is_admin
    FROM public.profiles
    WHERE id = auth.uid();

    IF caller_is_admin IS NOT TRUE THEN
      RAISE EXCEPTION 'No tienes permiso para modificar tu rol o tu club directamente.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
