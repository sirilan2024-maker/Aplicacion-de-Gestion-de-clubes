const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase
    .from('players')
    .select('id, first_name, last_name, registration_status, created_at, club_id')
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('Recent players:', data);
  if (error) console.error('Error:', error);
}

check();
