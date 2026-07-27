const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

let supabaseUrl = '';
let supabaseKey = '';

envContent.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
  if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim();
});

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabaseAdmin.from('fees').select('*').limit(1);
  if (error) {
    console.error('Error:', error.message);
  } else {
    console.log('Columns in fees:', data.length > 0 ? Object.keys(data[0]) : 'table is empty');
    
    // If empty, let's query the table columns using RPC or just try a few selects
    const testSelects = ['amount', 'amount_cents', 'monto'];
    for (const col of testSelects) {
      const { error: e } = await supabaseAdmin.from('fees').select(col).limit(1);
      if (!e) console.log(`Column exists: ${col}`);
    }
  }
}

test();
