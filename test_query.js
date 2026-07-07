require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
process.env.NODE_TLS_REJECT_UNAUTHORIZED='0';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
  const { data: { session } } = await supabase.auth.signInWithPassword({ email: 'salah@gmail.com', password: 'prueba2026' });
  const user = session.user;
  const clubId = '7ff5dbeb-2942-4576-8e74-b45a17646fb7';
  const activeSeasonId = '584f508a-fc1a-4339-b5b2-4296ffde2f4c';
  
  const { data: coachTeams } = await supabase.from('team_coaches').select('team_id').eq('profile_id', user.id);
  const teamIds = coachTeams?.map(ct => ct.team_id) || [];
  
  let query = supabase.from('teams').select('id, name, category, color, team_coaches(count), player_season_history(status, season_id, players(posicion))').eq('club_id', clubId).eq('season_id', activeSeasonId).order('name');
  
  if (teamIds.length > 0) {
    query = query.or(`coach_id.eq.${user.id},id.in.(${teamIds.join(',')})`);
  } else {
    query = query.eq('coach_id', user.id);
  }
  
  const { data, error } = await query;
  console.log('Teams data length:', data?.length);
  if (error) console.log('Error:', error);
})();
