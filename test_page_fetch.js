process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const playerId = 'c0779d46-1f1b-4aee-9c74-8eadf7d7b05d';
  
  const { data: pData, error: pError } = await supabase
        .from('players')
        .select('team_id, teams(name)')
        .eq('id', playerId)
        .single();
  
  console.log("Player:", pData);
  
  if(pData && pData.team_id) {
    const { data: mData, error: mError } = await supabase
          .from('partidos')
          .select('*, equipo:teams(id, name, color)')
          .eq('equipo_id', pData.team_id)
          .order('fecha_hora', { ascending: false });
          
    console.log("Matches count:", mData ? mData.length : mError);
  }
}
check();
