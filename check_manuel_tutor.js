const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkManuelTutor() {
  const { data: tutors, error } = await supabase
    .from('player_tutors')
    .select('player_id, tutor_id')
    .eq('player_id', 'e35a4248-edad-4f3d-abcd-fb4d2269ad70');
    
  console.log("Manuel tutors:", tutors);
}
checkManuelTutor();
