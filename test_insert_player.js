process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('players').insert({
    first_name: 'TEST',
    last_name: 'REGISTRATION',
    registration_status: 'pending_revision',
    status: 'activo'
  }).select();
  console.log("Insert result:", error || data);
}
check();
