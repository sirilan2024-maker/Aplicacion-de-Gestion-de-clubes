const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const supabase = createClient(url, key);

async function runMigration() {
  const sql = `
    ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS dni text,
    ADD COLUMN IF NOT EXISTS birth_date date,
    ADD COLUMN IF NOT EXISTS license_number text;
    
    NOTIFY pgrst, 'reload schema';
  `;
  const { data, error } = await supabase.rpc('execute_sql_query', { query_text: sql });
  console.log('Migration Result:', data, error);
}
runMigration();
