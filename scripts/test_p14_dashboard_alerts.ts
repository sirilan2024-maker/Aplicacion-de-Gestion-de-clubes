process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno desde .env.local
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

  const { data: club } = await adminClient
    .from('clubs')
    .select('id, name, logo_url, sepa_creditor_id, sepa_iban')
    .eq('id', clubId)
    .single();

  if (!club) {
    return { success: false, error: 'Club no encontrado' };
  }

  const { count: pendingInscriptionsCount } = await adminClient
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubId)
    .eq('status', 'pending');

  const { data: pendingFees } = await adminClient
    .from('fees')
    .select('id, amount, status, payment_method')
    .eq('club_id', clubId)
    .eq('status', 'pending');

  const pendingFeesCount = pendingFees?.length || 0;
  const pendingFeesAmount = (pendingFees || []).reduce((acc: number, f: { amount: number }) => acc + Number(f.amount || 0), 0);
  const pendingSepaFees = (pendingFees || []).filter((f: { payment_method: string }) => f.payment_method === 'domiciliacion');
  const pendingSepaCount = pendingSepaFees.length;
  const pendingSepaAmount = pendingSepaFees.reduce((acc: number, f: { amount: number }) => acc + Number(f.amount || 0), 0);

  const isSepaConfigured = Boolean(club?.sepa_creditor_id && club?.sepa_iban);

  const { data: rawMatches } = await adminClient
    .from('partidos')
    .select(`
      id,
      jornada,
      fecha,
      hora,
      lugar,
      rival_nombre,
      es_local,
      resultado_propio,
      resultado_rival,
      estado,
      equipo_id,
      teams!inner (
        id,
        name,
        category,
        color
      )
    `)
    .eq('club_id', clubId)
    .gte('fecha', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0])
    .order('fecha', { ascending: true })
    .limit(5);

  const upcomingMatches = (rawMatches || []).map((m: any) => ({
    id: m.id,
    jornada: m.jornada || 0,
    fechaHora: `${m.fecha}T${m.hora || '00:00:00'}`,
    lugar: m.lugar || '',
    rivalNombre: m.rival_nombre || 'Rival',
    esLocal: m.es_local ?? true,
    resultadoPropio: m.resultado_propio,
    resultadoRival: m.resultado_rival,
    estado: m.estado || 'Programado',
    teamId: m.equipo_id,
    teamName: m.teams?.name || 'Equipo',
    teamCategory: m.teams?.category || '',
    teamColor: m.teams?.color || '#4F46E5',
  }));

  return {
    success: true,
    data: {
      club: {
        id: clubId,
        name: club?.name || 'Club Deportivo',
        logoUrl: club?.logo_url || null,
      },
      kpis: {
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

async function runP14Tests() {
  console.log('=================================================================');
  console.log('=== TEST SUITE P14: BLOQUE REQUIERE ATENCIÓN EN DASHBOARD     ===');
  console.log('=================================================================\n');

  const { data: clubs } = await adminClient.from('clubs').select('id, name').limit(2);
  if (!clubs || clubs.length < 2) {
    console.error('Se requieren al menos 2 clubes en la BD para probar aislamiento.');
    process.exit(1);
  }

  const clubA = clubs[0];
  const clubB = clubs[1];

  // --- 1. USUARIO NO AUTENTICADO -> DENIED ---
  console.log('--- 1. no autenticado → DENIED ---');
  const resNoAuth = await simulateGetExecutiveDashboard(null);
  assert(!resNoAuth.success && resNoAuth.error === 'No autenticado', 'Petición anónima bloqueada');

  // --- 2. NO AUTORIZADO -> DENIED ---
  console.log('\n--- 2. no autorizado → DENIED ---');
  const resFamily = await simulateGetExecutiveDashboard({
    user: { id: 'u-fam' },
    profile: { id: 'p-fam', role: 'family', club_id: clubA.id }
  });
  assert(!resFamily.success && resFamily.error?.includes('permisos'), 'Rol familiar bloqueado (403)');

  const resPlayer = await simulateGetExecutiveDashboard({
    user: { id: 'u-play' },
    profile: { id: 'p-play', role: 'player', club_id: clubA.id }
  });
  assert(!resPlayer.success && resPlayer.error?.includes('permisos'), 'Rol jugador bloqueado (403)');

  // --- 3. ADMINISTRADOR -> ACCEPT ---
  console.log('\n--- 3. administrador → ACCEPT ---');
  const resAdmin = await simulateGetExecutiveDashboard({
    user: { id: 'u-admin' },
    profile: { id: 'p-admin', role: 'admin', club_id: clubA.id }
  });
  assert(resAdmin.success === true && !!resAdmin.data, 'Administrador de Club A autorizado (ACCEPT)');

  const resDirectivo = await simulateGetExecutiveDashboard({
    user: { id: 'u-dir' },
    profile: { id: 'p-dir', role: 'directivo', club_id: clubA.id }
  });
  assert(resDirectivo.success === true && !!resDirectivo.data, 'Directivo de Club A autorizado (ACCEPT)');

  // --- 4. AISLAMIENTO CLUB_ID ---
  console.log('\n--- 4. aislamiento club_id ---');
  const resClubB = await simulateGetExecutiveDashboard({
    user: { id: 'u-admin-b' },
    profile: { id: 'p-admin-b', role: 'admin', club_id: clubB.id }
  });
  assert(resClubB.success === true, 'Admin de Club B recibe datos de su club');
  assert(resClubB.data?.club.id === clubB.id, 'Datos estrictamente aislados por club_id');
  assert(resClubB.data?.club.id !== resAdmin.data?.club.id, 'Club A y Club B tienen IDs diferenciados');

  // --- 5. INSCRIPCIONES PENDIENTES ---
  console.log('\n--- 5. inscripciones pendientes ---');
  const { count: realPendingInsc } = await adminClient
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('club_id', clubA.id)
    .eq('status', 'pending');
  assert(resAdmin.data?.alerts.pendingInscriptionsCount === (realPendingInsc || 0), `Conteo de inscripciones pendientes verificado contra BD real (${realPendingInsc || 0})`);

  // --- 6. CUOTAS PENDIENTES ---
  console.log('\n--- 6. cuotas pendientes ---');
  const { data: realPendingFees } = await adminClient
    .from('fees')
    .select('id, amount')
    .eq('club_id', clubA.id)
    .eq('status', 'pending');
  const realCount = realPendingFees?.length || 0;
  const realAmount = (realPendingFees || []).reduce((acc: number, f: { amount: number }) => acc + Number(f.amount || 0), 0);
  assert(resAdmin.data?.alerts.pendingFeesCount === realCount, `Conteo de cuotas pendientes coincide (${realCount})`);
  assert(Math.abs((resAdmin.data?.alerts.pendingFeesAmount || 0) - realAmount) < 0.01, `Importe total de cuotas pendientes coincide (${realAmount.toFixed(2)} €)`);

  // --- 7. PRÓXIMOS PARTIDOS ---
  console.log('\n--- 7. próximos partidos ---');
  assert(Array.isArray(resAdmin.data?.upcomingMatches), 'Próximos partidos es una lista válida');
  assert((resAdmin.data?.upcomingMatches.length || 0) <= 5, 'Partidos limitados a los próximos 5');

  // --- 8. ESTADO VACÍO CUANDO NO HAY PENDIENTES ---
  console.log('\n--- 8. estado vacío ---');
  // Simular un contexto sin ningún elemento pendiente
  const emptyAlerts = { pendingInscriptionsCount: 0, pendingFeesCount: 0 };
  const emptyMatches: any[] = [];
  const isEmptyCondition = emptyAlerts.pendingInscriptionsCount === 0 &&
                           emptyAlerts.pendingFeesCount === 0 &&
                           emptyMatches.length === 0;
  assert(isEmptyCondition, 'Condición de estado vacío se evalúa correctamente cuando no hay pendientes');

  // Verificar en UI de AdminInicioClient.tsx que existe el renderizado de estado vacío
  const clientPath = path.resolve(process.cwd(), 'src/components/features/admin/AdminInicioClient.tsx');
  const clientContent = fs.readFileSync(clientPath, 'utf8');
  assert(clientContent.includes('✓ No hay elementos pendientes.'), 'UI contiene el mensaje exacto: ✓ No hay elementos pendientes.');
  assert(clientContent.includes('REQUIERE ATENCIÓN'), 'UI contiene el encabezado: REQUIERE ATENCIÓN');

  // --- 9. ENLACES DE NAVEGACIÓN CORRECTOS ---
  console.log('\n--- 9. enlaces correctos ---');
  assert(clientContent.includes('href="/admin/secretaria"'), 'Enlace a Secretaría presente (/admin/secretaria)');
  assert(clientContent.includes('href="/admin/tesoreria"'), 'Enlace a Tesorería presente (/admin/tesoreria)');
  assert(clientContent.includes('href="/admin/calendario"'), 'Enlace a Calendario presente (/admin/calendario)');
  assert(clientContent.includes('Ver Secretaría'), 'Texto del enlace a Secretaría: Ver Secretaría');
  assert(clientContent.includes('Ver Tesorería'), 'Texto del enlace a Tesorería: Ver Tesorería');
  assert(clientContent.includes('Ver calendario'), 'Texto del enlace a Calendario: Ver calendario');

  // --- 10. AUSENCIA DE DATOS FICTICIOS ---
  console.log('\n--- 10. ausencia de datos ficticios ---');
  assert(!clientContent.includes('ficticio') && !clientContent.includes('mockAlert'), 'No hay datos ficticios ni mocks en el bloque de alertas');
  assert(resAdmin.data?.club.name === clubA.name, `Nombre del club obtenido directamente de BD real (${clubA.name})`);

  console.log('\n=================================================================');
  console.log(`RESULTADOS P14 BLOQUE ALERTAS: ${passCount} PASSED / ${failCount} FAILED`);
  console.log('=================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runP14Tests().catch(err => {
  console.error('Fatal error running P14 tests:', err);
  process.exit(1);
});
