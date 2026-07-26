GRANT EXECUTE ON FUNCTION public.current_user_club_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_team_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_club_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

-- Also allow anon if needed for any edge case, but usually authenticated is enough for RLS policies
GRANT EXECUTE ON FUNCTION public.current_user_club_id() TO anon;
GRANT EXECUTE ON FUNCTION public.current_user_team_id() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_club_id() TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO anon;
