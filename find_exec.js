process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findExecFuncs() {
  const { data, error } = await supabase.rpc('execute_sql_query', { 
    query_text: "SELECT proname, prosrc FROM pg_proc WHERE prosrc ILIKE '%execute%' AND pronamespace = 'public'::regnamespace" 
  });
  console.log("Exec funcs:", data);
}

findExecFuncs().catch(console.error);
