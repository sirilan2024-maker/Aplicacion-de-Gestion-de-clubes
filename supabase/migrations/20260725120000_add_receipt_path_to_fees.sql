-- Add receipt_path to fees for storing PDF receipt storage path
ALTER TABLE public.fees
  ADD COLUMN IF NOT EXISTS receipt_path TEXT;
