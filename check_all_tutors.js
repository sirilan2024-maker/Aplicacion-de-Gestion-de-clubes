const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkUserTutors() {
  const { data: tutors, error } = await supabase
    .from('player_tutors')
    .select('player_id, players(first_name, last_name)')
    .eq('tutor_id', '6de85187-51cf-4a7c-b52c-7c8a1786e373');
    
  console.log("All players linked to this tutor:", tutors);
}
checkUserTutors();
