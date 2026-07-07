-- Agregar campos extendidos para Ficha de Cuerpo Técnico / Entrenadores / Directiva
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS dni text,
ADD COLUMN IF NOT EXISTS birth_date date,
ADD COLUMN IF NOT EXISTS license_number text;

-- Asegurar que la tabla y columnas siguen expuestas correctamente
NOTIFY pgrst, 'reload schema';
