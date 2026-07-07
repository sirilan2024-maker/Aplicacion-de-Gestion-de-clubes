const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data: players, error } = await supabase.from('players').select('*').order('created_at', { ascending: false }).limit(5);
  const { data: history, error: hError } = await supabase.from('player_season_history').select('*').order('created_at', { ascending: false }).limit(5);
  console.log("PLAYERS ERR:", error);
  console.log("HISTORY ERR:", hError);
  console.log("PLAYERS:", players?.map(p => p.first_name));
}
run();
