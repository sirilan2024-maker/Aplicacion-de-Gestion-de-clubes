process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, team_id, teams(id, name)')
    .ilike('first_name', '%PRUEBA FAMILIA%');
    
  console.log(JSON.stringify(data, null, 2));
}
test();
