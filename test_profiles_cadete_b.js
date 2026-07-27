process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('profiles').select('id, email, rol, role, team_id, club_id').eq('team_id', '6895bb7b-4c3f-4a78-a2fb-db94f4e5ce50');
  console.log("Profiles for Cadete B:", data);
}
check();
