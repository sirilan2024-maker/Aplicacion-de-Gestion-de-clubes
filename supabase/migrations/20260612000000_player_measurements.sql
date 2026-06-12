-- Create player_measurements table
CREATE TABLE IF NOT EXISTS public.player_measurements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    weight NUMERIC,
    height NUMERIC,
    bmi NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS
ALTER TABLE public.player_measurements ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view measurements
CREATE POLICY "Enable read access for all authenticated users" ON public.player_measurements
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert measurements
CREATE POLICY "Enable insert access for all authenticated users" ON public.player_measurements
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update measurements
CREATE POLICY "Enable update access for all authenticated users" ON public.player_measurements
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete measurements
CREATE POLICY "Enable delete access for all authenticated users" ON public.player_measurements
    FOR DELETE USING (auth.role() = 'authenticated');
