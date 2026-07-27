process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.rpc('run_sql', { sql_query: "SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename = 'partidos';" }).catch(()=>({}));
  console.log("Policies via RPC:", data);
}
check();
