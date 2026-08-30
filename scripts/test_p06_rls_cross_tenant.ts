import { execSync } from 'child_process';
import * as fs from 'fs';

function runSqlSnippet(snippet: string): { success: boolean; output: string } {
  const tmpFile = 'scripts/_temp_test.sql';
  fs.writeFileSync(tmpFile, snippet, 'utf8');
  try {
    const cmd = `npx supabase db query --linked -f ${tmpFile}`;
    const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    return { success: true, output };
  } catch (err: any) {
    const output = (err.stderr || '') + (err.stdout || '') + (err.message || '');
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    return { success: false, output };
  }
}

async function runCrossTenantRlsTests() {
  console.log('--- STARTING P06 RLS CROSS-TENANT & PRIVILEGE ESCALATION TESTS ---');
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

  // 1. Cross-Tenant SELECT on players via PostgreSQL session simulation
  const q1 = runSqlSnippet(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', false);
    SELECT count(*) as count FROM public.players;
  `);
  assert(q1.success && q1.output.includes('"count": 0'), 'Cross-tenant SELECT on players blocked by RLS in PostgreSQL');

  // 2. Cross-Tenant SELECT on fees
  const q2 = runSqlSnippet(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', false);
    SELECT count(*) as count FROM public.fees;
  `);
  assert(q2.success && q2.output.includes('"count": 0'), 'Cross-tenant SELECT on fees blocked by RLS in PostgreSQL');

  // 3. Cross-Tenant SELECT on payments
  const q3 = runSqlSnippet(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', false);
    SELECT count(*) as count FROM public.payments;
  `);
  assert(q3.success && q3.output.includes('"count": 0'), 'Cross-tenant SELECT on payments blocked by RLS in PostgreSQL');

  // 4. Cross-Tenant SELECT on player_evaluations
  const q4 = runSqlSnippet(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', false);
    SELECT count(*) as count FROM public.player_evaluations;
  `);
  assert(q4.success && q4.output.includes('"count": 0'), 'Cross-tenant SELECT on player_evaluations blocked by RLS in PostgreSQL');

  // 5. Cross-Tenant SELECT on player_apparel
  const q5 = runSqlSnippet(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', false);
    SELECT count(*) as count FROM public.player_apparel;
  `);
  assert(q5.success && q5.output.includes('"count": 0'), 'Cross-tenant SELECT on player_apparel blocked by RLS in PostgreSQL');

  // 6. Direct Privilege Escalation on profiles (UPDATE role = admin)
  const q6 = runSqlSnippet(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub": "9fca73d0-4fdd-4c06-a280-46f4ba191415", "role": "authenticated"}', false);
    UPDATE public.profiles SET role = 'admin' WHERE id = '9fca73d0-4fdd-4c06-a280-46f4ba191415';
  `);
  assert(!q6.success && q6.output.includes('No tienes permiso para modificar tu rol'), 'Direct role escalation to admin blocked by DB trigger');

  // 7. Direct Tenant Changing on profiles (UPDATE club_id = other)
  const q7 = runSqlSnippet(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub": "9fca73d0-4fdd-4c06-a280-46f4ba191415", "role": "authenticated"}', false);
    UPDATE public.profiles SET club_id = '00000000-0000-0000-0000-000000000002' WHERE id = '9fca73d0-4fdd-4c06-a280-46f4ba191415';
  `);
  assert(!q7.success && q7.output.includes('No tienes permiso para modificar tu rol'), 'Direct club_id tenant changing blocked by DB trigger');

  // 8. Direct Roles Array Escalation on profiles (UPDATE roles = ARRAY['admin'])
  const q8 = runSqlSnippet(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub": "9fca73d0-4fdd-4c06-a280-46f4ba191415", "role": "authenticated"}', false);
    UPDATE public.profiles SET roles = ARRAY['admin'] WHERE id = '9fca73d0-4fdd-4c06-a280-46f4ba191415';
  `);
  assert(!q8.success && q8.output.includes('No tienes permiso para modificar tu rol'), 'Direct roles array escalation blocked by DB trigger');

  // 9. Storage isolation: Direct SELECT on recibos_pagos without matching folder or admin role
  const q9 = runSqlSnippet(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', false);
    SELECT count(*) as count FROM storage.objects WHERE bucket_id = 'recibos_pagos';
  `);
  assert(q9.success && q9.output.includes('"count": 0'), 'Direct access to recibos_pagos storage blocked without matching folder or admin role');

  // 10. Storage isolation: Direct SELECT on expedientes-doc without admin role
  const q10 = runSqlSnippet(`
    SET ROLE authenticated;
    SELECT set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-000000000001", "role": "authenticated"}', false);
    SELECT count(*) as count FROM storage.objects WHERE bucket_id = 'expedientes-doc';
  `);
  assert(q10.success && q10.output.includes('"count": 0'), 'Direct access to expedientes-doc storage blocked without admin role');

  console.log('----------------------------------------------------');
  console.log(`P06 RLS CROSS-TENANT RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runCrossTenantRlsTests();
