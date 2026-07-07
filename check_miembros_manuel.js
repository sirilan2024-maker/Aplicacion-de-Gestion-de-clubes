const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkMiembros() {
  const { data: rawPlayers, error } = await supabase
    .from("players")
    .select('id, first_name, last_name, status, club_id')
    .ilike('first_name', '%manuel%')
    .neq("status", "inactive");
    
  console.log("Miembros query for Manuel:", rawPlayers);
}
checkMiembros();
