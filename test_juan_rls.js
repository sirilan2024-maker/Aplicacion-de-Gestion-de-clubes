process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const profileId = 'c1184045-f383-49b3-a93e-0248257b0995'; // Juan
  
  // Test if Juan can see the match
  const { data: m1 } = await supabase.rpc('run_sql', {
    sql_query: "SELECT id FROM public.partidos WHERE id = 'a6589b9f-764f-495d-bfa4-2316be8907e1';"
  }).catch(()=>({}));
  
  // Actually, I can just write a quick PL/pgSQL block to test RLS as Juan!
}
check();
