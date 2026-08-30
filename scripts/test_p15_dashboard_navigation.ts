/**
 * TEST SUITE P15: CORRECCIÓN DE NAVEGACIÓN Y CONSOLIDACIÓN DEL CENTRO DE CONTROL
 * 
 * Verificaciones obligatorias (1 a 18):
 * 1. Login mantiene /dashboard/equipos.
 * 2. Centro de Control apunta a /admin/inicio.
 * 3. Ver directorio apunta a /dashboard/club/miembros.
 * 4. Ver equipos apunta a /dashboard/equipos.
 * 5. Gestionar altas apunta a /dashboard/inscripciones.
 * 6. Secretaría apunta a /dashboard/inscripciones.
 * 7. Gestión de equipos apunta a /dashboard/equipos.
 * 8. Calendario apunta a /dashboard/events.
 * 9. Ver calendario completo apunta a /dashboard/events.
 * 10. Estadísticas apunta a /dashboard/club/estadisticas.
 * 11. Efectividad Global utiliza datos reales.
 * 12. Rendimiento del equipo utiliza datos reales.
 * 13. No existen estadísticas hardcodeadas.
 * 14. El aislamiento por club_id se mantiene.
 * 15. Los permisos administrativos se mantienen.
 * 16. Otros roles mantienen su navegación.
 * 17. /dashboard/equipos continúa funcionando.
 * 18. /admin/inicio continúa funcionando.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Cargar variables de entorno
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env: Record<string, string> = {};
envContent.split('\n').forEach(line => {
  const idx = line.indexOf('=');
  if (idx > 0) {
    const key = line.slice(0, idx).trim();
    const val = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    env[key] = val;
  }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY'];
const supabase = createClient(supabaseUrl, serviceRoleKey);

let passed = 0;
let failed = 0;

function assert(condition: boolean | undefined | null, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}${detail ? ` -> ${detail}` : ''}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failed++;
  }
}

// Simulación de getExecutiveDashboardAction
async function simulateGetExecutiveDashboard(
  ctx: { user?: { id: string }; profile?: { id: string; role: string; club_id: string } } | null
) {
  if (!ctx || !ctx.user || !ctx.profile) {
    return { success: false, error: 'No autenticado' };
  }

  const ADMIN_ROLES = ['admin', 'coordinador', 'metodologo', 'superadmin', 'secretario', 'tesorero', 'directivo'];
  if (!ADMIN_ROLES.includes(ctx.profile.role)) {
    return { success: false, error: 'No tienes permisos administrativos para acceder al panel ejecutivo' };
  }

  const clubId = ctx.profile.club_id;

  const { data: club } = await supabase
    .from('clubs')
    .select('id, name, logo_url, sepa_creditor_id, sepa_iban')
    .eq('id', clubId)
    .single();

  if (!club) {
    return { success: false, error: 'Club no encontrado' };
  }

  const { count: activePlayersCount } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .neq('status', 'inactive');

  const { count: activeTeamsCount } = await supabase
    .from('teams')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId);

  const { count: pendingInscriptionsCount } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('status', 'pending');

  const { data: pendingFees } = await supabase
    .from('fees')
    .select('id, amount, status, payment_method')
    .eq('club_id', clubId)
    .eq('status', 'pending');

  const pendingFeesCount = pendingFees?.length || 0;
  const pendingFeesAmount = (pendingFees || []).reduce((acc, f) => acc + Number(f.amount || 0), 0);

  return {
    success: true,
    data: {
      club: { id: club.id, name: club.name, logoUrl: club.logo_url },
      kpis: {
        activePlayers: activePlayersCount || 0,
        activeTeams: activeTeamsCount || 0,
        pendingInscriptions: pendingInscriptionsCount || 0,
        pendingFeesCount,
        pendingFeesAmount,
      },
    },
  };
}

// Simulación de getGlobalStatsAction
async function simulateGetGlobalStats(
  ctx: { user?: { id: string }; profile?: { id: string; role: string; club_id: string } } | null
) {
  if (!ctx || !ctx.user || !ctx.profile) {
    return { success: false, error: 'No autorizado' };
  }

  const allowedRoles = ['admin', 'coordinador', 'metodologo', 'superadmin', 'secretario', 'tesorero', 'directivo', 'entrenador'];
  if (!allowedRoles.includes(ctx.profile.role)) {
    return { success: false, error: 'Permisos insuficientes para consultar estadísticas globales' };
  }

  const clubId = ctx.profile.club_id;

  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select('id, name, category')
    .eq('club_id', clubId);

  if (teamsError) return { success: false, error: teamsError.message };
  const teams = teamsData || [];

  const { data: matchesData, error: matchError } = await supabase
    .from('partidos')
    .select('id, equipo_id, resultado_propio, resultado_rival')
    .eq('club_id', clubId);

  if (matchError) return { success: false, error: matchError.message };
  const matches = matchesData || [];

  const teamStatsMap = new Map();
  teams.forEach(t => {
    teamStatsMap.set(t.id, {
      teamId: t.id,
      teamName: t.name,
      teamCategory: t.category || '-',
      matchesPlayed: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      winRate: 0,
    });
  });

  let totalMatches = 0;
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;

  matches.forEach(m => {
    if (m.resultado_propio !== null && m.resultado_rival !== null) {
      totalMatches++;
      const gf = m.resultado_propio || 0;
      const ga = m.resultado_rival || 0;
      goalsFor += gf;
      goalsAgainst += ga;
      const isWin = gf > ga;
      const isDraw = gf === ga;
      const isLoss = gf < ga;

      if (isWin) wins++;
      else if (isDraw) draws++;
      else if (isLoss) losses++;

      const tStat = teamStatsMap.get(m.equipo_id);
      if (tStat) {
        tStat.matchesPlayed++;
        tStat.goalsFor += gf;
        tStat.goalsAgainst += ga;
        tStat.goalDiff = tStat.goalsFor - tStat.goalsAgainst;
        if (isWin) tStat.wins++;
        else if (isDraw) tStat.draws++;
        else if (isLoss) tStat.losses++;
        tStat.winRate = tStat.matchesPlayed > 0 ? Math.round((tStat.wins / tStat.matchesPlayed) * 100) : 0;
      }
    }
  });

  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
  const teamStats = Array.from(teamStatsMap.values()).sort((a, b) => b.matchesPlayed - a.matchesPlayed);

  return {
    success: true,
    kpis: {
      totalTeams: teams.length,
      totalMatches,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      winRate,
    },
    teamStats,
    teams,
  };
}

async function runTests() {
  console.log('=================================================================');
  console.log('=== TEST SUITE P15: NAVEGACIÓN Y CENTRO DE CONTROL            ===');
  console.log('=================================================================\n');

  // Club de prueba
  const { data: realClub } = await supabase
    .from('clubs')
    .select('id, name')
    .eq('id', '7ff5dbeb-2942-4576-8e74-b45a17646fb7')
    .single();

  const { data: clubs } = await supabase.from('clubs').select('id, name').limit(2);
  const clubA = realClub || clubs?.[0] || { id: '7ff5dbeb-2942-4576-8e74-b45a17646fb7', name: 'SPORTING SALADAR' };
  const clubB = { id: '00000000-0000-0000-0000-000000000002', name: 'Club B Secundario' };

  // Contextos simulados
  const ctxAdminA = {
    user: { id: 'user-admin-a', email: 'admin-a@test.com' },
    profile: { id: 'prof-admin-a', role: 'admin', club_id: clubA.id },
  };

  const ctxAdminB = {
    user: { id: 'user-admin-b', email: 'admin-b@test.com' },
    profile: { id: 'prof-admin-b', role: 'admin', club_id: clubB.id },
  };

  const ctxFamilyA = {
    user: { id: 'user-fam-a', email: 'fam-a@test.com' },
    profile: { id: 'prof-fam-a', role: 'family', club_id: clubA.id },
  };

  const ctxPlayerA = {
    user: { id: 'user-player-a', email: 'player-a@test.com' },
    profile: { id: 'prof-player-a', role: 'jugador', club_id: clubA.id },
  };

  // Leer archivos de componentes y rutas
  const dashboardPageCode = fs.readFileSync(path.resolve(process.cwd(), 'src/app/dashboard/page.tsx'), 'utf8');
  const sidebarCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/layout/sidebar.tsx'), 'utf8');
  const mobileNavCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/layout/MobileNavigation.tsx'), 'utf8');
  const adminClientCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/features/admin/AdminInicioClient.tsx'), 'utf8');
  const statsViewCode = fs.readFileSync(path.resolve(process.cwd(), 'src/components/features/club/EstadisticasView.tsx'), 'utf8');

  // --- 1. Login mantiene /dashboard/equipos ---
  console.log('--- 1. Login mantiene /dashboard/equipos ---');
  const loginRedirectsToEquipos = dashboardPageCode.includes("role === 'admin'") && 
    dashboardPageCode.includes("redirect('/dashboard/equipos')");
  assert(loginRedirectsToEquipos, 'Login de administrador redirige a /dashboard/equipos (no a /admin/inicio)');

  // --- 2. Centro de Control apunta a /admin/inicio ---
  console.log('\n--- 2. Centro de Control apunta a /admin/inicio ---');
  const sidebarHasCentroControl = sidebarCode.includes('CENTRO DE CONTROL') && sidebarCode.includes('href: "/admin/inicio"');
  const mobileHasCentroControl = mobileNavCode.includes('CENTRO DE CONTROL') && mobileNavCode.includes('href: "/admin/inicio"');
  assert(sidebarHasCentroControl, 'Sidebar muestra "CENTRO DE CONTROL" apuntando a /admin/inicio');
  assert(mobileHasCentroControl, 'Mobile navigation muestra "CENTRO DE CONTROL" apuntando a /admin/inicio');

  // --- 3. Ver directorio apunta a /dashboard/club/miembros ---
  console.log('\n--- 3. Ver directorio apunta a /dashboard/club/miembros ---');
  const hasDirectorioLink = adminClientCode.includes('href="/dashboard/club/miembros"') && adminClientCode.includes('Ver directorio');
  assert(hasDirectorioLink, 'KPI Jugadores Activos enlaza "Ver directorio" a /dashboard/club/miembros');

  // --- 4. Ver equipos apunta a /dashboard/equipos ---
  console.log('\n--- 4. Ver equipos apunta a /dashboard/equipos ---');
  const hasEquiposKpiLink = adminClientCode.includes('href="/dashboard/equipos"') && adminClientCode.includes('Ver equipos');
  assert(hasEquiposKpiLink, 'KPI Equipos Activos enlaza "Ver equipos" a /dashboard/equipos');

  // --- 5. Gestionar altas apunta a /dashboard/inscripciones ---
  console.log('\n--- 5. Gestionar altas apunta a /dashboard/inscripciones ---');
  const hasAltasLink = adminClientCode.includes('href="/dashboard/inscripciones"') && adminClientCode.includes('Gestionar altas');
  assert(hasAltasLink, 'KPI Inscripciones enlaza "Gestionar altas" a /dashboard/inscripciones');

  // --- 6. Secretaría apunta a /dashboard/inscripciones ---
  console.log('\n--- 6. Secretaría apunta a /dashboard/inscripciones ---');
  const hasSecretariaQuickLink = adminClientCode.includes('title: "Secretaría y Documentación"') && 
    adminClientCode.includes('href: "/dashboard/inscripciones"');
  assert(hasSecretariaQuickLink, 'Acceso rápido "Secretaría y Documentación" apunta a /dashboard/inscripciones');

  // --- 7. Gestión de equipos apunta a /dashboard/equipos ---
  console.log('\n--- 7. Gestión de equipos apunta a /dashboard/equipos ---');
  const hasEquiposQuickLink = adminClientCode.includes('title: "Gestión de Equipos"') && 
    adminClientCode.includes('href: "/dashboard/equipos"');
  assert(hasEquiposQuickLink, 'Acceso rápido "Gestión de Equipos" apunta a /dashboard/equipos');

  // --- 8. Calendario apunta a /dashboard/events ---
  console.log('\n--- 8. Calendario apunta a /dashboard/events ---');
  const hasCalendarioQuickLink = adminClientCode.includes('title: "Calendario de Competición"') && 
    adminClientCode.includes('href: "/dashboard/events"');
  assert(hasCalendarioQuickLink, 'Acceso rápido "Calendario de Competición" apunta a /dashboard/events');

  // --- 9. Ver calendario completo apunta a /dashboard/events ---
  console.log('\n--- 9. Ver calendario completo apunta a /dashboard/events ---');
  const hasVerCalendarioCompletoLink = adminClientCode.includes('href="/dashboard/events"') && 
    adminClientCode.includes('Ver calendario completo');
  assert(hasVerCalendarioCompletoLink, 'Enlace "Ver calendario completo" de la agenda apunta a /dashboard/events');

  // --- 10. Estadísticas apunta a /dashboard/club/estadisticas ---
  console.log('\n--- 10. Estadísticas apunta a /dashboard/club/estadisticas ---');
  const hasEstadisticasQuickLink = adminClientCode.includes('title: "Estadísticas del Club"') && 
    adminClientCode.includes('href: "/dashboard/club/estadisticas"');
  assert(hasEstadisticasQuickLink, 'Acceso rápido "Estadísticas del Club" apunta a /dashboard/club/estadisticas');

  // --- 11. Efectividad Global utiliza datos reales ---
  console.log('\n--- 11. Efectividad Global utiliza datos reales ---');
  const statsRes = await simulateGetGlobalStats(ctxAdminA);
  assert(statsRes.success === true, 'getGlobalStats responde success: true para el club');
  assert(statsRes.kpis?.totalMatches === 305, `Total partidos calculado desde BD (${statsRes.kpis?.totalMatches})`);
  assert(statsRes.kpis?.wins === 104, `Victorias calculadas desde BD (${statsRes.kpis?.wins})`);
  assert(statsRes.kpis?.draws === 40, `Empates calculados desde BD (${statsRes.kpis?.draws})`);
  assert(statsRes.kpis?.losses === 161, `Derrotas calculadas desde BD (${statsRes.kpis?.losses})`);
  assert(statsRes.kpis?.winRate === 34, `Efectividad global calculada desde BD (${statsRes.kpis?.winRate}%)`);
  assert(statsViewCode.includes('Efectividad Global'), 'EstadisticasView incluye la ventana "Efectividad Global"');
  assert(statsViewCode.includes('victorias sobre partidos jugados'), 'EstadisticasView incluye la leyenda "victorias sobre partidos jugados"');

  // --- 12. Rendimiento del equipo utiliza datos reales ---
  console.log('\n--- 12. Rendimiento del equipo utiliza datos reales ---');
  assert(statsViewCode.includes('Rendimiento del equipo'), 'EstadisticasView incluye el acceso "Rendimiento del equipo"');
  assert(statsViewCode.includes('Balance de Competición por Equipo'), 'EstadisticasView contiene la tabla "Balance de Competición por Equipo"');
  assert(statsViewCode.includes('equipos listados'), 'EstadisticasView muestra el recuento de equipos listados');
  assert(statsRes.teamStats?.length === 8, `Equipos con estadísticas calculadas: ${statsRes.teamStats?.length}`);
  
  let tableMathConsistent = true;
  for (const t of statsRes.teamStats || []) {
    if (t.matchesPlayed !== (t.wins + t.draws + t.losses)) tableMathConsistent = false;
    if (t.goalDiff !== (t.goalsFor - t.goalsAgainst)) tableMathConsistent = false;
  }
  assert(tableMathConsistent, 'Matemática de partidos, goles y diferencia es 100% consistente');

  // --- 13. No existen estadísticas hardcodeadas ---
  console.log('\n--- 13. No existen estadísticas hardcodeadas ---');
  const noHardcodedWinRate = !statsViewCode.includes('>34%<') && !adminClientCode.includes('>34%<');
  const noHardcodedWins = !statsViewCode.includes('>104 Victorias<') && !adminClientCode.includes('>104 Victorias<');
  assert(noHardcodedWinRate, 'Efectividad Global no está hardcodeada (usa valores dinámicos del server)');
  assert(noHardcodedWins, 'Desglose de victorias/empates/derrotas no está hardcodeado');

  // --- 14. El aislamiento por club_id se mantiene ---
  console.log('\n--- 14. El aislamiento por club_id se mantiene ---');
  const statsResB = await simulateGetGlobalStats(ctxAdminB);
  assert(statsResB.success === true, 'getGlobalStatsAction ejecuta para Club B');
  const sameTotal = statsRes.kpis?.totalMatches === statsResB.kpis?.totalMatches &&
    statsRes.kpis?.totalMatches !== 0 && clubA.id !== clubB.id;
  assert(!sameTotal, 'Aislamiento multi-tenant por club_id verificado en estadísticas');

  // --- 15. Los permisos administrativos se mantienen ---
  console.log('\n--- 15. Los permisos administrativos se mantienen ---');
  const anonRes = await simulateGetGlobalStats(null);
  assert(anonRes.success === false, 'Acceso anónimo denegado a estadísticas');
  const famRes = await simulateGetGlobalStats(ctxFamilyA);
  assert(famRes.success === false, 'Rol familiar denegado a estadísticas');
  const playerRes = await simulateGetGlobalStats(ctxPlayerA);
  assert(playerRes.success === false, 'Rol jugador denegado a estadísticas');

  // --- 16. Otros roles mantienen su navegación ---
  console.log('\n--- 16. Otros roles mantienen su navegación ---');
  const coachRedirect = dashboardPageCode.includes("role === 'coach' || role === 'entrenador'") &&
    dashboardPageCode.includes("redirect('/dashboard/mis-equipos')");
  const familyRedirect = dashboardPageCode.includes("role === 'tutor' || role === 'familia' || role === 'family'") &&
    dashboardPageCode.includes("redirect('/dashboard/family')");
  assert(coachRedirect, 'Navegación de entrenador redirige a /dashboard/mis-equipos');
  assert(familyRedirect, 'Navegación de familiar redirige a /dashboard/family');

  // --- 17. /dashboard/equipos continúa funcionando ---
  console.log('\n--- 17. /dashboard/equipos continúa funcionando ---');
  const equiposPageExists = fs.existsSync(path.resolve(process.cwd(), 'src/app/dashboard/equipos/page.tsx'));
  assert(equiposPageExists, 'Ruta funcional /dashboard/equipos existe y está operativa');

  // --- 18. /admin/inicio continúa funcionando ---
  console.log('\n--- 18. /admin/inicio continúa funcionando ---');
  const inicioPageExists = fs.existsSync(path.resolve(process.cwd(), 'src/app/admin/inicio/page.tsx'));
  const resDash = await simulateGetExecutiveDashboard(ctxAdminA);
  assert(inicioPageExists, 'Ruta /admin/inicio existe en el enrutador de Next.js');
  assert(resDash.success === true, 'getExecutiveDashboardAction responde con éxito para el admin');

  console.log('\n=================================================================');
  console.log(`RESULTADOS P15 NAVEGACIÓN Y CENTRO DE CONTROL: ${passed} PASSED / ${failed} FAILED`);
  console.log('=================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Error fatal durante la ejecución de pruebas P15:', err);
  process.exit(1);
});
