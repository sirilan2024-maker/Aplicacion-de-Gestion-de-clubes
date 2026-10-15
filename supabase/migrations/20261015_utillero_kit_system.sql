-- Migración para el sistema de equipaciones y avisos al utillero
-- Agrega columnas a la tabla 'partidos' para gestión de indumentaria y preparación

ALTER TABLE public.partidos 
ADD COLUMN IF NOT EXISTS equipacion_asignada TEXT DEFAULT 'primera' CHECK (equipacion_asignada IN ('primera', 'segunda')),
ADD COLUMN IF NOT EXISTS equipacion_preparada BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rival_camiseta_color TEXT,
ADD COLUMN IF NOT EXISTS conflicto_equipacion BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS equipacion_notas TEXT;

-- Índice para consultas rápidas de partidos y estado de equipación
CREATE INDEX IF NOT EXISTS idx_partidos_equipacion_preparada 
ON public.partidos (fecha_hora, equipacion_preparada);
