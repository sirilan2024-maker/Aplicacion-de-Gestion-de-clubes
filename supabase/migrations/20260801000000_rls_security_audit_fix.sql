-- ============================================================
-- 20260801000000_rls_security_audit_fix.sql
-- Auditoria de Seguridad RLS: Corrección de fugas de datos
-- ============================================================

DO $$ 
BEGIN

    -- 1. Asegurar que vista_entrenadores respeta RLS (Security Invoker)
    -- Si no, un entrenador podría ver info médica y alergias de TODOS los jugadores.
    EXECUTE 'ALTER VIEW public.vista_entrenadores SET (security_invoker = true);';

    -- 2. Corregir política de Fees (Cuotas)
    -- La política anterior usaba auth.role() = ANY(ARRAY['admin','entrenador'])
    -- auth.role() en JWT siempre es 'authenticated'. Además, un entrenador no debe ver cuotas.
    DROP POLICY IF EXISTS "select_fees_admin" ON public.fees;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'select_fees_admin_fixed') THEN
        CREATE POLICY "select_fees_admin_fixed" ON public.fees
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE profiles.id = auth.uid() AND role IN ('admin', 'presidente', 'secretaria')
            )
        );
    END IF;

    -- 3. Corregir políticas de Registrations (Inscripciones)
    -- Las políticas anteriores incluían 'entrenador', permitiéndoles ver datos de pago, notas del admin y DNI.
    DROP POLICY IF EXISTS "Admins can view registrations for their club" ON public.registrations;
    DROP POLICY IF EXISTS "Admins can manage registrations for their club" ON public.registrations;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view registrations for their club fixed') THEN
        CREATE POLICY "Admins can view registrations for their club fixed"
            ON public.registrations FOR SELECT
            USING (EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('admin', 'secretaria', 'presidente')
                AND club_id = registrations.club_id
            ));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage registrations for their club fixed') THEN
        CREATE POLICY "Admins can manage registrations for their club fixed"
            ON public.registrations FOR ALL
            USING (EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role IN ('admin', 'secretaria', 'presidente')
                AND club_id = registrations.club_id
            ));
    END IF;

END $$;
