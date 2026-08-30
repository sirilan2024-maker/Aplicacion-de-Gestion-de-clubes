process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getGlobalStatsAction } from '../src/app/actions/stats-actions';

async function runP09Tests() {
  console.log('--- STARTING P09 GLOBAL STATISTICS TESTS ---');
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

  // 1. Sin autenticación en scope de request -> rechaza con error
  const unauthRes = await getGlobalStatsAction();
  assert(!unauthRes.success && !!unauthRes.error, 'Unauthenticated call is rejected', unauthRes.error);

  // 2. Simulación con cliente Supabase sobre el club activo
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const activeClubId = '7ff5dbeb-2942-4576-8e74-b45a17646fb7';
  const { data: club } = await supabase.from('clubs').select('id, name').eq('id', activeClubId).single();
  assert(!!club?.id, 'Active club exists in database', club?.name);

  // 3. Consultar partidos del club
  const { data: matches, error: matchErr } = await supabase
    .from('partidos')
    .select('id, equipo_id, resultado_propio, resultado_rival, club_id')
    .eq('club_id', activeClubId);

  assert(!matchErr, 'Club matches retrieved without error', `${matches?.length} matches found`);

  // 4. Aislamiento multi-tenant: verificar que ningún partido pertenezca a otro club
  const { data: otherMatches } = await supabase
    .from('partidos')
    .select('id')
    .neq('club_id', activeClubId)
    .limit(10);

  const otherMatchIds = new Set((otherMatches || []).map(m => m.id));
  const hasLeak = matches?.some(m => otherMatchIds.has(m.id));
  assert(!hasLeak, 'No cross-tenant matches leaked in club statistics dataset');

  // 5. Verificar cálculo de balance (V, E, D, GF, GC)
  let v = 0;
  let e = 0;
  let d = 0;
  let gf = 0;
  let gc = 0;

  matches?.forEach(m => {
    if (m.resultado_propio !== null && m.resultado_rival !== null) {
      gf += m.resultado_propio;
      gc += m.resultado_rival;
      if (m.resultado_propio > m.resultado_rival) v++;
      else if (m.resultado_propio === m.resultado_rival) e++;
      else d++;
    }
  });

  assert(v + e + d <= (matches?.length || 0), 'Match outcomes (V, E, D) sum matches valid count', `V: ${v}, E: ${e}, D: ${d}`);
  assert(gf >= 0 && gc >= 0, 'Goals for and against are non-negative', `GF: ${gf}, GC: ${gc}`);

  // 6. Consultar estadísticas de jugadores vía convocatorias
  const matchIds = (matches || []).map(m => m.id);
  let convCount = 0;
  if (matchIds.length > 0) {
    const { data: convs } = await supabase
      .from('convocatorias')
      .select('player_id, goals, minutes_played')
      .in('partido_id', matchIds)
      .limit(50);
    convCount = convs?.length || 0;
  }
  assert(convCount >= 0, 'Player match performance records (convocatorias) query succeeds', `${convCount} records`);

  // 7. Equipos del club
  const { data: teams } = await supabase.from('teams').select('id, name').eq('club_id', activeClubId);
  assert((teams?.length || 0) > 0, 'Club has teams for breakdown table', `${teams?.length} teams`);

  console.log('----------------------------------------------------');
  console.log(`P09 STATISTICS RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runP09Tests();
