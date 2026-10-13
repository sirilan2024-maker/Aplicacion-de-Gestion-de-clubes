-- Add tipo_partido column to distinguish between league ('liga') and friendly ('amistoso') matches
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS tipo_partido text DEFAULT 'liga';
ALTER TABLE team_events ADD COLUMN IF NOT EXISTS tipo_partido text DEFAULT NULL;
