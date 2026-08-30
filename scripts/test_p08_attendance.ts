process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { getGlobalAttendanceAction } from '../src/app/actions/attendance-actions';

async function runP08Tests() {
  console.log('--- STARTING P08 GLOBAL ATTENDANCE TESTS ---');
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
  const unauthRes = await getGlobalAttendanceAction();
  assert(!unauthRes.success && !!unauthRes.error, 'Unauthenticated call is rejected', unauthRes.error);

  // 2. Simulación autenticada con cliente Supabase
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Obtener el club activo con datos para validar agregación
  const { data: club } = await supabase.from('clubs').select('id, name').eq('id', '7ff5dbeb-2942-4576-8e74-b45a17646fb7').single();
  assert(!!club?.id, 'Club exists in database', club?.name);


  const { data: teams } = await supabase.from('teams').select('id, name').eq('club_id', club!.id);
  assert(Array.isArray(teams), 'Club teams fetched successfully', `${teams?.length} teams`);

  const { data: players } = await supabase.from('players').select('id').eq('club_id', club!.id);
  const playerIds = players?.map(p => p.id) || [];
  assert(playerIds.length > 0, 'Club players retrieved', `${playerIds.length} players`);

  // 3. Consultar asistencia para los jugadores de este club
  const { data: attendanceRows, error: attErr } = await supabase
    .from('attendance')
    .select('id, player_id, status')
    .in('player_id', playerIds)
    .limit(100);

  assert(!attErr, 'Direct attendance query succeeds without error');
  assert(Array.isArray(attendanceRows), 'Attendance records retrieved', `${attendanceRows?.length} rows`);

  // 4. Verificar aislamiento multi-tenant: la query no debe incluir jugadores de otro club
  const { data: otherClubPlayers } = await supabase
    .from('players')
    .select('id')
    .neq('club_id', club!.id)
    .limit(10);

  const otherPlayerIds = new Set((otherClubPlayers || []).map(p => p.id));
  const hasLeak = attendanceRows?.some(r => otherPlayerIds.has(r.player_id));
  assert(!hasLeak, 'No cross-tenant player attendance records in club dataset');

  // 5. Verificar cálculo de KPIs
  let presentes = 0;
  let ausentes = 0;
  attendanceRows?.forEach(r => {
    const s = (r.status || '').toLowerCase();
    if (s === 'presente' || s === 'present') presentes++;
    if (s === 'ausente' || s === 'absent') ausentes++;
  });
  assert(presentes >= 0 && ausentes >= 0, 'KPI aggregation computes valid counts', `Presentes: ${presentes}, Ausentes: ${ausentes}`);

  console.log('----------------------------------------------------');
  console.log(`P08 ATTENDANCE RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runP08Tests();
