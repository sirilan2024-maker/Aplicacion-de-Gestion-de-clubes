CREATE POLICY "Users can view profiles in their club"
ON public.profiles FOR SELECT TO authenticated
USING (club_id = (SELECT club_id FROM public.profiles WHERE id = auth.uid()));
