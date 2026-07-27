process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testInsert() {
  const matchId = 'a6589b9f-764f-495d-bfa4-2316be8907e1';
  // Insert with service role to see if there's any trigger error
  const { data, error } = await supabase.from('match_events').insert({
    partido_id: matchId,
    event_type: 'gol',
    minuto: 10
  });
  console.log("Service Role Insert:", error || data);
}
testInsert();
