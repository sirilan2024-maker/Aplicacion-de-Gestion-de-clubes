const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');

const lines = env.split('\n');
let key = '', url = '', collecting = false;
for(const line of lines) {
  if(line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.replace('NEXT_PUBLIC_SUPABASE_URL=', '').trim();
  if(line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) { key = line.replace('SUPABASE_SERVICE_ROLE_KEY=', '').trim(); collecting = true; }
  else if(collecting && !line.includes('=') && line.trim() && !line.startsWith('#')) key += line.trim();
  else if(collecting && (line.includes('=') || line.startsWith('#'))) collecting = false;
}

const { createClient } = require('@supabase/supabase-js');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  const { data: equipos } = await supabase.from('equipos').select('id, name');
  const { data: teams } = await supabase.from('teams').select('id, name');
  
  let mapped = 0;
  
  for (const eq of equipos) {
    const matchingTeam = teams.find(t => t.name.toLowerCase() === eq.name.toLowerCase());
    
    if (matchingTeam) {
      console.log(`Mapping '${eq.name}' (${eq.id}) -> '${matchingTeam.name}' (${matchingTeam.id})`);
      
      const { data: playersToUpdate } = await supabase.from('players').select('id').eq('team_id', eq.id);
      
      if (playersToUpdate && playersToUpdate.length > 0) {
        const { error } = await supabase.from('players').update({ team_id: matchingTeam.id }).eq('team_id', eq.id);
        if (error) {
           console.error('Error updating players for team', eq.name, error);
        } else {
           console.log(`Updated ${playersToUpdate.length} players!`);
           mapped += playersToUpdate.length;
        }
      }
    } else {
      console.log(`NO MATCH FOR: '${eq.name}' (${eq.id})`);
      const { data: playersToUpdate } = await supabase.from('players').select('id').eq('team_id', eq.id);
      if (playersToUpdate && playersToUpdate.length > 0) {
        await supabase.from('players').update({ team_id: null }).eq('team_id', eq.id);
        console.log(`Set ${playersToUpdate.length} players to NULL team_id.`);
      }
    }
  }
  
  console.log('Total players updated:', mapped);
}

run();
