process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runSql(sql: string) {
  const cleanSql = sql.trim().replace(/;+$/, '');
  const { data, error } = await supabase.rpc('execute_sql_query', { query_text: cleanSql });
  if (error) {
    console.error(`ERROR running SQL [${cleanSql.slice(0, 60)}...]:`, error);
    throw error;
  }
  return data;
}

async function main() {
  console.log("=== REMEDIACIÓN P06.1: EXECUTE_SQL_QUERY ===");
  
  // 1. Check initial privileges
  const checkSql = `
    SELECT 
      proname, 
      prosecdef, 
      has_function_privilege('anon', 'execute_sql_query(text)', 'execute') as anon_has_exec, 
      has_function_privilege('authenticated', 'execute_sql_query(text)', 'execute') as auth_has_exec,
      has_function_privilege('service_role', 'execute_sql_query(text)', 'execute') as service_has_exec
    FROM pg_proc WHERE proname = 'execute_sql_query'
  `;
  const initial = await runSql(checkSql);
  console.log("Initial privileges for execute_sql_query:", initial);

  // 2. Revoke execute from anon & authenticated
  console.log("Revoking execute on execute_sql_query from anon and authenticated...");
  await runSql("REVOKE EXECUTE ON FUNCTION public.execute_sql_query(text) FROM anon");
  await runSql("REVOKE EXECUTE ON FUNCTION public.execute_sql_query(text) FROM authenticated");
  await runSql("REVOKE EXECUTE ON FUNCTION public.execute_sql_query(text) FROM public");
  await runSql("GRANT EXECUTE ON FUNCTION public.execute_sql_query(text) TO service_role");
  await runSql("GRANT EXECUTE ON FUNCTION public.execute_sql_query(text) TO postgres");

  const after = await runSql(checkSql);
  console.log("Updated privileges for execute_sql_query:", after);
}

main().catch(err => {
  console.error("Remediation failed:", err);
  process.exit(1);
});
