require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const sql = `
    CREATE POLICY "Allow public read access to partidos" ON "public"."partidos" FOR SELECT USING (true);
    CREATE POLICY "Allow public read access to match_events" ON "public"."match_events" FOR SELECT USING (true);
    CREATE POLICY "Allow public read access to teams" ON "public"."teams" FOR SELECT USING (true);
    CREATE POLICY "Allow public read access to players" ON "public"."players" FOR SELECT USING (true);
  `;
  
  console.log("Running SQL...");
  const { data, error } = await supabase.rpc('execute_sql_query', { sql_query: sql });
  if (error) {
    console.error("RPC exec_sql might not exist. Trying via REST API or direct SQL...");
    console.error(error);
  } else {
    console.log("Success:", data);
  }
}
run();
