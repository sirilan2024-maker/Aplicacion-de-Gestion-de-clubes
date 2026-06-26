const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function check() {
  const sql = "BEGIN; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claim.sub = '017f3f1a-996a-4555-8ee0-daca24db09bb'; SELECT count(*) FROM player_season_history WHERE season_id = '3cc8179e-bae1-4938-8cb2-5992d2e49979'; ROLLBACK;";
  const { data, error } = await supabase.rpc('execute_sql_query', { query_text: sql });
  console.log('Result:', data, error);
}
check();
