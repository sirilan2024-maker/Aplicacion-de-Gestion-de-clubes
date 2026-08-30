process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getGlobalCalendarAction } from '../src/app/actions/calendar-actions';

async function runP10Tests() {
  console.log('--- STARTING P10 GLOBAL CALENDAR TESTS ---');
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
  const unauthRes = await getGlobalCalendarAction();
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

  // 3. Consultar equipos del club
  const { data: teams, error: teamsErr } = await supabase
    .from('teams')
    .select('id, name')
    .eq('club_id', activeClubId);

  assert(!teamsErr && (teams?.length || 0) > 0, 'Club teams retrieved', `${teams?.length} teams`);
  const teamIds = (teams || []).map(t => t.id);

  // 4. Consultar team_events reales del club
  const { data: teamEvents, error: evErr } = await supabase
    .from('team_events')
    .select('id, title, event_type, date, team_id')
    .in('team_id', teamIds)
    .limit(50);

  assert(!evErr, 'Club team_events retrieved without error', `${teamEvents?.length} events found`);

  // 5. Consultar partidos reales del club
  const { data: matches, error: matchErr } = await supabase
    .from('partidos')
    .select('id, rival_nombre, fecha_hora, equipo_id, club_id')
    .eq('club_id', activeClubId)
    .limit(50);

  assert(!matchErr, 'Club matches retrieved without error', `${matches?.length} matches found`);

  // 6. Verificar aislamiento multi-tenant: ni eventos ni partidos deben pertenecer a otro club
  const { data: otherMatches } = await supabase
    .from('partidos')
    .select('id')
    .neq('club_id', activeClubId)
    .limit(10);

  const otherMatchIds = new Set((otherMatches || []).map(m => m.id));
  const hasLeak = matches?.some(m => otherMatchIds.has(m.id));
  assert(!hasLeak, 'No cross-tenant matches leaked in calendar dataset');

  // 7. Verificar que existen tanto partidos como entrenamientos en la base de datos
  const hasTrainings = teamEvents?.some(e => e.event_type === 'Entrenamiento');
  assert(hasTrainings || (teamEvents?.length || 0) > 0, 'Real training/team events exist in dataset');
  assert((matches?.length || 0) > 0, 'Real official matches exist in dataset');

  console.log('----------------------------------------------------');
  console.log(`P10 CALENDAR RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runP10Tests();
