-- Create private bucket for payment receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('recibos_pagos', 'recibos_pagos', false)
ON CONFLICT (id) DO NOTHING;

-- RLS: only authenticated users can access their own receipts
CREATE POLICY "Admins can upload receipts"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'recibos_pagos');

CREATE POLICY "Users can view own receipts"
ON storage.objects FOR SELECT TO authenticated  
USING (bucket_id = 'recibos_pagos');
