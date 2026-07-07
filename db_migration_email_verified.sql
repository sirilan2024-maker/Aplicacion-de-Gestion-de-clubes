-- Añadir la columna email_verified a la tabla profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- Si quieres marcar como verificados a los usuarios actuales de forma automática (opcional, recomendado para no bloquear a tus usuarios actuales de repente):
-- UPDATE public.profiles SET email_verified = true WHERE email_verified IS FALSE;
