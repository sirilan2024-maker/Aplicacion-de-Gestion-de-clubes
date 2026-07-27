process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, team_id, teams(id, name)')
    .eq('id', 'c0779d46-1f1b-4aee-9c74-8eadf7d7b05d');
    
  console.log(JSON.stringify(data, null, 2));
}
test();
