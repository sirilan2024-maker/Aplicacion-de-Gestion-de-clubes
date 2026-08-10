process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDDL() {
  console.log("Testing DDL execution...");
  
  // Test if we can run ddl via query_text
  const query = `
    SELECT 1 as result WHERE EXISTS (
      SELECT 1 FROM partidos
    )
  `;
  const { data, error } = await supabase.rpc('execute_sql_query', { query_text: query });
  console.log("Query res:", { data, error });
}

testDDL().catch(console.error);
