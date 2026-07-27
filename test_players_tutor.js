process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const playerId = 'c0779d46-1f1b-4aee-9c74-8eadf7d7b05d';
  const { data } = await supabase.from('players').select('id, tutor_id').eq('id', playerId);
  console.log("Player:", data);
}
check();
