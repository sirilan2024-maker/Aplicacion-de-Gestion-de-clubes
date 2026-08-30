process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createAdminClient } from '../src/lib/supabase/admin';

import * as fs from 'fs';


async function inspect() {
  const supabase = createAdminClient();

  // 1. Tables and RLS status
  const { data: tables, error: tErr } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
  });

  // 2. Policies
  const { data: policies, error: pErr } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname"
  });

  // 3. Functions & Security Definer
  const { data: functions, error: fErr } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT proname, prosecdef, provolatile FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' ORDER BY proname"
  });

  // 4. Storage buckets
  const { data: buckets, error: bErr } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT id, name, public FROM storage.buckets"
  });

  // 5. Storage policies
  const { data: storagePolicies, error: spErr } = await supabase.rpc('execute_sql_query', {
    query_text: "SELECT tablename, policyname, roles, cmd, qual, with_check FROM pg_policies WHERE schemaname = 'storage' ORDER BY policyname"
  });


  const result = {
    tables: tables || [],
    tErr,
    policies: policies || [],
    pErr,
    functions: functions || [],
    fErr,
    buckets: buckets || [],
    bErr,
    storagePolicies: storagePolicies || [],
    spErr
  };

  fs.writeFileSync('scripts/p06_db_inventory.json', JSON.stringify(result, null, 2), 'utf8');
  console.log(`P06 INVENTORY COMPLETED: ${result.tables.length} tables, ${result.policies.length} policies, ${result.functions.length} functions, ${result.buckets.length} buckets, ${result.storagePolicies.length} storage policies.`);
}

inspect().catch(err => console.error("Error inspecting:", err));
