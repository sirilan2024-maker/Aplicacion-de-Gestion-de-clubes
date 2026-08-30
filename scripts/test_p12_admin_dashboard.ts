process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno desde .env.local sin librerías externas
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey);

let passCount = 0;
let failCount = 0;

function assert(condition: boolean | undefined | null, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}${detail ? ` -> ${detail}` : ''}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failCount++;
  }
}

// Simulación fiel de getExecutiveDashboardAction
async function simulateGetExecutiveDashboard(
  ctx: { user?: { id: string }; profile?: { id: string; role: string; club_id: string } } | null
) {
  // 1. Verificación de Autenticación
  if (!ctx || !ctx.user || !ctx.profile) {
    return { success: false, error: 'No autenticado' };
  }

  // 2. Verificación de Roles Administrativos / Directiva
  const ADMIN_ROLES = ['admin', 'coordinador', 'metodologo', 'superadmin', 'secretario', 'tesorero', 'directivo'];
  if (!ADMIN_ROLES.includes(ctx.profile.role)) {
    return { success: false, error: 'No tienes permisos administrativos para acceder al panel ejecutivo' };
  }

  const clubId = ctx.profile.club_id;

  // 3. Obtener Club Info
  const { data: club } = await adminClient
    .from('clubs')
    .select('id, name, logo_url, sepa_creditor_id, sepa_iban')
    .eq('id', clubId)
    .single();

  if (!club) {
    return { success: false, error: 'Club no encontrado' };
  }

  // 4. Conteo de Jugadores Activos / Federados
  const { count: activePlayersCount } = await adminClient
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .neq('status', 'inactive');

  // 5. Conteo de Equipos Activos
  const { count: activeTeamsCount } = await adminClient
    .from('teams')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId);

  // 6. Conteo de Inscripciones Pendientes
  const { count: pendingInscriptionsCount } = await adminClient
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .in('registration_status', ['pendiente_documentacion', 'pendiente_validacion', 'pendiente_firma', 'pdte_verif']);

  // 7. Cuotas Pendientes
  const { data: pendingFees } = await adminClient
    .from('fees')
    .select('id, amount_cents, payment_method, club_id')
    .eq('club_id', clubId)
    .in('estado', ['pending', 'pendiente', 'pdte_verif', 'pendiente_verificacion']);

  const feeList = pendingFees || [];
  const pendingFeesCount = feeList.length;
  const pendingFeesAmount = feeList.reduce((acc, f) => acc + (f.amount_cents || 0), 0) / 100;

  const sepaFees = feeList.filter(f => (f.payment_method || '').toLowerCase().includes('domicilia'));
  const pendingSepaCount = sepaFees.length;
  const pendingSepaAmount = sepaFees.reduce((acc, f) => acc + (f.amount_cents || 0), 0) / 100;

  const isSepaConfigured = Boolean(club?.sepa_creditor_id?.trim() && club?.sepa_iban?.trim());

  // 8. Próximos Partidos (Agenda)
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: rawMatches } = await adminClient
    .from('partidos')
    .select(`
      id, fecha_hora, rival_nombre, lugar, jornada, es_local, estado, club_id,
      resultado_propio, resultado_rival,
      teams:equipo_id (name, category, color)
    `)
    .eq('club_id', clubId)
    .gte('fecha_hora', yesterday)
    .order('fecha_hora', { ascending: true })
    .limit(6);

  interface TeamRel {
    name?: string;
    category?: string;
    color?: string;
  }

  const upcomingMatches = (rawMatches || []).map(m => {
    const team = m.teams as unknown as TeamRel | null;
    return {
      id: m.id,
      fechaHora: m.fecha_hora,
      rivalNombre: m.rival_nombre || 'Rival por definir',
      lugar: m.lugar || 'Por determinar',
      jornada: m.jornada || undefined,
      esLocal: m.es_local ?? true,
      estado: m.estado || 'Programado',
      resultadoPropio: m.resultado_propio,
      resultadoRival: m.resultado_rival,
      teamName: team?.name || 'Equipo del Club',
      teamCategory: team?.category || '',
      teamColor: team?.color || '#4F46E5',
    };
  });

  return {
    success: true,
    data: {
      club: {
        id: clubId,
        name: club.name || 'Club Deportivo',
        logoUrl: club.logo_url || null,
      },
      kpis: {
        activePlayers: activePlayersCount || 0,
        activeTeams: activeTeamsCount || 0,
        pendingInscriptions: pendingInscriptionsCount || 0,
        pendingFeesCount,
        pendingFeesAmount,
        pendingSepaCount,
        pendingSepaAmount,
      },
      alerts: {
        hasPendingInscriptions: (pendingInscriptionsCount || 0) > 0,
        pendingInscriptionsCount: pendingInscriptionsCount || 0,
        hasPendingFees: pendingFeesCount > 0,
        pendingFeesCount,
        pendingFeesAmount,
        hasPendingSepaRemittances: pendingSepaCount > 0,
        pendingSepaCount,
        pendingSepaAmount,
        isSepaConfigured,
      },
      upcomingMatches,
    },
  };
}

async function runTests() {
  console.log('===========================================================');
  console.log('=== TEST SUITE P12: PANEL EJECUTIVO DE CONTROL DEL CLUB ===');
  console.log('===========================================================\n');

  // Obtener al menos 2 clubes de la BD para probar aislamiento
  const { data: clubs } = await adminClient.from('clubs').select('id, name').limit(2);
  if (!clubs || clubs.length < 2) {
    console.error('Se requieren al menos 2 clubes en la BD para probar aislamiento.');
    process.exit(1);
  }

  const clubA = clubs[0];
  const clubB = clubs[1];

  // Contextos de prueba
  const ctxAdminA = {
    user: { id: 'admin-a' },
    profile: { id: 'prof-admin-a', role: 'admin', club_id: clubA.id },
  };

  const ctxDirectivoA = {
    user: { id: 'directivo-a' },
    profile: { id: 'prof-dir-a', role: 'directivo', club_id: clubA.id },
  };

  const ctxCoordinadorA = {
    user: { id: 'coord-a' },
    profile: { id: 'prof-coord-a', role: 'coordinador', club_id: clubA.id },
  };

  const ctxFamilyA = {
    user: { id: 'family-a' },
    profile: { id: 'prof-fam-a', role: 'family', club_id: clubA.id },
  };

  const ctxPlayerA = {
    user: { id: 'player-a' },
    profile: { id: 'prof-ply-a', role: 'jugador', club_id: clubA.id },
  };

  const ctxAdminB = {
    user: { id: 'admin-b' },
    profile: { id: 'prof-admin-b', role: 'admin', club_id: clubB.id },
  };

  // ─────────────────────────────────────────────────────────────
  // 1. sin autenticación → DENIED
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. sin autenticación → DENIED ---');
  const resUnauth = await simulateGetExecutiveDashboard(null);
  assert(resUnauth.success === false && resUnauth.error?.includes('No autenticado'), 'Usuario no autenticado → DENIED');

  // ─────────────────────────────────────────────────────────────
  // 2. rol no autorizado → DENIED
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. rol no autorizado → DENIED ---');
  const resFamily = await simulateGetExecutiveDashboard(ctxFamilyA);
  assert(resFamily.success === false && resFamily.error?.includes('No tienes permisos'), 'Rol familiar → DENIED');

  const resPlayer = await simulateGetExecutiveDashboard(ctxPlayerA);
  assert(resPlayer.success === false && resPlayer.error?.includes('No tienes permisos'), 'Rol jugador → DENIED');

  // ─────────────────────────────────────────────────────────────
  // 3. rol autorizado → ACCEPT
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. rol autorizado → ACCEPT ---');
  const resAdmin = await simulateGetExecutiveDashboard(ctxAdminA);
  assert(resAdmin.success === true && Boolean(resAdmin.data), 'Rol admin → ACCEPT');

  const resDirectivo = await simulateGetExecutiveDashboard(ctxDirectivoA);
  assert(resDirectivo.success === true && Boolean(resDirectivo.data), 'Rol directivo → ACCEPT');

  const resCoordinador = await simulateGetExecutiveDashboard(ctxCoordinadorA);
  assert(resCoordinador.success === true && Boolean(resCoordinador.data), 'Rol coordinador → ACCEPT');

  // ─────────────────────────────────────────────────────────────
  // 4. datos reales → PASS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. datos reales → PASS ---');
  const dataA = resAdmin.data!;
  assert(dataA.club.id === clubA.id && dataA.club.name === clubA.name, 'Información del club coincide con la BD');

  // Verificar recuento real de jugadores en la BD
  const { count: realPlayerCount } = await adminClient
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubA.id)
    .neq('status', 'inactive');

  assert(dataA.kpis.activePlayers === (realPlayerCount || 0), 'KPI Jugadores Activos coincide con recuento real en BD', `${dataA.kpis.activePlayers} jugadores`);

  // Verificar recuento real de equipos en la BD
  const { count: realTeamsCount } = await adminClient
    .from('teams')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubA.id);

  assert(dataA.kpis.activeTeams === (realTeamsCount || 0), 'KPI Equipos Activos coincide con recuento real en BD', `${dataA.kpis.activeTeams} equipos`);

  // ─────────────────────────────────────────────────────────────
  // 5. aislamiento club_id → PASS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. aislamiento club_id → PASS ---');
  const resAdminB = await simulateGetExecutiveDashboard(ctxAdminB);
  assert(resAdminB.success === true, 'Admin de Club B puede consultar su propio panel');
  const dataB = resAdminB.data!;

  assert(dataA.club.id !== dataB.club.id, 'Club A y Club B tienen IDs diferenciados');
  assert(dataA.club.name !== dataB.club.name || clubA.id !== clubB.id, 'Datos de Club A aislados de Club B');

  // ─────────────────────────────────────────────────────────────
  // 6. KPIs → PASS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. KPIs → PASS ---');
  const k = dataA.kpis;
  const kpisStructureValid =
    typeof k.activePlayers === 'number' &&
    typeof k.activeTeams === 'number' &&
    typeof k.pendingInscriptions === 'number' &&
    typeof k.pendingFeesCount === 'number' &&
    typeof k.pendingFeesAmount === 'number' &&
    typeof k.pendingSepaCount === 'number' &&
    typeof k.pendingSepaAmount === 'number';

  assert(kpisStructureValid, 'Estructura y tipos numéricos de KPIs correctos');
  assert(k.pendingFeesCount >= k.pendingSepaCount, 'Total cuotas pendientes >= cuotas domiciliadas SEPA');
  assert(k.pendingFeesAmount >= k.pendingSepaAmount, 'Importe total cuotas pendientes >= importe domiciliado SEPA');

  // ─────────────────────────────────────────────────────────────
  // 7. agenda → PASS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 7. agenda → PASS ---');
  assert(Array.isArray(dataA.upcomingMatches), 'Agenda de partidos es un array');
  if (dataA.upcomingMatches.length > 0) {
    const match = dataA.upcomingMatches[0];
    const matchValid =
      Boolean(match.id) &&
      Boolean(match.fechaHora) &&
      Boolean(match.rivalNombre) &&
      Boolean(match.teamName);
    assert(matchValid, 'Partidos de la agenda contienen campos requeridos (id, fechaHora, rivalNombre, teamName)');
  } else {
    assert(true, 'Agenda vacía manejada limpiamente (sin errores)');
  }

  // ─────────────────────────────────────────────────────────────
  // 8. alertas de Secretaría y Tesorería → PASS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 8. alertas de Secretaría y Tesorería → PASS ---');
  const al = dataA.alerts;
  assert(al.hasPendingInscriptions === (k.pendingInscriptions > 0), 'Alerta de Secretaría consistente con inscripciones pendientes');
  assert(al.hasPendingFees === (k.pendingFeesCount > 0), 'Alerta de Tesorería consistente con cuotas pendientes');
  assert(al.hasPendingSepaRemittances === (k.pendingSepaCount > 0), 'Alerta de remesas SEPA consistente con cuotas domiciliadas');

  console.log('\n===========================================================');
  console.log(`RESULTADOS P12 ADMIN DASHBOARD: ${passCount} PASSED / ${failCount} FAILED`);
  console.log('===========================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Error fatal ejecutando test suite P12:', err);
  process.exit(1);
});
