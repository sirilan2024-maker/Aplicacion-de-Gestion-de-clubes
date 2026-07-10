import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await sb.rpc('execute_sql_query', { 
  query_text: "SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'partidos' AND schemaname = 'public'"
});
if (error) console.log('Error:', error.message);
else {
  console.log('RLS POLICIES ON PARTIDOS:');
  data?.forEach(p => console.log('---', p.policyname, '|', p.cmd, '\n   QUAL:', p.qual));
}
