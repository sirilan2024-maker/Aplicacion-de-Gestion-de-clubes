process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: tables } = await supabase.rpc('run_sql', { sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema='public';" }).catch(()=>({}));
  console.log("Tables (via rpc):", tables);
  
  // Actually, run_sql failed before. Let's do local query:
}
check();
