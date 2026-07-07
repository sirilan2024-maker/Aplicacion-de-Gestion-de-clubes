const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testQueryWithoutTeam() {
  const { data: tutors, error } = await supabase
    .from('player_tutors')
    .select('player_id, players!inner(first_name, last_name, status, teams(id, name))');
    
  console.log("All tutors with !inner:", JSON.stringify(tutors, null, 2));
}
testQueryWithoutTeam();
