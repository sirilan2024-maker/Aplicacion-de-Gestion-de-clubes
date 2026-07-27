process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data } = await supabase.from('pg_policies').select('policyname, tablename, cmd, qual, with_check').eq('tablename', 'partidos');
  // PGREST doesn't expose pg_policies, so I must do this via db query
}
check();
