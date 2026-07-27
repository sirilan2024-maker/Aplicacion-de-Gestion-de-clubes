SELECT policyname, tablename, qual FROM pg_policies 
WHERE qual LIKE '%current_user_club_id%' 
   OR qual LIKE '%current_user_team_id%' 
   OR qual LIKE '%get_user_club_id%' 
   OR qual LIKE '%get_user_role%';
