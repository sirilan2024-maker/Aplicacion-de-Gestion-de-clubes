process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('pg_policies').select('policyname, tablename, qual').limit(1).catch(()=>({}));
  // Wait, I can't read pg_policies directly via PostgREST! It throws an error PGRST205.
  // Instead, I will just GRANT EXECUTE to all of those functions!
}
check();
