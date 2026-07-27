process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('_test_rls_query').select('*').limit(0).catch(()=>({}));
  // Using direct sql to check the policy for partidos
  const sql = "SELECT policyname, qual::text FROM pg_policies WHERE tablename = 'partidos';";
  // We don't have rpc for raw sql... wait.
}
check();
