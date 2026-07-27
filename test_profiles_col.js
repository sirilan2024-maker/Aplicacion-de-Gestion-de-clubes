process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  try {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    console.log("Profiles columns:", data && data.length > 0 ? Object.keys(data[0]) : "No data");
  } catch (e) { console.error(e); }
}
check();
