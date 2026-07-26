-- Añadir columnas faltantes a la tabla players generadas por el nuevo Flujo Directo de Inscripción
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS nationality TEXT,
ADD COLUMN IF NOT EXISTS parent1_dni TEXT,
ADD COLUMN IF NOT EXISTS privacy_policy_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS guardianship_declaration BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS special_medical_treatment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS image_rights_accepted BOOLEAN DEFAULT false;
