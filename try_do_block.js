const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function check() {
  const sql = "DO \\\$\\\$ BEGIN ALTER TABLE seasons ADD COLUMN status text DEFAULT 'open'; END \\\$\\\$;";
  const { data, error } = await supabase.rpc('execute_sql_query', { query_text: sql });
  console.log('DO Block:', data, error);
}
check();
