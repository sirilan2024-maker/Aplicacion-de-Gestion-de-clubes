process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const teamId = '6895bb7b-4c3f-4a78-a2fb-db94f4e5ce50';
  const { data } = await supabase.from('teams').select('*').eq('id', teamId).single();
  console.log("Team:", data);
}
check();
