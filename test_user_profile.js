process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('profiles').select('id, email, rol, role, team_id, club_id').eq('email', 'sirilan2024@gmail.com').single();
  console.log("Admin Profile:", data);
  // Wait, is the user using 'sirilan2024@gmail.com' as coach?
  // They said "estoy en vista entrenador http://localhost:3000/dashboard/equipos/6895bb7b-4c3f-4a78-a2fb-db94f4e5ce50/partidos"
}
check();
