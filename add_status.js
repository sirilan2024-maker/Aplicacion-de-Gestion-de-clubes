const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function check() {
  const sql = "ALTER TABLE seasons ADD COLUMN IF NOT EXISTS status text DEFAULT 'open'; UPDATE seasons SET status = 'open' WHERE is_active = true; UPDATE seasons SET status = 'closed' WHERE is_active = false;";
  const { data, error } = await supabase.rpc('execute_sql_query', { query_text: sql });
  console.log('Migration:', data, error);
}
check();
