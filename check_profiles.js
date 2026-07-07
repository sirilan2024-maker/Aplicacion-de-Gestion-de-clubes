const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkProfiles() {
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, role');
    
  console.log("Profiles:", profiles);
}
checkProfiles();
