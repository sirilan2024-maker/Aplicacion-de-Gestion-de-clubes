ALTER TABLE public.equipos
  ADD COLUMN sport TEXT NOT NULL DEFAULT 'Fútbol',
  ADD COLUMN gender TEXT NOT NULL DEFAULT 'Masculino',
  ADD COLUMN age_group TEXT NOT NULL DEFAULT 'Senior',
  ADD COLUMN format TEXT NOT NULL DEFAULT '11 contra 11',
  ADD COLUMN color TEXT NOT NULL DEFAULT '#1E40AF',
  ADD COLUMN club_id UUID NOT NULL; -- assuming clubs.id is UUID

-- Enable RLS if not already
ALTER TABLE public.equipos ENABLE ROW LEVEL SECURITY;

-- SELECT policy for owners
CREATE POLICY "equipos_select_owner"
  ON public.equipos
  FOR SELECT
  USING (club_id = auth.uid());

-- UPDATE policy for owners
CREATE POLICY "equipos_update_owner"
  ON public.equipos
  FOR UPDATE
  USING (club_id = auth.uid())
  WITH CHECK (club_id = auth.uid());

-- DELETE policy for owners
CREATE POLICY "equipos_delete_owner"
  ON public.equipos
  FOR DELETE
  USING (club_id = auth.uid());
