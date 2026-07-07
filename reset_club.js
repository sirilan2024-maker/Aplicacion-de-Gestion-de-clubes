const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function resetClub() {
  const clubId = '7ff5dbeb-2942-4576-8e74-b45a17646fb7';
  console.log('Starting reset for club: ' + clubId);

  // 1. Delete all non-admin profiles (coaches, staff, players if any are linked)
  const { data: profilesToDelete, error: err1 } = await supabase.from('profiles').select('id').eq('club_id', clubId).neq('role', 'admin');
  if (err1) { console.error('Error fetching profiles:', err1); return; }
  console.log('Found profiles to delete: ' + profilesToDelete.length);
  for (const p of profilesToDelete) {
    await supabase.from('profiles').delete().eq('id', p.id);
  }

  // 2. Delete all players for this club
  const { data: players, error: err2 } = await supabase.from('players').select('id').eq('club_id', clubId);
  if (err2) { console.error('Error fetching players:', err2); return; }
  console.log('Found players to delete: ' + players.length);
  for (const p of players) {
    await supabase.from('players').delete().eq('id', p.id);
  }

  // 3. Delete all teams for this club
  const { data: teams, error: err3 } = await supabase.from('teams').select('id').eq('club_id', clubId);
  if (err3) { console.error('Error fetching teams:', err3); return; }
  console.log('Found teams to delete: ' + teams.length);
  for (const t of teams) {
    await supabase.from('teams').delete().eq('id', t.id);
  }

  // 4. Delete the 26/27 season
  const { data: seasons, error: err4 } = await supabase.from('seasons').select('id, name').eq('club_id', clubId);
  if (err4) { console.error('Error fetching seasons:', err4); return; }
  const season2627 = seasons.find(s => s.name === '26/27');
  if (season2627) {
    console.log('Deleting season 26/27 with ID: ' + season2627.id);
    await supabase.from('seasons').delete().eq('id', season2627.id);
  }

  // 5. Make sure the 25/26 season is active
  const season2526 = seasons.find(s => s.name === '25/26');
  if (season2526) {
    console.log('Setting season 25/26 as active...');
    await supabase.from('seasons').update({ is_active: true }).eq('id', season2526.id);
  }

  console.log('Reset complete!');
}
resetClub();
