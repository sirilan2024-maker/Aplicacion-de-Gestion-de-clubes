-- Migration: Create apparel stock table
CREATE TABLE IF NOT EXISTS public.apparel_stock (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name TEXT NOT NULL,
  size TEXT NOT NULL,
  stock INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_apparel_stock UNIQUE(item_name, size)
);

ALTER TABLE public.apparel_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can select apparel stock" ON public.apparel_stock 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and utilleros can manage stock" ON public.apparel_stock 
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'coordinador', 'utillero'))
  );
