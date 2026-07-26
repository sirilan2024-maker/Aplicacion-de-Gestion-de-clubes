-- Drop existing constraint
ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_registration_status_check;

-- Add updated constraint including 'approved' and 'rejected'
ALTER TABLE public.players ADD CONSTRAINT players_registration_status_check 
  CHECK (registration_status IN ('draft', 'pending_revision', 'request_correction', 'pending_payment', 'approved', 'formalized', 'rejected'));
