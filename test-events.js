const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envLines = fs.readFileSync('.env.local', 'utf-8').split('\n');
let url = '', key = '';
for (const line of envLines) {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim().replace(/['"]/g, '');
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim().replace(/['"]/g, '');
}

const supabase = createClient(url, key);

async function check() {
  const { data } = await supabase.from('match_events').select('*').limit(5);
  console.log('match_events data:', data);
  const { data: cols } = await supabase.rpc('execute_sql_query', { query_text: "SELECT column_name FROM information_schema.columns WHERE table_name = 'match_events'" });
  console.log('match_events cols:', cols);
}

check();
