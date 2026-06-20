-- Add duration columns to track the exact lengths of the halves
ALTER TABLE public.partidos
ADD COLUMN IF NOT EXISTS first_half_duration_seconds INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS second_half_duration_seconds INTEGER DEFAULT NULL;
