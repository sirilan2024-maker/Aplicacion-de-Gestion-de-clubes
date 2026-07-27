process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: tables, error } = await supabase.rpc('run_sql', { sql_query: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%utill%';" });
  console.log("Utilleria tables:", tables || error);
}
check();
