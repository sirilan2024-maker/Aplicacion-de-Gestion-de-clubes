const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function checkErr(promise, name) {
  const { data, error } = await promise;
  if (error) console.error('Error deleting ' + name + ':', error.message);
  return data;
}

async function resetClubProperly() {
  const clubId = '7ff5dbeb-2942-4576-8e74-b45a17646fb7';
  console.log('Properly starting reset for club: ' + clubId);

  // 1. Delete player_training_metrics
  const { data: metrics } = await supabase.from('player_training_metrics').select('id');
  console.log('Deleting ' + (metrics ? metrics.length : 0) + ' training metrics...');
  for (const m of metrics || []) await checkErr(supabase.from('player_training_metrics').delete().eq('id', m.id), 'training metrics');

  // 2. Delete attendance
  const { data: atts } = await supabase.from('attendance').select('id');
  console.log('Deleting ' + (atts ? atts.length : 0) + ' attendance records...');
  for (const a of atts || []) await checkErr(supabase.from('attendance').delete().eq('id', a.id), 'attendance');

  // 3. Delete player_season_history
  const { data: history } = await supabase.from('player_season_history').select('id').eq('club_id', clubId);
  console.log('Deleting ' + (history ? history.length : 0) + ' player history records...');
  for (const h of history || []) await checkErr(supabase.from('player_season_history').delete().eq('id', h.id), 'history');

  // 4. Delete partidos
  const { data: partidos } = await supabase.from('partidos').select('id, equipo_id');
  console.log('Deleting ' + (partidos ? partidos.length : 0) + ' partidos...');
  for (const p of partidos || []) await checkErr(supabase.from('partidos').delete().eq('id', p.id), 'partidos');

  // 5. Delete team_events
  const { data: events } = await supabase.from('team_events').select('id');
  console.log('Deleting ' + (events ? events.length : 0) + ' team events...');
  for (const e of events || []) await checkErr(supabase.from('team_events').delete().eq('id', e.id), 'team_events');

  // 6. Delete teams
  const { data: teams } = await supabase.from('teams').select('id').eq('club_id', clubId);
  console.log('Deleting ' + (teams ? teams.length : 0) + ' teams...');
  for (const t of teams || []) await checkErr(supabase.from('teams').delete().eq('id', t.id), 'teams');

  // 7. Delete players
  const { data: players } = await supabase.from('players').select('id').eq('club_id', clubId);
  console.log('Deleting ' + (players ? players.length : 0) + ' players...');
  for (const p of players || []) await checkErr(supabase.from('players').delete().eq('id', p.id), 'players');

  // 8. Delete non-admin profiles
  const { data: profiles } = await supabase.from('profiles').select('id').eq('club_id', clubId).neq('role', 'admin');
  console.log('Deleting ' + (profiles ? profiles.length : 0) + ' non-admin profiles...');
  for (const p of profiles || []) await checkErr(supabase.from('profiles').delete().eq('id', p.id), 'profiles');

  // 9. Fix seasons
  const { data: seasons } = await supabase.from('seasons').select('id, name').eq('club_id', clubId);
  for (const s of seasons || []) {
    if (s.name !== '25/26') {
      console.log('Deleting season ' + s.name + '...');
      await checkErr(supabase.from('seasons').delete().eq('id', s.id), 'seasons');
    } else {
      console.log('Activating season 25/26...');
      await checkErr(supabase.from('seasons').update({ is_active: true }).eq('id', s.id), 'seasons update');
    }
  }

  console.log('Proper reset complete!');
}
resetClubProperly();
