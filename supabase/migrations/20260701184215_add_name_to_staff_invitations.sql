-- Añadir columna name a staff_invitations para mejorar la UX en el listado de miembros
ALTER TABLE public.staff_invitations ADD COLUMN IF NOT EXISTS name TEXT;
