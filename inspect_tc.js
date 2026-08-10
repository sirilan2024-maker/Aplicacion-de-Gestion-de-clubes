process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function inspectTeamCoaches() {
  const { data, error } = await supabase.rpc('execute_sql_query', { 
    query_text: "SELECT column_name FROM information_schema.columns WHERE table_name = 'team_coaches'" 
  });
  console.log("team_coaches columns:", data, error);
}

inspectTeamCoaches().catch(console.error);
