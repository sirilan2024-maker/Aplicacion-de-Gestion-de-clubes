const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkManuel() {
  const { data: players, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, status')
    .ilike('first_name', '%manuel%');
    
  console.log("Manuel players:", players);
}
checkManuel();
