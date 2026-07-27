process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const profileId = 'c1184045-f383-49b3-a93e-0248257b0995'; // Juan's profile ID
  const partidoId = 'a6589b9f-764f-495d-bfa4-2316be8907e1'; // The match the user mentioned
  
  // Create a client authenticated as Juan
  // Wait, I can't easily authenticate as Juan without his token.
  // Instead, I'll test the policy condition using an RPC or service role.
  
  const { data } = await supabase.rpc('run_sql', { 
    sql_query: "SELECT EXISTS (SELECT 1 FROM public.partidos p JOIN public.team_coaches tc ON tc.team_id = p.equipo_id WHERE p.id = 'a6589b9f-764f-495d-bfa4-2316be8907e1' AND tc.profile_id = 'c1184045-f383-49b3-a93e-0248257b0995') as can_edit;"
  }).catch(()=>({}));
  console.log("Can Juan edit?", data);
}
check();
