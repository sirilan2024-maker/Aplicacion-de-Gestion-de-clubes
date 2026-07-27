process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('partidos').insert({
    club_id: '7ff5dbeb-2942-4576-8e74-b45a17646fb7',
    equipo_id: '6895bb7b-4c3f-4a78-a2fb-db94f4e5ce50',
    fecha_hora: new Date().toISOString(),
    lugar: 'Test',
    rival_nombre: 'Test',
    estado: 'Programado',
    season_id: '584f508a-fc1a-4339-b5b2-4296ffde2f4c'
  }).select();
  console.log("Insert with Service Role Error:", error);
}
check();
