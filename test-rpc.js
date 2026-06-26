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
  const query = `
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position
  `;
  const { data, error } = await supabase.rpc('execute_sql_query', { query_text: query });
  if (error) {
    console.error('ERROR RPC:', error);
  } else {
    // Group by table_name
    const schema = {};
    for (const row of data) {
      if (!schema[row.table_name]) schema[row.table_name] = [];
      schema[row.table_name].push(`${row.column_name}`);
    }
    console.log('SCHEMA:');
    for (const [table, cols] of Object.entries(schema)) {
      console.log(`Table: ${table}`);
      console.log(`  Cols: ${cols.slice(0,5).join(', ')}...`);
    }
  }
}

check();
