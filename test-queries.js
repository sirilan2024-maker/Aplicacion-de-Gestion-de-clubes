const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'juan@mail.com',
    password: 'juan2026'
  });
  
  if (authErr) {
    console.error('Login error:', authErr.message);
    return;
  }

  const playerId = 'a2f7c099-1eaf-43f9-979f-ec650df9fdef'; // Juan's player ID
  console.log('--- Query 1 ---');
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('team_id, teams(name)')
    .eq('id', playerId)
    .single();
    
  if (playerError) {
    console.error('Error 1:', playerError.message);
  } else {
    console.log('Success 1. Team ID:', player.team_id);
    
    console.log('--- Query 2 ---');
    const { data: roster, error: rosterError } = await supabase
      .from('players')
      .select('id, first_name, last_name, nickname, avatar_url, posicion_principal, dorsal, birth_date')
      .eq('team_id', player.team_id)
      .order('first_name');
      
    if (rosterError) {
      console.error('Error 2:', rosterError.message);
    } else {
      console.log('Success 2. Roster count:', roster.length);
    }
  }
}

test();
