const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
let url = '', key = '';
for (const line of envLines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

const supabase = createClient(url, key);

async function check() {
  const { data: teams } = await supabase.from('teams').select('id, name, season');
  const counts = teams.reduce((acc, t) => { acc[t.season] = (acc[t.season] || 0) + 1; return acc; }, {});
  console.log('Teams count by season:', counts);

  const { data: players } = await supabase.from('players').select('id, team_id');
  const teamPlayerCounts = players.reduce((acc, p) => { acc[p.team_id] = (acc[p.team_id] || 0) + 1; return acc; }, {});
  
  const seasonPlayerCounts = {};
  for (const t of teams) {
    if (!seasonPlayerCounts[t.season]) seasonPlayerCounts[t.season] = 0;
    seasonPlayerCounts[t.season] += (teamPlayerCounts[t.id] || 0);
  }
  console.log('Players count by season:', seasonPlayerCounts);
}

check();
