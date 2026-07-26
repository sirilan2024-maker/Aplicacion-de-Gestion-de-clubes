INSERT INTO storage.buckets (id, name, public) 
VALUES ('expedientes-doc', 'expedientes-doc', true)
ON CONFLICT (id) DO NOTHING;

-- RLS para expedientes-doc
CREATE POLICY "Admins can view expedientes" 
ON storage.objects FOR SELECT TO authenticated 
USING (bucket_id = 'expedientes-doc' AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'presidente', 'coordinador')));

CREATE POLICY "Users can upload expedientes" 
ON storage.objects FOR INSERT TO authenticated 
WITH CHECK (bucket_id = 'expedientes-doc');
