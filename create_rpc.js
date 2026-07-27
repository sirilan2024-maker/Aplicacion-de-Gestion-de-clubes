process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function createRPC() {
  const sql = 
  CREATE OR REPLACE FUNCTION get_policies()
  RETURNS TABLE(tablename text, policyname text, qual text)
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS \$\$
  BEGIN
    RETURN QUERY
    SELECT p.tablename::text, p.policyname::text, p.qual::text
    FROM pg_policies p
    WHERE p.tablename IN ('partidos', 'team_events');
  END;
  \$\$;
  ;
  
  // Actually, I can't run DDL via PostgREST easily. 
}
createRPC();
