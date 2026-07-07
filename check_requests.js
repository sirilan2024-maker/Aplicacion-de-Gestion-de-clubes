const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkRequests() {
  const { data: requests, error } = await supabase
    .from('player_requests')
    .select('*');
    
  console.log("Player requests:", requests);
}
checkRequests();
