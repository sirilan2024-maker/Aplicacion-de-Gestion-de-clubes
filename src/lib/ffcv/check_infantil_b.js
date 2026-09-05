process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../../../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

function getEnv(key) {
  const line = envContent.split(/\r?\n/).find(l => l.startsWith(key + '='));
  if (!line) return null;
  return line.substring(key.length + 1).trim().replace(/^["']|["']$/g, '');
}

const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
const supabase = createClient(url, key);

async function checkInfantilB() {
  const { data: teams } = await supabase.from('teams').select('*').ilike('name', '%Infantil B%');
  const teamId = teams[0].id;
  const { data: players } = await supabase.from('players').select('*').eq('team_id', teamId);
  console.log(`Infantil B players in DB (${players.length}):`);
  players.forEach(p => console.log(` - ID: ${p.id} | ${p.first_name} ${p.last_name} | Dorsal: ${p.dorsal}`));
}

checkInfantilB();
