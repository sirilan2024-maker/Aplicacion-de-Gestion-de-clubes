process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('profiles').select('*').eq('email', 'juan@mail.com').single();
  console.log("Profile for juan:", data);
  
  const { data: teamCoaches } = await supabase.from('team_coaches').select('*').eq('profile_id', data?.id);
  console.log("Team Coaches for juan:", teamCoaches);
  
  const { data: tutor } = await supabase.from('players').select('id, first_name, team_id').eq('tutor_id', data?.id);
  console.log("Tutor for players:", tutor);
}
check();
