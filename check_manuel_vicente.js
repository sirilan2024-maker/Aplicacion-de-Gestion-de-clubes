const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkAllManuels() {
  const { data: tutors, error } = await supabase
    .from('player_tutors')
    .select('player_id, tutor_id')
    .eq('player_id', 'cda17921-d6cf-4078-a645-8d0c512328d8');
    
  console.log("Manuel Vicente Caracena tutors:", tutors);
}
checkAllManuels();
