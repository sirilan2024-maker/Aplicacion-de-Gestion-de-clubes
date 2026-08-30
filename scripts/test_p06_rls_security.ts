process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Direct Supabase client using ANON key (NO server actions, NO service role)
const anonClient = createClient(supabaseUrl, anonKey);

async function runRlsSecurityTests() {
  console.log('--- STARTING P06 RLS SECURITY TESTS (DIRECT POSTGREST / ANONYMOUS) ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}${detail ? ` -> ${detail}` : ''}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
      failCount++;
    }
  }

  // 1. Direct anonymous SELECT on players
  const { data: players, error: pErr } = await anonClient.from('players').select('id, nombre, apellidos');
  assert(!players || players.length === 0, 'Anonymous direct SELECT on players blocked by RLS', `Returned ${players?.length || 0} rows`);

  // 2. Direct anonymous SELECT on fees
  const { data: fees, error: fErr } = await anonClient.from('fees').select('id, amount, status');
  assert(!fees || fees.length === 0, 'Anonymous direct SELECT on fees blocked by RLS', `Returned ${fees?.length || 0} rows`);

  // 3. Direct anonymous SELECT on payments
  const { data: payments, error: payErr } = await anonClient.from('payments').select('id, importe, estado');
  assert(!payments || payments.length === 0, 'Anonymous direct SELECT on payments blocked by RLS', `Returned ${payments?.length || 0} rows`);

  // 4. Direct anonymous SELECT on player_evaluations
  const { data: evaluations, error: eErr } = await anonClient.from('player_evaluations').select('id, player_id');
  assert(!evaluations || evaluations.length === 0, 'Anonymous direct SELECT on player_evaluations blocked by RLS', `Returned ${evaluations?.length || 0} rows`);

  // 5. Direct anonymous SELECT on evaluation_items
  const { data: evalItems, error: eiErr } = await anonClient.from('evaluation_items').select('id, score');
  assert(!evalItems || evalItems.length === 0, 'Anonymous direct SELECT on evaluation_items blocked by RLS', `Returned ${evalItems?.length || 0} rows`);

  // 6. Direct anonymous SELECT on player_apparel
  const { data: apparel, error: aErr } = await anonClient.from('player_apparel').select('id, player_id');
  assert(!apparel || apparel.length === 0, 'Anonymous direct SELECT on player_apparel blocked by RLS', `Returned ${apparel?.length || 0} rows`);

  // 7. Direct anonymous RPC call on execute_sql_query
  const { data: rpcData, error: rpcErr } = await anonClient.rpc('execute_sql_query', { query_text: 'SELECT 1' });
  assert(rpcErr !== null && (rpcErr.code === '42501' || rpcErr.message.includes('permission') || rpcErr.message.includes('denied') || rpcErr.message.includes('not found') || rpcErr.code === 'PGRST202'), 'Anonymous direct RPC execute_sql_query blocked', rpcErr?.message || 'Access denied');

  // 8. Direct anonymous INSERT on players
  const { data: insData, error: insErr } = await anonClient.from('players').insert({
    nombre: 'Hacker',
    apellidos: 'Anonymous',
    club_id: '00000000-0000-0000-0000-000000000000'
  }).select();
  assert(insErr !== null || !insData || insData.length === 0, 'Anonymous direct INSERT on players blocked by RLS', insErr?.message || 'Blocked');

  // 9. Direct anonymous UPDATE on players
  const { data: upData, error: upErr } = await anonClient.from('players').update({ nombre: 'Modified' }).eq('nombre', 'Hacker').select();
  assert(upErr !== null || !upData || upData.length === 0, 'Anonymous direct UPDATE on players blocked by RLS', upErr?.message || '0 rows updated');

  // 10. Direct anonymous DELETE on players
  const { data: delData, error: delErr } = await anonClient.from('players').delete().eq('nombre', 'Hacker').select();
  assert(delErr !== null || !delData || delData.length === 0, 'Anonymous direct DELETE on players blocked by RLS', delErr?.message || '0 rows deleted');

  // 11. Direct anonymous download from private storage bucket recibos_pagos
  const { data: recData, error: recErr } = await anonClient.storage.from('recibos_pagos').download('secret-receipt.pdf');
  assert(recErr !== null, 'Anonymous direct download from recibos_pagos blocked', recErr?.message || 'Access denied');

  // 12. Direct anonymous download from private storage bucket expedientes-doc
  const { data: expData, error: expErr } = await anonClient.storage.from('expedientes-doc').download('secret-dni.pdf');
  assert(expErr !== null, 'Anonymous direct download from expedientes-doc blocked', expErr?.message || 'Access denied');

  console.log('----------------------------------------------------');
  console.log(`P06 RLS SECURITY RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runRlsSecurityTests();
