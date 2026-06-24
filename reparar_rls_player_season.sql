-- Script para arreglar RLS en player_season_history
DROP POLICY IF EXISTS "Enable insert for club members" ON public.player_season_history;
DROP POLICY IF EXISTS "Enable update for club members" ON public.player_season_history;
DROP POLICY IF EXISTS "Enable delete for club members" ON public.player_season_history;
DROP POLICY IF EXISTS "Enable read for club members" ON public.player_season_history;

CREATE POLICY "Enable read for club members" ON public.player_season_history FOR SELECT TO authenticated
USING ( club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()) );

CREATE POLICY "Enable insert for club members" ON public.player_season_history FOR INSERT TO authenticated
WITH CHECK ( club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()) );

CREATE POLICY "Enable update for club members" ON public.player_season_history FOR UPDATE TO authenticated
USING ( club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()) )
WITH CHECK ( club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()) );

CREATE POLICY "Enable delete for club members" ON public.player_season_history FOR DELETE TO authenticated
USING ( club_id IN (SELECT club_id FROM public.profiles WHERE id = auth.uid()) );
