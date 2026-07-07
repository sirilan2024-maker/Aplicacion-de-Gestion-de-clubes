-- Conceder permisos de ejecución a las funciones de seguridad
GRANT EXECUTE ON FUNCTION public.current_user_club_id() TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.is_tutor_of_player(uuid) TO authenticated, anon, public;
GRANT EXECUTE ON FUNCTION public.is_admin_of_player_club(uuid) TO authenticated, anon, public;
