require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);


async function run() {
  const { data, error } = await supabase.rpc('exec_sql', { 
    sql: "SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'players';" 
  });
  console.log("RLS Policies for players:", JSON.stringify(data, null, 2));
  console.log("Error:", error);
}

run();
