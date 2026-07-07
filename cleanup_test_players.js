const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanUp() {
  const { data: players, error: fetchErr } = await supabase
    .from('players')
    .select('id, first_name, last_name')
    .or('first_name.ilike.%juan%,first_name.ilike.%diego%');
  
  if (fetchErr) {
    console.error("Fetch err:", fetchErr);
    return;
  }
  
  if (!players || players.length === 0) {
    console.log("No players found named Juan or Diego.");
    return;
  }
  
  console.log("Found players:", players.map(p => `${p.first_name} ${p.last_name}`));
  
  for (const p of players) {
    if (p.last_name.toLowerCase().includes('prueba') || p.first_name.toLowerCase().includes('prueba')) {
      console.log(`Deleting ${p.first_name} ${p.last_name} (${p.id})...`);
      await supabase.from('player_season_history').delete().eq('player_id', p.id);
      await supabase.from('player_tutors').delete().eq('player_id', p.id);
      await supabase.from('player_medical_records').delete().eq('player_id', p.id);
      await supabase.from('players').delete().eq('id', p.id);
      console.log(`Deleted ${p.first_name}`);
    }
  }
  console.log("Cleanup complete!");
}
cleanUp();
