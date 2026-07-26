-- ==========================================
-- GESTION DE GASTOS (TESORERIA)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concept TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  category TEXT NOT NULL CHECK (category IN ('Arbitrajes', 'Material', 'Instalaciones', 'FFCV', 'Suministros', 'Otros')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Expenses viewable by admins') THEN
        CREATE POLICY "Expenses viewable by admins" ON public.expenses FOR SELECT TO authenticated USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'presidente'))
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Expenses manageable by admins') THEN
        CREATE POLICY "Expenses manageable by admins" ON public.expenses FOR ALL TO authenticated USING (
          EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'presidente'))
        );
    END IF;
END $$;
