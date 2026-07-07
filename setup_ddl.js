const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1];
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1];
const supabase = createClient(url, key);

async function check() {
  const sql = "CREATE OR REPLACE FUNCTION execute_ddl(query_text text) RETURNS void AS \\\$\\\$ BEGIN EXECUTE query_text; END; \\\$\\\$ LANGUAGE plpgsql SECURITY DEFINER;";
  const { data, error } = await supabase.rpc('execute_sql_query', { query_text: sql });
  console.log('Setup DDL:', data, error);
}
check();
