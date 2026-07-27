process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const playerId = 'c0779d46-1f1b-4aee-9c74-8eadf7d7b05d';
  const { data: pData } = await supabase.from('players').select('team_id, teams(name)').eq('id', playerId).single();
  console.log("Player Team:", pData);
  
  if(pData && pData.team_id) {
    const { data } = await supabase.from('team_events').select('id, title, event_type').eq('team_id', pData.team_id);
    console.log("All Events for Team:", data);
  }
}
check();
