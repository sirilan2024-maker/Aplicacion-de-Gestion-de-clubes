-- Drop the check constraint on the 'lugar' column to allow arbitrary text like 'Campo Mpal. de Rojales'
DO $$
DECLARE
    con_name text;
BEGIN
    SELECT conname INTO con_name
    FROM pg_constraint
    WHERE conrelid = 'public.partidos'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%lugar%';

    IF con_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.partidos DROP CONSTRAINT ' || quote_ident(con_name);
    END IF;
END $$;
