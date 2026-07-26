-- Drop existing constraint
ALTER TABLE public.fees DROP CONSTRAINT IF EXISTS fees_estado_check;

-- Create new constraint including pending_verification
ALTER TABLE public.fees ADD CONSTRAINT fees_estado_check 
CHECK (estado IN ('pendiente', 'pagado', 'cancelado', 'pendiente_verificacion'));
