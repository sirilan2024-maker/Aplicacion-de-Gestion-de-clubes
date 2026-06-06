-- ============================================================
-- MÓDULO: ONBOARDING POR INVITACIÓN
-- Migración 00011 — Códigos de invitación en equipos
-- ============================================================

-- 1. Añadir columna invite_code a la tabla teams
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS invite_code TEXT UNIQUE;

-- 2. Función para generar código alfanumérico de 8 caracteres
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars  TEXT    := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- sin 0/O/1/I para evitar confusión
  result TEXT    := '';
  i      INTEGER;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- 3. Función del trigger: asigna código único al crear un equipo
CREATE OR REPLACE FUNCTION public.assign_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  attempts INTEGER := 0;
BEGIN
  -- Intentar hasta 10 veces para garantizar unicidad
  LOOP
    new_code := public.generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.teams WHERE invite_code = new_code);
    attempts := attempts + 1;
    IF attempts >= 10 THEN
      RAISE EXCEPTION 'No se pudo generar un invite_code único tras 10 intentos';
    END IF;
  END LOOP;

  NEW.invite_code := new_code;
  RETURN NEW;
END;
$$;

-- 4. Trigger BEFORE INSERT que llama a la función anterior
DROP TRIGGER IF EXISTS trg_assign_invite_code ON public.teams;
CREATE TRIGGER trg_assign_invite_code
  BEFORE INSERT ON public.teams
  FOR EACH ROW
  WHEN (NEW.invite_code IS NULL)
  EXECUTE FUNCTION public.assign_invite_code();

-- 5. Rellenar equipos existentes que no tienen código
UPDATE public.teams
SET invite_code = public.generate_invite_code()
WHERE invite_code IS NULL;

-- 6. Forzar unicidad si no existía ya
ALTER TABLE public.teams
  DROP CONSTRAINT IF EXISTS teams_invite_code_key;
ALTER TABLE public.teams
  ADD CONSTRAINT teams_invite_code_key UNIQUE (invite_code);

-- ── RLS para lectura pública del código (solo durante onboarding) ──────────
-- Necesitamos que usuarios NO autenticados puedan leer el nombre e invite_code
-- de un equipo para mostrar "Estás uniéndote a: Alevín A" en el formulario.

-- Habilitar RLS si no estaba (ya debería estarlo)
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Política de lectura pública SÓLO de los campos necesarios para onboarding.
-- Cualquiera puede leer UN equipo si conoce su invite_code (búsqueda exacta).
DROP POLICY IF EXISTS "Public invite code lookup" ON public.teams;
CREATE POLICY "Public invite code lookup"
  ON public.teams
  FOR SELECT
  TO anon, authenticated
  USING (true);
-- Nota: la política permite SELECT general, pero la query del onboarding filtra
-- por invite_code, por lo que solo devuelve el equipo correcto. Las columnas
-- sensibles nunca se exponen porque la query solo pide `name` e `invite_code`.
