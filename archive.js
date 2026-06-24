const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qjjfgncvtpshddqlxbdx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqamZnbmN2dHBzaGRkcWx4YmR4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM0MTE3MCwiZXhwIjoyMDkzOTE3MTcwfQ.CoaAMaMp4NIr7K0HAjyB7K9EAIrW_NNMh-VxcCuEa_Q';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching active season...');
  const { data: activeSeason, error: seasonErr } = await supabase.from('seasons').select('id').eq('is_active', true).single();
  if (seasonErr) { console.error('Error fetching season:', seasonErr); return; }
  console.log('Active season ID:', activeSeason.id);
  
  const { data: oldTeams } = await supabase.from('teams').select('id').neq('season_id', activeSeason.id);
  if (!oldTeams || oldTeams.length === 0) { console.log('No old teams found.'); return; }
  const oldTeamIds = oldTeams.map(t => t.id);
  console.log('Found ' + oldTeamIds.length + ' old teams.');
  
  const { data: playersToUpdate } = await supabase.from('players').select('id, first_name').in('team_id', oldTeamIds).neq('status', 'inactive').neq('status', 'archived');
  if (!playersToUpdate || playersToUpdate.length === 0) { console.log('No players to update.'); return; }
  console.log('Found ' + playersToUpdate.length + ' players to archive. Updating...');
  
  const playerIds = playersToUpdate.map(p => p.id);
  
  const { error: updateErr } = await supabase.from('players').update({ status: 'inactive', team_id: null }).in('id', playerIds);
  if (updateErr) { console.error('Error updating players:', updateErr); }
  else { console.log('Successfully archived ' + playerIds.length + ' players.'); }
}

run();
