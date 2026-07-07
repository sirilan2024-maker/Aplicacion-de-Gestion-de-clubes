const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: '.env.local'});
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testFamilyPageQuery() {
  const { data: playersInfo, error } = await supabase
    .from("players")
    .select(`
      id, first_name, last_name, avatar_url, dorsal, posicion,
      teams (id, name)
    `)
    .in("id", ['e35a4248-edad-4f3d-abcd-fb4d2269ad70'])
    .neq("status", "inactive");
    
  console.log("Family page query result:", JSON.stringify(playersInfo, null, 2));
  console.log("Error:", error);
}
testFamilyPageQuery();
