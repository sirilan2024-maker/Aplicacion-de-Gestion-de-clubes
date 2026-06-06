-- 1. Añadir nuevas columnas a la tabla 'players'
ALTER TABLE public.players
ADD COLUMN IF NOT EXISTS nickname TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS height DECIMAL,
ADD COLUMN IF NOT EXISTS weight DECIMAL,
ADD COLUMN IF NOT EXISTS arrival_year INTEGER,
ADD COLUMN IF NOT EXISTS jersey_number INTEGER;

-- Nota: 'position' ya existe en tu tabla como 'posicion' y 'posicion_principal', así que usaremos 'posicion' para evitar duplicidades, pero podemos sincronizarlo.
-- 'dorsal' también existe, así que usaremos 'jersey_number' para coincidir con tu JSON o simplemente mapearlo a 'dorsal' en el script.

-- 2. Crear la tabla de asistencia (attendance)
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('Presente', 'Ausente', 'Justificado', 'Lesionado')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS en attendance
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de seguridad para attendance (Acceso a todos los usuarios autenticados para simplificar en la app del club)
CREATE POLICY "Permitir acceso total a attendance a usuarios autenticados" 
ON public.attendance 
AS PERMISSIVE FOR ALL 
TO authenticated 
USING (true)
WITH CHECK (true);
