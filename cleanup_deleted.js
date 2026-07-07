const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanUp() {
  const { data: players } = await supabase.from('players').select('id, first_name').like('first_name', '[ELIMINADO]%');
  
  if (!players || players.length === 0) {
    console.log("No deleted players found.");
    return;
  }
  
  for (const p of players) {
    console.log(`Deleting ${p.first_name} (${p.id})...`);
    await supabase.from('player_season_history').delete().eq('player_id', p.id);
    await supabase.from('player_tutors').delete().eq('player_id', p.id);
    await supabase.from('player_medical_records').delete().eq('player_id', p.id);
    await supabase.from('players').delete().eq('id', p.id);
  }
  console.log("Cleanup complete!");
}
cleanUp();
