// Test script
const { createClient } = require('@supabase/supabase-js');
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

const supabase = createClient(url, key, { auth: { persistSession: false } });

async function run() {
  // Use service_role to check actual data
  const { data: psh, error: err1 } = await supabase
    .from('player_season_history')
    .select('player_id, team_id, players!inner(id, first_name, last_name)')
    .eq('season_id', '1f95102d-1d00-43fa-9e4c-408681a03e7f')
    .limit(1);
    
  console.log('psh error:', err1);
  console.log('psh data:', psh);
}

run();
