process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data: p } = await supabase.from('partidos').select('*').limit(1);
  console.log('Partidos:', p);
  
  const { data: e } = await supabase.from('team_events').select('*').limit(1);
  console.log('Events:', e);
}
test();
