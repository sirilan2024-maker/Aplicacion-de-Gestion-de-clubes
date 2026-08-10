process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectFunc() {
  const { data, error } = await supabase.rpc('execute_sql_query', { query_text: 'SELECT 1 as test' });
  console.log("SELECT 1 res:", { data, error });

  // Get function definition
  const { data: def, error: defErr } = await supabase.rpc('execute_sql_query', { 
    query_text: "SELECT prosrc FROM pg_proc WHERE proname = 'execute_sql_query'" 
  });
  console.log("Def res:", { def, defErr });
}

inspectFunc().catch(console.error);
