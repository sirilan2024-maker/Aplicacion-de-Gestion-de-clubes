process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  const { data, error } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT prosrc, prosecdef FROM pg_proc WHERE proname = 'execute_sql_query'"
  });
  console.log('EXECUTE_SQL_QUERY:', data, error);
}

main();
