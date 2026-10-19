/**
 * scripts/test-postgres-isolated-runner.ts
 * 
 * Sporting Saladar — Validador Aislado de Migración y RLS en Contenedor PostgreSQL Desechable.
 * 
 * SEGURIDAD ESTRICTA:
 * 1. Solo se conecta si el puerto y contenedor coinciden exactamente con la configuración de prueba aislada.
 * 2. Jamás toca bases de datos de producción ni variables de .env.local.
 * 3. Ejecuta pruebas sobre una base de datos efímera creada ex profeso y se desconecta de forma limpia.
 */

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

export interface TestConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

export const DEFAULT_ISOLATED_CONFIG: TestConfig = {
  host: '127.0.0.1',
  port: 54329, // Puerto reservado exclusivo para no colisionar con 5432
  user: 'postgres',
  password: 'test_password_isolated_123',
  database: 'test_sporting_isolated',
};

async function executeSqlFile(client: Client, filePath: string) {
  const content = fs.readFileSync(filePath, 'utf-8');
  await client.query(content);
}

// Helper para cambiar el contexto de usuario en la sesión de PostgreSQL simulando Supabase Auth
async function setAuthUser(client: Client, userId: string | null) {
  if (userId) {
    await client.query(`SET request.jwt.claim.sub = '${userId}';`);
    await client.query(`SET ROLE authenticated;`);
  } else {
    await client.query(`RESET request.jwt.claim.sub;`);
    await client.query(`SET ROLE anon;`);
  }
}

async function run() {
  console.log('--- SUITE DE VALIDACIÓN POSTGRESQL & RLS AISLADA ---');
  console.log(`Conectando exclusivamente a destino aislado: ${DEFAULT_ISOLATED_CONFIG.host}:${DEFAULT_ISOLATED_CONFIG.port}/${DEFAULT_ISOLATED_CONFIG.database}`);

  const adminClient = new Client({
    host: DEFAULT_ISOLATED_CONFIG.host,
    port: DEFAULT_ISOLATED_CONFIG.port,
    user: DEFAULT_ISOLATED_CONFIG.user,
    password: DEFAULT_ISOLATED_CONFIG.password,
    database: DEFAULT_ISOLATED_CONFIG.database,
  });

  try {
    await adminClient.connect();
  } catch (err: any) {
    console.error('\n[ERROR DE CONEXIÓN AL CONTENEDOR TEMPORAL]');
    console.error(`No se pudo conectar a ${DEFAULT_ISOLATED_CONFIG.host}:${DEFAULT_ISOLATED_CONFIG.port}.`);
    console.error('Asegúrate de que el contenedor de prueba esté activo en el puerto 54329.');
    console.error(`Detalle: ${err.message}`);
    process.exit(1);
  }

  // 1. Guardia de Seguridad Exhaustiva: Verificar que estamos en la BD de pruebas y no en un host remoto ni en la BD principal
  // 1.1 Verificación del cliente: El socket del cliente DEBE apuntar exactamente a 127.0.0.1 y puerto 54329
  const clientTargetHost = (adminClient as any).connectionParameters?.host || DEFAULT_ISOLATED_CONFIG.host;
  const clientTargetPort = (adminClient as any).connectionParameters?.port || DEFAULT_ISOLATED_CONFIG.port;
  const clientTargetDb = (adminClient as any).connectionParameters?.database || DEFAULT_ISOLATED_CONFIG.database;

  if (
    clientTargetHost !== '127.0.0.1' && clientTargetHost !== 'localhost' ||
    clientTargetPort !== DEFAULT_ISOLATED_CONFIG.port ||
    clientTargetDb !== DEFAULT_ISOLATED_CONFIG.database
  ) {
    console.error(`[GUARDIA DE SEGURIDAD VIOLADA] Configuración de cliente no autorizada.`);
    console.error(`Destino configurado: ${clientTargetHost}:${clientTargetPort}/${clientTargetDb}`);
    console.error(`Esperado exclusivamente: 127.0.0.1:${DEFAULT_ISOLATED_CONFIG.port}/${DEFAULT_ISOLATED_CONFIG.database}`);
    await adminClient.end();
    process.exit(1);
  }

  // 1.2 Verificación en el servidor PostgreSQL
  const dbCheck = await adminClient.query(`
    SELECT 
      current_database() AS current_database, 
      inet_server_port() AS inet_server_port,
      inet_server_addr() AS inet_server_addr,
      current_user AS current_user;
  `);
  const currentDb = dbCheck.rows[0].current_database;
  const currentPort = dbCheck.rows[0].inet_server_port; // En Docker suele ser 5432 internamente
  const currentAddr = String(dbCheck.rows[0].inet_server_addr || '');

  // Permitir loopback local o red puente de contenedor Docker (172.x o 127.x o vacío para unix socket)
  const isAllowedHost = currentAddr === '127.0.0.1' || currentAddr === '::1' || currentAddr.startsWith('172.') || currentAddr === '';
  const isAllowedServerPort = currentPort === 5432 || currentPort === DEFAULT_ISOLATED_CONFIG.port;

  if (
    currentDb !== DEFAULT_ISOLATED_CONFIG.database || 
    !isAllowedServerPort ||
    !isAllowedHost
  ) {
    console.error(`[GUARDIA DE SEGURIDAD VIOLADA] Conexión rechazada. Servidor interno: ${currentAddr}:${currentPort}, BD: ${currentDb}`);
    console.error(`Esperado exclusivamente base de datos: ${DEFAULT_ISOLATED_CONFIG.database}`);
    await adminClient.end();
    process.exit(1);
  }

  // 1.3 Verificación de ausencia de tablas críticas de producción (antídoto contra colisiones involuntarias)
  const prodCheck = await adminClient.query(`
    SELECT count(*) AS prod_tables 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name IN ('ffcv_matches', 'ffcv_standings', 'official_receipts', 'payments');
  `);
  if (parseInt(prodCheck.rows[0].prod_tables) > 0) {
    console.error('[GUARDIA DE SEGURIDAD VIOLADA] Se detectaron tablas de producción preexistentes en este entorno. ABORTANDO INMEDIATAMENTE.');
    await adminClient.end();
    process.exit(1);
  }

  console.log('✓ Guardia de seguridad verificada: Destino estrictamente local, puerto 54329 y entorno limpio sin tablas de producción.\n');


  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FALLÓ: ${msg}`);
      failed++;
    }
  }

  try {
    // 2. Crear roles Supabase si no existen (anon, authenticated, service_role, y rol de conexión no-superuser)
    await adminClient.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
          CREATE ROLE anon NOLOGIN NOSUPERUSER NOBYPASSRLS;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
          CREATE ROLE authenticated NOLOGIN NOSUPERUSER NOBYPASSRLS;
        END IF;
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
          CREATE ROLE service_role NOLOGIN NOSUPERUSER BYPASSRLS;
        END IF;
        -- Rol no-superuser que emula a PostgREST ('authenticator') para ejecutar las pruebas RLS
        IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'test_authenticator') THEN
          CREATE ROLE test_authenticator WITH LOGIN PASSWORD 'test_auth_password_123' NOSUPERUSER NOBYPASSRLS;
        END IF;
      END
      $$;

      GRANT anon, authenticated TO test_authenticator;
      GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, test_authenticator;
      GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, test_authenticator;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role, test_authenticator;
    `);


    // 3. Aplicar Esquema Base Real
    const baseSchemaPath = path.resolve(__dirname, 'sql/test-base-dependencies.sql');
    await executeSqlFile(adminClient, baseSchemaPath);
    console.log('✓ Esquema base real aplicado exitosamente.');

    // 4. Aplicar Migración de Rendimiento
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20261012_performance_wellness_and_feedback.sql');
    await executeSqlFile(adminClient, migrationPath);
    console.log('✓ Migración 20261012_performance_wellness_and_feedback.sql aplicada exitosamente.');

    // 5. Sembrar Datos Ficticios para Tests de Autorización y RLS
    console.log('\n--- SEMBRANDO DATOS FICTICIOS AISLADOS ---');
    const uClubA = '11111111-0000-0000-0000-000000000001';
    const uClubB = '22222222-0000-0000-0000-000000000002'; // Club rival (cross-tenant)

    const uAdminA = 'aaaaaaaa-1111-0000-0000-000000000001';
    const uCoachA1 = 'aaaaaaaa-2222-0000-0000-000000000001'; // Entrenador Equipo 1
    const uCoachA2 = 'aaaaaaaa-3333-0000-0000-000000000001'; // Entrenador Equipo 2
    const uTutor1 = 'aaaaaaaa-4444-0000-0000-000000000001';  // Tutor legal primario
    const uTutor2 = 'aaaaaaaa-5555-0000-0000-000000000001';  // Segundo tutor legal (player_tutors)
    const uUnlinkedTutor = 'aaaaaaaa-6666-0000-0000-000000000001'; // Tutor sin vínculo
    const uPlayerUser = 'aaaaaaaa-7777-0000-0000-000000000001'; // Jugador con usuario propio

    const uTeam1 = 'bbbbbbbb-1111-0000-0000-000000000001';
    const uTeam2 = 'bbbbbbbb-2222-0000-0000-000000000002';

    const uPlayer1 = 'cccccccc-1111-0000-0000-000000000001'; // Menor en Team 1
    const uPlayer2 = 'cccccccc-2222-0000-0000-000000000002'; // Jugador con cuenta en Team 2
    const uPlayer3 = 'cccccccc-3333-0000-0000-000000000003'; // Segundo menor en Team 1 tutelado por uTutor1 (para pruebas RLS de fecha)

    const uEvent1 = 'dddddddd-1111-0000-0000-000000000001'; // Entrenamiento Team 1

    await adminClient.query(`
      -- Insertar Clubs
      INSERT INTO public.clubs (id, nombre) VALUES ('${uClubA}', 'Club A Test'), ('${uClubB}', 'Club B Rival');

      -- Insertar Auth Users
      INSERT INTO auth.users (id, email) VALUES 
        ('${uAdminA}', 'admin@cluba.test'),
        ('${uCoachA1}', 'coach1@cluba.test'),
        ('${uCoachA2}', 'coach2@cluba.test'),
        ('${uTutor1}', 'tutor1@cluba.test'),
        ('${uTutor2}', 'tutor2@cluba.test'),
        ('${uUnlinkedTutor}', 'unlinked@cluba.test'),
        ('${uPlayerUser}', 'player@cluba.test');

      -- Insertar Profiles
      INSERT INTO public.profiles (id, club_id, first_name, last_name, role) VALUES
        ('${uAdminA}', '${uClubA}', 'Admin', 'ClubA', 'admin'),
        ('${uCoachA1}', '${uClubA}', 'Coach', 'Team1', 'entrenador'),
        ('${uCoachA2}', '${uClubA}', 'Coach', 'Team2', 'entrenador'),
        ('${uTutor1}', '${uClubA}', 'Padre', 'Perez', 'tutor'),
        ('${uTutor2}', '${uClubA}', 'Madre', 'Perez', 'tutor'),
        ('${uUnlinkedTutor}', '${uClubA}', 'Otro', 'Padre', 'tutor'),
        ('${uPlayerUser}', '${uClubA}', 'Jugador', 'Propio', 'jugador');

      -- Insertar Equipos
      INSERT INTO public.teams (id, club_id, name, category, coach_id) VALUES
        ('${uTeam1}', '${uClubA}', 'Cadete A', 'Cadete', '${uCoachA1}'),
        ('${uTeam2}', '${uClubA}', 'Juvenil A', 'Juvenil', '${uCoachA2}');

      -- Insertar Jugadores
      INSERT INTO public.players (id, club_id, team_id, first_name, last_name, birth_date, tutor_id, user_auth_id) VALUES
        ('${uPlayer1}', '${uClubA}', '${uTeam1}', 'Lucas', 'Perez', '2012-05-10', '${uTutor1}', NULL),
        ('${uPlayer2}', '${uClubA}', '${uTeam2}', 'Mateo', 'Gomez', '2008-03-15', NULL, '${uPlayerUser}'),
        ('${uPlayer3}', '${uClubA}', '${uTeam1}', 'Marcos', 'Perez', '2014-07-20', '${uTutor1}', NULL);

      -- Vincular Segundo Tutor en player_tutors
      INSERT INTO public.player_tutors (player_id, tutor_id, is_primary) VALUES
        ('${uPlayer1}', '${uTutor2}', false);

      -- Insertar Evento de Entrenamiento
      INSERT INTO public.team_events (id, team_id, title, event_type, date, start_time, end_time) VALUES
        ('${uEvent1}', '${uTeam1}', 'Entrenamiento Táctico', 'Entrenamiento', '2026-10-15', '18:00', '19:30');
    `);
    console.log('✓ Sembrado completado.');

    // 6. PRUEBAS DE INSERCIÓN, RESTRICCIONES Y CHECKS
    console.log('\n--- 1. Restricciones de Dominio y Escala ---');

    // 6.1 Escala Hooper fuera de rango (sleep_quality = 6)
    let checkViolation = false;
    try {
      await adminClient.query(`
        INSERT INTO public.player_daily_wellness 
          (club_id, player_id, date, sleep_quality, fatigue, soreness, stress, mood)
        VALUES ('${uClubA}', '${uPlayer1}', '2026-10-15', 6, 2, 2, 1, 4);
      `);
    } catch (e: any) {
      checkViolation = e.message.includes('player_daily_wellness_sleep_quality_check') || e.code === '23514';
    }
    assert(checkViolation, 'PostgreSQL rechaza valor de Hooper fuera de rango (sleep_quality = 6)');

    // 6.2 Escala Hooper correcta (1 a 5)
    await adminClient.query(`
      INSERT INTO public.player_daily_wellness 
        (club_id, player_id, date, sleep_quality, fatigue, soreness, stress, mood, source_event_id)
      VALUES ('${uClubA}', '${uPlayer1}', '2026-10-15', 4, 2, 3, 1, 5, '${uEvent1}');
    `);
    assert(true, 'PostgreSQL acepta registro de Hooper en rango 1-5');

    // 6.3 Restricción de Unicidad Diaria (uq_player_daily_wellness_player_date)
    let uniqueViolation = false;
    try {
      await adminClient.query(`
        INSERT INTO public.player_daily_wellness 
          (club_id, player_id, date, sleep_quality, fatigue, soreness, stress, mood)
        VALUES ('${uClubA}', '${uPlayer1}', '2026-10-15', 3, 3, 3, 3, 3);
      `);
    } catch (e: any) {
      uniqueViolation = e.code === '23505';
    }
    assert(uniqueViolation, 'PostgreSQL rechaza inserción duplicada en la misma fecha para el mismo jugador (UNIQUE player_id, date)');

    // 6.4 Feedback post-sesión: RPE fuera de rango (rpe = 11 y rpe = -1)
    let rpeViolation = false;
    try {
      await adminClient.query(`
        INSERT INTO public.player_session_feedback 
          (club_id, event_id, player_id, rpe, minutes_played)
        VALUES ('${uClubA}', '${uEvent1}', '${uPlayer1}', 11, 75);
      `);
    } catch (e: any) {
      rpeViolation = e.code === '23514';
    }
    assert(rpeViolation, 'PostgreSQL rechaza RPE fuera de rango superior (rpe = 11)');

    let rpeNegativeViolation = false;
    try {
      await adminClient.query(`
        INSERT INTO public.player_session_feedback 
          (club_id, event_id, player_id, rpe, minutes_played)
        VALUES ('${uClubA}', '${uEvent1}', '${uPlayer1}', -1, 0);
      `);
    } catch (e: any) {
      rpeNegativeViolation = e.code === '23514';
    }
    assert(rpeNegativeViolation, 'PostgreSQL rechaza RPE negativo fuera de rango (rpe = -1)');

    // 6.5 Feedback post-sesión válido (RPE = 8 y RPE = 0)
    await adminClient.query(`
      INSERT INTO public.player_session_feedback 
        (club_id, event_id, player_id, rpe, minutes_played, training_load)
      VALUES ('${uClubA}', '${uEvent1}', '${uPlayer1}', 8, 75, 600);
    `);
    assert(true, 'PostgreSQL acepta feedback post-sesión válido con cálculo sRPE');

    await adminClient.query(`
      INSERT INTO public.player_session_feedback 
        (club_id, event_id, player_id, rpe, minutes_played, training_load)
      VALUES ('${uClubA}', '${uEvent1}', '${uPlayer2}', 0, 0, 0);
    `);
    assert(true, 'PostgreSQL acepta feedback post-sesión con RPE = 0 y minutos = 0 (reposo)');

    // 7. PRUEBAS DE POLÍTICAS RLS (Row Level Security)
    console.log('\n--- 2. Pruebas de Políticas RLS y Aislamiento de Autorización ---');

    // Creamos un segundo cliente conectado como 'test_authenticator' (NO superuser, NO bypassrls),
    // reproduciendo fielmente el funcionamiento de PostgREST en Supabase.
    const rlsClient = new Client({
      host: DEFAULT_ISOLATED_CONFIG.host,
      port: DEFAULT_ISOLATED_CONFIG.port,
      user: 'test_authenticator',
      password: 'test_auth_password_123',
      database: DEFAULT_ISOLATED_CONFIG.database,
    });
    await rlsClient.connect();


    // 7.1 Admin del Club: Lectura global del club
    await setAuthUser(rlsClient, uAdminA);
    const adminSelect = await rlsClient.query('SELECT COUNT(*) FROM public.player_daily_wellness;');
    assert(parseInt(adminSelect.rows[0].count) === 1, 'Admin del club tiene visibilidad de registros de bienestar de su club');

    // 7.2 Entrenador Asignado a Team 1 (uCoachA1): Puede ver a jugadores de Team 1
    await setAuthUser(rlsClient, uCoachA1);
    const coach1Select = await rlsClient.query(`SELECT COUNT(*) FROM public.player_daily_wellness WHERE player_id = '${uPlayer1}';`);
    assert(parseInt(coach1Select.rows[0].count) === 1, 'Entrenador asignado al equipo ve el bienestar de su jugador');

    // 7.3 Entrenador No Asignado (uCoachA2): NO puede ver a jugadores de Team 1
    await setAuthUser(rlsClient, uCoachA2);
    const coach2Select = await rlsClient.query(`SELECT COUNT(*) FROM public.player_daily_wellness WHERE player_id = '${uPlayer1}';`);
    assert(parseInt(coach2Select.rows[0].count) === 0, 'Entrenador de otro equipo NO tiene visibilidad del bienestar de jugadores no asignados');

    // 7.4 Tutor Legal Primario (uTutor1): Puede ver los registros de su hijo (uPlayer1)
    await setAuthUser(rlsClient, uTutor1);
    const tutor1Select = await rlsClient.query(`SELECT COUNT(*) FROM public.player_daily_wellness WHERE player_id = '${uPlayer1}';`);
    assert(parseInt(tutor1Select.rows[0].count) === 1, 'Tutor legal directo (tutor_id) puede ver el bienestar de su menor');

    // 7.5 Segundo Tutor Vinculado (uTutor2 vía player_tutors): Puede ver los registros del menor
    await setAuthUser(rlsClient, uTutor2);
    const tutor2Select = await rlsClient.query(`SELECT COUNT(*) FROM public.player_daily_wellness WHERE player_id = '${uPlayer1}';`);
    assert(parseInt(tutor2Select.rows[0].count) === 1, 'Segundo tutor legal (player_tutors) tiene acceso autorizado al bienestar del menor');

    // 7.6 Tutor No Vinculado (uUnlinkedTutor): NO puede ver los registros del menor
    await setAuthUser(rlsClient, uUnlinkedTutor);
    const unlinkedSelect = await rlsClient.query(`SELECT COUNT(*) FROM public.player_daily_wellness WHERE player_id = '${uPlayer1}';`);
    assert(parseInt(unlinkedSelect.rows[0].count) === 0, 'Tutor no vinculado está bloqueado por RLS');

    // 7.7 Jugador con Cuenta Propia (uPlayerUser): Puede consultar su propio registro
    // Primero insertamos un registro para uPlayer2
    await adminClient.query(`
      INSERT INTO public.player_daily_wellness 
        (club_id, player_id, date, sleep_quality, fatigue, soreness, stress, mood)
      VALUES ('${uClubA}', '${uPlayer2}', '2026-10-15', 5, 1, 2, 1, 5);
    `);
    await setAuthUser(rlsClient, uPlayerUser);
    const ownPlayerSelect = await rlsClient.query(`SELECT COUNT(*) FROM public.player_daily_wellness WHERE player_id = '${uPlayer2}';`);
    const otherPlayerSelect = await rlsClient.query(`SELECT COUNT(*) FROM public.player_daily_wellness WHERE player_id = '${uPlayer1}';`);
    assert(parseInt(ownPlayerSelect.rows[0].count) === 1, 'Jugador con login propio accede a su propio bienestar');
    assert(parseInt(otherPlayerSelect.rows[0].count) === 0, 'Jugador tiene terminantemente bloqueado el acceso al bienestar de otros jugadores');

    // 7.8 Inserción No Autorizada por RLS: Tutor intentando registrar para un jugador ajeno
    await setAuthUser(rlsClient, uTutor1);
    let tutorInsertBlocked = false;
    try {
      await rlsClient.query(`
        INSERT INTO public.player_daily_wellness 
          (club_id, player_id, date, sleep_quality, fatigue, soreness, stress, mood)
        VALUES ('${uClubA}', '${uPlayer2}', (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::DATE, 3, 3, 3, 3, 3);
      `);
    } catch (e: any) {
      tutorInsertBlocked = e.code === '42501'; // new row violates row-level security policy
    }
    assert(tutorInsertBlocked, 'RLS bloquea inserción de bienestar cuando el tutor intenta registrar para un menor ajeno');

    // 7.8.1 Protección de Fechas RLS: Tutor registrando para su menor en fecha PASADA (debe ser bloqueado por RLS)
    await setAuthUser(rlsClient, uTutor1);
    let pastDateBlocked = false;
    try {
      await rlsClient.query(`
        INSERT INTO public.player_daily_wellness 
          (club_id, player_id, date, sleep_quality, fatigue, soreness, stress, mood)
        VALUES ('${uClubA}', '${uPlayer3}', ((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid') - INTERVAL '2 days')::DATE, 3, 3, 3, 3, 3);
      `);
    } catch (e: any) {
      pastDateBlocked = e.code === '42501';
    }
    assert(pastDateBlocked, 'RLS bloquea inserción de bienestar retroactivo en fecha pasada para tutor/jugador');

    // 7.8.2 Protección de Fechas RLS: Tutor registrando para su menor en fecha FUTURA (debe ser bloqueado por RLS)
    let futureDateBlocked = false;
    try {
      await rlsClient.query(`
        INSERT INTO public.player_daily_wellness 
          (club_id, player_id, date, sleep_quality, fatigue, soreness, stress, mood)
        VALUES ('${uClubA}', '${uPlayer3}', ((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid') + INTERVAL '1 day')::DATE, 3, 3, 3, 3, 3);
      `);
    } catch (e: any) {
      futureDateBlocked = e.code === '42501';
    }
    assert(futureDateBlocked, 'RLS bloquea inserción de bienestar en fecha futura para tutor/jugador');

    // 7.8.3 Protección de Fechas RLS: Tutor registrando para su menor en la fecha ACTUAL de hoy (debe ser ACEPTADO por RLS)
    let todayInsertSucceeded = false;
    try {
      await rlsClient.query(`
        INSERT INTO public.player_daily_wellness 
          (club_id, player_id, date, sleep_quality, fatigue, soreness, stress, mood)
        VALUES ('${uClubA}', '${uPlayer3}', (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::DATE, 2, 2, 2, 2, 2);
      `);
      todayInsertSucceeded = true;
    } catch (e: any) {
      todayInsertSucceeded = false;
    }
    assert(todayInsertSucceeded, 'RLS acepta inserción de bienestar para la fecha actual en curso');

    // 7.8.4 Protección de Fechas RLS: Modificación de fecha vía UPDATE hacia el pasado (debe ser BLOQUEADA por RLS)
    let updateToPastBlocked = false;
    try {
      await rlsClient.query(`
        UPDATE public.player_daily_wellness 
        SET date = ((CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid') - INTERVAL '5 days')::DATE
        WHERE player_id = '${uPlayer3}' AND date = (CURRENT_TIMESTAMP AT TIME ZONE 'Europe/Madrid')::DATE;
      `);
    } catch (e: any) {
      updateToPastBlocked = e.code === '42501';
    }
    assert(updateToPastBlocked, 'RLS bloquea alteración de fecha a una fecha pasada vía UPDATE');

    // 7.8.5 Perfil Administrador / Preparador Físico: Puede insertar registros con justificación para fechas históricas
    await setAuthUser(rlsClient, uAdminA);
    let adminHistoricalInsertSucceeded = false;
    try {
      await rlsClient.query(`
        INSERT INTO public.player_daily_wellness 
          (club_id, player_id, date, sleep_quality, fatigue, soreness, stress, mood)
        VALUES ('${uClubA}', '${uPlayer1}', '2026-09-01', 3, 3, 3, 3, 3);
      `);
      adminHistoricalInsertSucceeded = true;
    } catch (e: any) {
      adminHistoricalInsertSucceeded = false;
    }
    assert(adminHistoricalInsertSucceeded, 'Administrador del club tiene potestad autorizada para asentar registros basales históricos');

    // 7.9 Aislamiento Estricto entre Clubes (Cross-Tenant): Admin de Club Rival (uClubB)
    const uAdminB = 'aaaaaaaa-8888-0000-0000-000000000002';
    await adminClient.query(`
      INSERT INTO auth.users (id, email) VALUES ('${uAdminB}', 'admin@clubb.test');
      INSERT INTO public.profiles (id, club_id, first_name, last_name, role) VALUES ('${uAdminB}', '${uClubB}', 'Admin', 'ClubB', 'admin');
    `);
    await setAuthUser(rlsClient, uAdminB);
    const crossTenantSelect = await rlsClient.query(`SELECT COUNT(*) FROM public.player_daily_wellness;`);
    assert(parseInt(crossTenantSelect.rows[0].count) === 0, 'Admin de club rival tiene 0 visibilidad de registros de otro club (Aislamiento cross-tenant)');

    // 7.10 RLS en player_session_discomfort_incidents
    // Insertamos una incidencia con adminClient para uPlayer1
    await adminClient.query(`
      INSERT INTO public.player_session_discomfort_incidents
        (club_id, player_id, event_id, timing, zone, intensity, notes)
      VALUES
        ('${uClubA}', '${uPlayer1}', '${uEvent1}', 'pre_session', 'Gemelo izquierdo', 6, 'Sobrecarga previa');
    `);

    // Entrenador de Team 1 (uCoachA1) ve la incidencia
    await setAuthUser(rlsClient, uCoachA1);
    const coachIncSelect = await rlsClient.query(`SELECT COUNT(*) FROM public.player_session_discomfort_incidents WHERE player_id = '${uPlayer1}';`);
    assert(parseInt(coachIncSelect.rows[0].count) === 1, 'Entrenador asignado ve la incidencia de molestia de su jugador');

    // Entrenador no asignado (uCoachA2) NO ve la incidencia
    await setAuthUser(rlsClient, uCoachA2);
    const unassignedCoachIncSelect = await rlsClient.query(`SELECT COUNT(*) FROM public.player_session_discomfort_incidents WHERE player_id = '${uPlayer1}';`);
    assert(parseInt(unassignedCoachIncSelect.rows[0].count) === 0, 'Entrenador no asignado NO ve incidencias de molestias de otros equipos');

    // Tutor legal (uTutor1) ve la incidencia de su hijo
    await setAuthUser(rlsClient, uTutor1);
    const tutorIncSelect = await rlsClient.query(`SELECT COUNT(*) FROM public.player_session_discomfort_incidents WHERE player_id = '${uPlayer1}';`);
    assert(parseInt(tutorIncSelect.rows[0].count) === 1, 'Tutor legal ve la incidencia de molestia de su hijo');

    // Tutor no vinculado (uUnlinkedTutor) NO ve la incidencia
    await setAuthUser(rlsClient, uUnlinkedTutor);
    const unlinkedIncSelect = await rlsClient.query(`SELECT COUNT(*) FROM public.player_session_discomfort_incidents WHERE player_id = '${uPlayer1}';`);
    assert(parseInt(unlinkedIncSelect.rows[0].count) === 0, 'Tutor no vinculado tiene bloqueada la consulta de incidencias por RLS');

    // 7.11 RLS en player_session_feedback
    // Entrenador asignado ve el feedback
    await setAuthUser(rlsClient, uCoachA1);
    const coachFeedSelect = await rlsClient.query(`SELECT COUNT(*) FROM public.player_session_feedback WHERE player_id = '${uPlayer1}';`);
    assert(parseInt(coachFeedSelect.rows[0].count) === 1, 'Entrenador asignado ve el feedback post-sesión de su jugador');

    // Entrenador no asignado NO ve el feedback
    await setAuthUser(rlsClient, uCoachA2);
    const unassignedCoachFeedSelect = await rlsClient.query(`SELECT COUNT(*) FROM public.player_session_feedback WHERE player_id = '${uPlayer1}';`);
    assert(parseInt(unassignedCoachFeedSelect.rows[0].count) === 0, 'Entrenador no asignado NO ve el feedback post-sesión de jugadores ajenos');

    // Tutor legal (uTutor1) NO puede cambiar validation_status a 'confirmed'
    await setAuthUser(rlsClient, uTutor1);
    let tutorConfirmBlocked = false;
    try {
      await rlsClient.query(`
        UPDATE public.player_session_feedback
        SET validation_status = 'confirmed'
        WHERE player_id = '${uPlayer1}' AND event_id = '${uEvent1}';
      `);
    } catch (e: any) {
      tutorConfirmBlocked = e.code === '42501';
    }
    assert(tutorConfirmBlocked, 'RLS bloquea que el tutor/jugador cambie validation_status a confirmed');

    // Entrenador asignado (uCoachA1) SÍ puede cambiar validation_status a 'confirmed'
    await setAuthUser(rlsClient, uCoachA1);
    let coachConfirmSucceeded = false;
    try {
      await rlsClient.query(`
        UPDATE public.player_session_feedback
        SET validation_status = 'confirmed'
        WHERE player_id = '${uPlayer1}' AND event_id = '${uEvent1}';
      `);
      coachConfirmSucceeded = true;
    } catch (e: any) {
      coachConfirmSucceeded = false;
    }
    assert(coachConfirmSucceeded, 'RLS permite al entrenador asignado cambiar validation_status a confirmed');

    await rlsClient.end();

  } finally {
    await adminClient.end();
  }

  console.log(`\n========================================`);
  console.log(`TOTAL CASOS EN POSTGRESQL: ${passed + failed} | SUPERADOS: ${passed} | FALLIDOS: ${failed}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

// Ejecutar si se invoca directamente
if (require.main === module) {
  run().catch(err => {
    console.error('Error fatal durante la ejecución:', err);
    process.exit(1);
  });
}
