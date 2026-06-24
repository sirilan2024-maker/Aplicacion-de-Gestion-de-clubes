DO $$
DECLARE
    pol RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    drop_stmt TEXT;
    create_stmt TEXT;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname, qual, with_check, roles, cmd 
        FROM pg_policies 
        WHERE (qual IS NOT NULL AND qual LIKE '%equipos_old_archive%') 
           OR (with_check IS NOT NULL AND with_check LIKE '%equipos_old_archive%')
    LOOP
        -- Construir DROP
        drop_stmt := format('DROP POLICY IF EXISTS %I ON %I.%I;', pol.policyname, pol.schemaname, pol.tablename);
        EXECUTE drop_stmt;
        
        -- Reemplazar equipos_old_archive por teams
        new_qual := replace(pol.qual, 'equipos_old_archive', 'teams');
        new_with_check := replace(pol.with_check, 'equipos_old_archive', 'teams');
        
        -- Construir CREATE
        create_stmt := format('CREATE POLICY %I ON %I.%I FOR %s TO %s', 
            pol.policyname, pol.schemaname, pol.tablename, pol.cmd, array_to_string(pol.roles, ', '));
            
        IF new_qual IS NOT NULL THEN
            create_stmt := create_stmt || format(' USING (%s)', new_qual);
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            create_stmt := create_stmt || format(' WITH CHECK (%s)', new_with_check);
        END IF;
        
        create_stmt := create_stmt || ';';
        EXECUTE create_stmt;
    END LOOP;
END $$;
