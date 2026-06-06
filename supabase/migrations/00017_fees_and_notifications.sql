-- 00017_fees_and_notifications.sql
-- ====================================
-- Tables for club fees (treasury) and user notifications
-- ====================================

CREATE TABLE IF NOT EXISTS public.fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  concept text NOT NULL,                -- e.g., 'Cuota mensual', 'Inscripción torneo'
  amount numeric(10,2) NOT NULL,
  status text NOT NULL CHECK (status IN ('pending','paid','canceled')),
  due_date date NOT NULL,
  stripe_session_id text,
  stripe_subscription_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fees_profile ON public.fees (profile_id);

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  read boolean DEFAULT FALSE,
  match_id uuid REFERENCES public.partidos(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile ON public.notifications (profile_id);

-- RLS for fees
CREATE POLICY select_fees_admin ON public.fees
  FOR SELECT USING (auth.role() = ANY(ARRAY['admin','entrenador']));

CREATE POLICY select_fees_owner ON public.fees
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY insert_fees_owner ON public.fees
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY update_fees_owner ON public.fees
  FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- RLS for notifications
CREATE POLICY select_notifications_owner ON public.notifications
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY insert_notifications_owner ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

CREATE POLICY update_notifications_owner ON public.notifications
  FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
