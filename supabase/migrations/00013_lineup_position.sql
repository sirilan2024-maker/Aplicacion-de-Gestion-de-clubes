-- =====================================================
-- Módulo 4 Ext: Posición táctica en convocatorias
-- =====================================================
-- Añade dos columnas a convocatorias:
--   posicion_tactica : código corto de posición (POR, LD, DC, etc.)
--   slot_index       : índice del slot en la formación elegida (0-10)
-- No se necesitan cambios en RLS: hereda las políticas existentes.

ALTER TABLE public.convocatorias
  ADD COLUMN IF NOT EXISTS posicion_tactica TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS slot_index INTEGER DEFAULT NULL;

COMMENT ON COLUMN public.convocatorias.posicion_tactica IS 
  'Código de posición táctica en el campo (POR, LD, DC, LI, MCD, MC, MD, MI, MP, ED, EI, DC1, DC2…)';

COMMENT ON COLUMN public.convocatorias.slot_index IS 
  'Índice 0-10 del slot en la formación seleccionada por el entrenador';
