process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRLS() {
  const { data, error } = await supabase.rpc('query_rls', { query: "SELECT tablename, policyname, qual FROM pg_policies WHERE tablename IN ('partidos', 'team_events');" }).catch(() => ({}));
  if(!data) {
     const { data: q } = await supabase.from('_test_rls_query').select('*').limit(0).catch(()=>({}));
     console.log("no rpc");
  }
}
checkRLS();
