-- Migración para aplicar SECURITY INVOKER a todas las vistas públicas
-- Esto resuelve la alerta del linter de Supabase sobre SECURITY DEFINER en las vistas
-- y asegura que el RLS de las tablas base se aplique correctamente al consultar las vistas.

DO $$ 
DECLARE
    v_record RECORD;
BEGIN
    FOR v_record IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
    LOOP
        EXECUTE format('ALTER VIEW public.%I SET (security_invoker = true);', v_record.table_name);
    END LOOP;
END $$;
