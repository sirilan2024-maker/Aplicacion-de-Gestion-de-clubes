process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const teamId = 'e1be067f-2b93-4aac-969a-55c7c71badb9';
  
  const { data: p } = await supabase.from('partidos').select('id, rival_nombre, fecha_hora').eq('equipo_id', teamId);
  console.log('Partidos para CADETE A:', p);
  
  const { data: e } = await supabase.from('team_events').select('id, title, date').eq('team_id', teamId);
  console.log('Eventos para CADETE A:', e);
}
check();
