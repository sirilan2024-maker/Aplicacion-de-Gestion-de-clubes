process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase
          .from('partidos')
          .select('*, equipo:teams(id, name, color)')
          .limit(1);
  console.log(error ? 'Error: ' + error.message : 'Success');
}
check();
