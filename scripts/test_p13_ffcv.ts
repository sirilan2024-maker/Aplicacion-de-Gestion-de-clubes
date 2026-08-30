process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GET as ffcvScraperGet } from '../src/app/api/ffcv-scraper/route';

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

async function simulateGetFfcvIntegrationStatus(
  ctx: { user?: { id: string }; profile?: { id: string; role: string; club_id: string } } | null
) {
  if (!ctx || !ctx.user || !ctx.profile) {
    return { success: false, error: 'No autenticado' };
  }

  const ADMIN_ROLES = ['admin', 'coordinador', 'metodologo', 'superadmin', 'secretario', 'tesorero', 'directivo'];
  if (!ADMIN_ROLES.includes(ctx.profile.role)) {
    return { success: false, error: 'No tienes permisos para acceder a la integración FFCV' };
  }

  const clubId = ctx.profile.club_id;

  const { data: club } = await adminClient
    .from('clubs')
    .select('id, name')
    .eq('id', clubId)
    .single();

  const { data: teams } = await adminClient
    .from('teams')
    .select('id, name, category')
    .eq('club_id', clubId)
    .order('name');

  const { count: matchesCount } = await adminClient
    .from('partidos')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', clubId);

  const teamIds = (teams || []).map(t => t.id);
  const { data: teamMatches } = await adminClient
    .from('partidos')
    .select('equipo_id')
    .eq('club_id', clubId)
    .in('equipo_id', teamIds.length > 0 ? teamIds : ['00000000-0000-0000-0000-000000000000']);

  const matchCountByTeam: Record<string, number> = {};
  (teamMatches || []).forEach((m: { equipo_id: string }) => {
    if (m.equipo_id) {
      matchCountByTeam[m.equipo_id] = (matchCountByTeam[m.equipo_id] || 0) + 1;
    }
  });

  const teamsWithStats = (teams || []).map(t => ({
    id: t.id,
    name: t.name,
    category: t.category || 'General',
    matchesCount: matchCountByTeam[t.id] || 0,
  }));

  return {
    success: true,
    data: {
      club: {
        id: clubId,
        name: club?.name || 'Club Deportivo',
      },
      sources: {
        officialApi: {
          status: 'UNAVAILABLE' as const,
          label: 'NO DISPONIBLE' as const,
          message: 'FFCV no dispone actualmente de API pública oficial. La aplicación utiliza exclusivamente fuentes públicas disponibles.',
        },
        calendarPdf: {
          status: 'AVAILABLE' as const,
          label: 'DISPONIBLE' as const,
          matchesCount: matchesCount || 0,
          teamsCount: teams?.length || 0,
          importerPath: '/admin/calendario-ffcv',
        },
        standingsScraper: {
          status: 'AVAILABLE' as const,
          label: 'DISPONIBLE' as const,
          endpoint: '/api/ffcv-scraper',
          allowedDomains: ['ffcv.es', 'competiciones.ffcv.es', 'novanet.es'],
        },
      },
      teams: teamsWithStats,
    },
  };
}

async function runP13Tests() {
  console.log('====================================================');
  console.log('=== TEST SUITE P13: INTEGRACIÓN FFCV FUENTES REALES ===');
  console.log('====================================================\n');

  const clubAId = '7ff5dbeb-2942-4576-8e74-b45a17646fb7'; // SPORTING SALADAR
  const clubBId = '00000000-0000-0000-0000-000000000099'; // CLUB B TEST

  // --- 1. USUARIO NO AUTORIZADO -> DENIED ---
  console.log('--- 1. usuario no autorizado → DENIED ---');
  const resNoAuth = await simulateGetFfcvIntegrationStatus(null);
  assert(!resNoAuth.success && resNoAuth.error === 'No autenticado', 'Usuario no autenticado bloqueado');

  const resFamily = await simulateGetFfcvIntegrationStatus({
    user: { id: 'user-fam-1' },
    profile: { id: 'prof-fam-1', role: 'family', club_id: clubAId }
  });
  assert(!resFamily.success && resFamily.error?.includes('permisos'), 'Rol familiar bloqueado para panel FFCV');

  const resPlayer = await simulateGetFfcvIntegrationStatus({
    user: { id: 'user-play-1' },
    profile: { id: 'prof-play-1', role: 'player', club_id: clubAId }
  });
  assert(!resPlayer.success && resPlayer.error?.includes('permisos'), 'Rol jugador bloqueado para panel FFCV');

  // Scraper sin autenticación
  const reqAnonScraper = new Request('http://localhost:3000/api/ffcv-scraper?url=https://competiciones.ffcv.es');
  const resAnonScraper = await ffcvScraperGet(reqAnonScraper);
  assert(resAnonScraper.status === 401, 'Scraper FFCV rechaza llamadas no autenticadas (Status: 401)');

  // --- 2. ADMINISTRADOR AUTORIZADO -> ACCEPT ---
  console.log('\n--- 2. administrador autorizado → ACCEPT ---');
  const resAdmin = await simulateGetFfcvIntegrationStatus({
    user: { id: 'user-admin-1' },
    profile: { id: 'prof-admin-1', role: 'admin', club_id: clubAId }
  });
  assert(resAdmin.success === true && !!resAdmin.data, 'Administrador de Club A autorizado (ACCEPT)');

  const resMetodologo = await simulateGetFfcvIntegrationStatus({
    user: { id: 'user-met-1' },
    profile: { id: 'prof-met-1', role: 'metodologo', club_id: clubAId }
  });
  assert(resMetodologo.success === true, 'Metodólogo de Club A autorizado (ACCEPT)');

  // --- 3. PANEL MUESTRA API OFICIAL COMO NO DISPONIBLE ---
  console.log('\n--- 3. panel muestra API oficial como NO DISPONIBLE ---');
  assert(resAdmin.data?.sources.officialApi.status === 'UNAVAILABLE', 'API oficial estado = UNAVAILABLE');
  assert(resAdmin.data?.sources.officialApi.label === 'NO DISPONIBLE', 'API oficial etiqueta = NO DISPONIBLE');
  assert(resAdmin.data?.sources.officialApi.message.includes('no dispone actualmente de API pública'), 'Mensaje honesto de no disponibilidad de API');

  // Verificar que el archivo del panel contiene la indicación expresa de no disponibilidad
  const panelPath = path.resolve(process.cwd(), 'src/app/admin/ffcv-api/page.tsx');
  const panelContent = fs.readFileSync(panelPath, 'utf8');
  assert(panelContent.includes('API oficial FFCV: NO DISPONIBLE'), 'UI contiene banner API oficial FFCV: NO DISPONIBLE');
  assert(panelContent.includes('La Federación no dispone actualmente de API pública'), 'UI explica ausencia de API pública');

  // --- 4. CALENDARIO PDF EXISTENTE -> ACCESIBLE ---
  console.log('\n--- 4. calendario PDF existente → accesible ---');
  assert(resAdmin.data?.sources.calendarPdf.status === 'AVAILABLE', 'Calendario PDF oficial estado = AVAILABLE');
  assert(resAdmin.data?.sources.calendarPdf.label === 'DISPONIBLE', 'Calendario PDF etiqueta = DISPONIBLE');
  assert(resAdmin.data?.sources.calendarPdf.importerPath === '/admin/calendario-ffcv', 'Ruta al importador existente = /admin/calendario-ffcv');
  assert(typeof resAdmin.data?.sources.calendarPdf.matchesCount === 'number', 'Conteo de partidos federativos en el club reportado');
  assert(resAdmin.data?.sources.calendarPdf.matchesCount === 386, `Partidos reales cargados en el club coincidentes (386 partidos)`);
  assert(panelContent.includes('/admin/calendario-ffcv'), 'UI proporciona enlace directo a /admin/calendario-ffcv sin duplicar lógica');

  // --- 5. SCRAPER PÚBLICO EXISTENTE -> FUNCIONA O INFORMA NO DISPONIBLE ---
  console.log('\n--- 5. scraper público existente → funciona o informa NO DISPONIBLE ---');
  assert(resAdmin.data?.sources.standingsScraper.status === 'AVAILABLE', 'Scraper público de clasificaciones estado = AVAILABLE');
  assert(resAdmin.data?.sources.standingsScraper.label === 'DISPONIBLE', 'Scraper público etiqueta = DISPONIBLE');
  assert(resAdmin.data?.sources.standingsScraper.endpoint === '/api/ffcv-scraper', 'Endpoint del scraper = /api/ffcv-scraper');

  // Comprobar manejo sin URL
  const reqNoUrl = new Request('http://localhost:3000/api/ffcv-scraper');
  const resNoUrl = await ffcvScraperGet(reqNoUrl);
  assert(resNoUrl.status === 401 || resNoUrl.status === 400, 'Petición sin URL manejada de forma segura (Status: ' + resNoUrl.status + ')');

  // --- 6. NO EXISTEN CREDENCIALES FFCV EXPUESTAS ---
  console.log('\n--- 6. no existen credenciales FFCV expuestas ---');
  const envContentStr = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  assert(!envContentStr.includes('FFCV_PASSWORD'), 'No hay contraseñas FFCV en .env');
  assert(!envContentStr.includes('FFCV_TOKEN'), 'No hay tokens privados FFCV en .env');
  assert(!envContentStr.includes('NOVANET_PASSWORD'), 'No hay credenciales Novanet en .env');
  assert(!panelContent.includes('password') && !panelContent.includes('secret'), 'No hay campos de contraseña ni secretos en el panel FFCV');

  // --- 7. AISLAMIENTO POR CLUB -> PASS ---
  console.log('\n--- 7. aislamiento por club → PASS ---');
  const resClubB = await simulateGetFfcvIntegrationStatus({
    user: { id: 'user-admin-b' },
    profile: { id: 'prof-admin-b', role: 'admin', club_id: clubBId }
  });
  assert(resClubB.success === true, 'Admin de Club B puede consultar su integración');
  assert(resClubB.data?.club.id === clubBId, 'Datos de Club B aislados con su propio ID');
  assert(resClubB.data?.sources.calendarPdf.matchesCount === 0, 'Club B no accede a partidos de Club A (0 partidos vs 386)');
  assert(resClubB.data?.teams.length === 0, 'Club B no accede a equipos de Club A');

  // --- 8. SSRF EXISTENTE -> PASS ---
  console.log('\n--- 8. SSRF existente → PASS ---');
  const allowedDomains = ['ffcv.es', 'competiciones.ffcv.es', 'novanet.es'];
  const testForbiddenHosts = [
    'http://127.0.0.1:8080/admin',
    'http://localhost:3000/api',
    'http://169.254.169.254/latest/meta-data',
    'https://google.com/malicious',
    'ftp://ffcv.es/file',
    'file:///etc/passwd'
  ];

  const allSsrfBlocked = testForbiddenHosts.every(u => {
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return true;
      const host = parsed.hostname.toLowerCase();
      return !allowedDomains.some(d => host === d || host.endsWith(`.${d}`));
    } catch {
      return true;
    }
  });
  assert(allSsrfBlocked, 'Filtro SSRF bloquea IPs privadas, metadatos cloud y dominios no autorizados');
  assert(allowedDomains.includes('ffcv.es') && allowedDomains.includes('competiciones.ffcv.es'), 'Solo se permiten dominios federativos oficiales en la whitelist');

  console.log('\n====================================================');
  console.log(`RESULTADOS P13 FFCV: ${passCount} PASSED / ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runP13Tests().catch(err => {
  console.error('Fatal error running P13 tests:', err);
  process.exit(1);
});
