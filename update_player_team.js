process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const playerId = 'c0779d46-1f1b-4aee-9c74-8eadf7d7b05d';
  const cadeteBId = '6895bb7b-4c3f-4a78-a2fb-db94f4e5ce50';
  
  const { data, error } = await supabase.from('players').update({ team_id: cadeteBId }).eq('id', playerId);
  console.log("Update Error:", error);
}
check();
