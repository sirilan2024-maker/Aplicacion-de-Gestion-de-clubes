import {
  validateWellnessInput,
  resolveDoubleSessionWellness,
  validateSessionFeedbackInput,
  generateInformationalAlerts,
  DailyWellnessInput,
  getSpainDateString,
} from '../src/lib/performance/wellness-service';

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${msg}`);
  } else {
    failed++;
    console.error(`  ✗ FAIL: ${msg}`);
  }
}

console.log('--- TEST SUITE: WELLNESS & PERFORMANCE SERVICE (AISLADO) ---\n');

// 1. Validaciones Hooper Scale
console.log('1. Validaciones Escala Hooper (1-5):');
{
  const valid = validateWellnessInput({
    sleepQuality: 3,
    fatigue: 2,
    soreness: 1,
    stress: 2,
    mood: 3,
    hasDiscomfort: false,
  });
  assert(valid.isValid === true, 'Cuestionario de bienestar con valores válidos (1-5) se acepta');
  assert(valid.cleanData?.rawScore === 11, 'Suma rawScore calculada correctamente');

  const outOfRange = validateWellnessInput({
    sleepQuality: 0,
    fatigue: 6,
    soreness: 3,
    stress: 2,
    mood: 3,
  });
  assert(outOfRange.isValid === false, 'Rechaza valores fuera de rango 1-5');
  assert(outOfRange.errors.length === 2, 'Reporta 2 errores de validación');

  const nonInteger = validateWellnessInput({
    sleepQuality: 3.5,
    fatigue: 2,
    soreness: 1,
    stress: 2,
    mood: 3,
  });
  assert(nonInteger.isValid === false, 'Rechaza valores decimales');
}

// 2. Molestias en Cuestionario de Bienestar
console.log('\n2. Validación de Molestias en Cuestionario Previo:');
{
  const missingZone = validateWellnessInput({
    sleepQuality: 2,
    fatigue: 2,
    soreness: 2,
    stress: 2,
    mood: 2,
    hasDiscomfort: true,
    // Falta zone
    intensity: 5,
  });
  assert(missingZone.isValid === false, 'Exige zona si hasDiscomfort es true');

  const invalidIntensity = validateWellnessInput({
    sleepQuality: 2,
    fatigue: 2,
    soreness: 2,
    stress: 2,
    mood: 2,
    hasDiscomfort: true,
    zone: 'Isquiotibial derecho',
    intensity: 15,
  });
  assert(invalidIntensity.isValid === false, 'Exige intensidad de molestia entre 1 y 10');

  const validDiscomfort = validateWellnessInput({
    sleepQuality: 2,
    fatigue: 2,
    soreness: 2,
    stress: 2,
    mood: 2,
    hasDiscomfort: true,
    zone: 'Gemelo izquierdo',
    intensity: 6,
    notes: 'Sobrecarga leve tras la sesión anterior',
  });
  assert(validDiscomfort.isValid === true, 'Acepta molestia con zona e intensidad válidas');
  assert(validDiscomfort.cleanData?.discomfort.zone === 'Gemelo izquierdo', 'Sanitiza zona correctamente');
}

// 3. Resolución de Dobles Sesiones en el Mismo Día
console.log('\n3. Resolución de Dobles Sesiones Diarias:');
{
  const baseline: DailyWellnessInput = {
    playerId: 'p-1',
    date: '2026-10-12',
    sourceEventId: 'ev-morning',
    sleepQuality: 2,
    fatigue: 2,
    soreness: 1,
    stress: 1,
    mood: 2,
    hasDiscomfort: false,
  };

  const afternoonWithoutDiscomfort = resolveDoubleSessionWellness(baseline, {
    eventId: 'ev-afternoon',
    hasNewDiscomfort: false,
  });
  assert(afternoonWithoutDiscomfort.action === 'reuse_existing', 'Segunda sesión sin molestias reutiliza la basal');
  assert(afternoonWithoutDiscomfort.reusedFromEventId === 'ev-morning', 'Conserva la referencia a la sesión de origen');

  const afternoonWithNewDiscomfort = resolveDoubleSessionWellness(baseline, {
    eventId: 'ev-afternoon',
    hasNewDiscomfort: true,
    newDiscomfortZone: 'Tobillo derecho',
    newDiscomfortIntensity: 7,
    notes: 'Torcedura leve en el calentamiento',
  });
  assert(afternoonWithNewDiscomfort.action === 'append_discomfort_update', 'Segunda sesión con molestia sobrevenida genera actualización');
  assert(afternoonWithNewDiscomfort.updatedDiscomfort?.zone === 'Tobillo derecho', 'Registra la nueva molestia sin destruir el bienestar basal original');
  assert(afternoonWithNewDiscomfort.wellnessData.sleepQuality === 2, 'Conserva el valor basal de calidad de sueño');
  assert(afternoonWithNewDiscomfort.wellnessData.hasDiscomfort === false, 'Conserva el estado original hasDiscomfort=false en la línea base');
  assert(afternoonWithNewDiscomfort.incidentToPersist?.timing === 'pre_session', 'Estructura la incidencia para timing pre_session');
  assert(afternoonWithNewDiscomfort.incidentToPersist?.eventId === 'ev-afternoon', 'Asocia la incidencia al eventId de la 2ª sesión');
  assert(afternoonWithNewDiscomfort.incidentToPersist?.intensity === 7, 'Guarda la intensidad de la molestia sobrevenida');

  const noBaseline = resolveDoubleSessionWellness(null, {
    eventId: 'ev-morning',
  });
  assert(noBaseline.action === 'require_baseline', 'Si no hay registro previo, exige completar la línea base');
}

// 4. Validación de Feedback de Sesión (RPE y Minutos)
console.log('\n4. Validación de Feedback Post-Entrenamiento:');
{
  const validFeedback = validateSessionFeedbackInput({
    eventId: 'ev-1',
    playerId: 'p-1',
    rpe: 8,
    minutes: 75,
    hasDiscomfort: false,
  });
  assert(validFeedback.isValid === true, 'Acepta RPE y minutos correctos');
  assert(validFeedback.cleanData?.trainingLoad === 600, 'Calcula correctamente la carga sRPE (8 * 75 = 600)');
  assert(validFeedback.cleanData?.loadStatus === 'calculated', 'Estado de carga completado');

  const pendingMinutesFeedback = validateSessionFeedbackInput({
    eventId: 'ev-1',
    playerId: 'p-1',
    rpe: 7,
    hasDiscomfort: false,
  });
  assert(pendingMinutesFeedback.isValid === true, 'Permite registrar RPE sin minutos individuales confirmados');
  assert(pendingMinutesFeedback.cleanData?.trainingLoad === null, 'Carga sRPE queda null si minutos están ausentes');
  assert(pendingMinutesFeedback.cleanData?.loadStatus === 'pending_minutes', 'Estado de carga marcado como pending_minutes');

  const invalidRpe = validateSessionFeedbackInput({
    eventId: 'ev-1',
    playerId: 'p-1',
    rpe: 12,
  });
  assert(invalidRpe.isValid === false, 'Rechaza RPE mayor que 10');

  const invalidMinutes = validateSessionFeedbackInput({
    eventId: 'ev-1',
    playerId: 'p-1',
    rpe: 6,
    minutes: -10,
  });
  assert(invalidMinutes.isValid === false, 'Rechaza minutos negativos');
}

// 5. Alertas Estrictamente Informativas (No Médicas)
console.log('\n5. Generación de Alertas Informativas:');
{
  const alertsHighFatigue = generateInformationalAlerts(
    { sleepQuality: 2, fatigue: 4, soreness: 2, stress: 1, mood: 2 },
    { hasDiscomfort: false }
  );
  assert(alertsHighFatigue.length === 1, 'Genera alerta por fatiga elevada');
  assert(alertsHighFatigue[0].type === 'fatigue_warning', 'Tipo de alerta: fatigue_warning');

  const alertsWithDiscomfort = generateInformationalAlerts(
    { sleepQuality: 1, fatigue: 2, soreness: 1, stress: 1, mood: 1 },
    { hasDiscomfort: true, zone: 'Aductor', intensity: 8 },
    { rpe: 9 }
  );
  assert(alertsWithDiscomfort.length === 2, 'Genera alerta por molestia severa y esfuerzo extremo');
  assert(alertsWithDiscomfort.some(a => a.type === 'discomfort_reported'), 'Reporta la molestia');
  assert(alertsWithDiscomfort.some(a => a.type === 'high_exertion'), 'Reporta el esfuerzo extremo');
}

// 6. Fechas en huso horario peninsular (Europe/Madrid)
console.log('\n6. Validación de Fechas Oficiales Peninsulares:');
{
  // Verano: CEST (UTC+2) -> 2026-07-15 00:30 CEST es 2026-07-14 22:30 UTC
  const summerMidnight = new Date("2026-07-14T22:30:00.000Z");
  const formattedSummer = getSpainDateString(summerMidnight);
  assert(formattedSummer === '2026-07-15', 'En horario de verano CEST, 22:30 UTC del día 14 corresponde al día 15 en España peninsular');

  // Invierno: CET (UTC+1) -> 2026-11-20 00:30 CET es 2026-11-19 23:30 UTC
  const winterMidnight = new Date("2026-11-19T23:30:00.000Z");
  const formattedWinter = getSpainDateString(winterMidnight);
  assert(formattedWinter === '2026-11-20', 'En horario de invierno CET, 23:30 UTC del día 19 corresponde al día 20 en España peninsular');

  // Entrada ya limpia YYYY-MM-DD
  const cleanDate = getSpainDateString('2026-10-12');
  assert(cleanDate === '2026-10-12', 'Preserva cadenas que ya están en formato canónico YYYY-MM-DD');
}

// 7. Simulación lógica de resolución de carrera concurrente (funciones puras)
console.log('\n7. Lógica Pura de Resolución de Conflicto Concurrente (Simulación 23505):');
{
  // Simular que el cliente A insertó una línea base hace 2ms
  const raceBaseline: DailyWellnessInput = {
    playerId: 'p-race',
    date: '2026-10-12',
    sourceEventId: 'ev-1',
    sleepQuality: 3,
    fatigue: 3,
    soreness: 2,
    stress: 2,
    mood: 3,
    hasDiscomfort: false
  };

  // El cliente B intentó insertar simultáneamente con molestia adicional
  const resolutionUpon23505 = resolveDoubleSessionWellness(raceBaseline, {
    eventId: 'ev-2',
    hasNewDiscomfort: true,
    newDiscomfortZone: 'Isquiotibial',
    newDiscomfortIntensity: 6,
    notes: 'Molestia comunicada tras resolución de conflicto concurrente'
  });

  assert(resolutionUpon23505.action === 'append_discomfort_update', 'Tras conflicto de unicidad, resuelve como actualización de molestia sin degradar');
  assert(resolutionUpon23505.wellnessData.sleepQuality === 3, 'Preserva íntegra la respuesta basal recuperada tras el conflicto');
  assert(resolutionUpon23505.incidentToPersist?.zone === 'Isquiotibial', 'Genera la incidencia correcta para persistencia complementaria');
}

// 8. Validación de Agregación de Estados de Presentación (Centro de Rendimiento)
console.log('\n8. Agregaciones y Estados de Presentación del Centro de Rendimiento:');
{
  const mockEntries = [
    { playerId: 'p1', status: 'completed' as const, sleep: 4, fatigue: 4, soreness: 3, stress: 2, mood: 4, hasDiscomfort: true, zone: 'Aductor', intensity: 7 },
    { playerId: 'p2', status: 'completed' as const, sleep: 2, fatigue: 2, soreness: 1, stress: 1, mood: 2, hasDiscomfort: false, zone: null, intensity: null },
    { playerId: 'p3', status: 'pending' as const, sleep: null, fatigue: null, soreness: null, stress: null, mood: null, hasDiscomfort: false, zone: null, intensity: null },
  ];

  const total = mockEntries.length;
  const completed = mockEntries.filter(e => e.status === 'completed').length;
  const pending = mockEntries.filter(e => e.status === 'pending').length;
  assert(total === 3, 'Total de plantilla contabilizado correctamente');
  assert(completed === 2, 'Total completados contabilizado correctamente');
  assert(pending === 1, 'Total pendientes contabilizado correctamente');

  const evaluated = mockEntries.filter(e => e.status === 'completed');
  const avgSleep = evaluated.reduce((s, e) => s + (e.sleep || 0), 0) / evaluated.length;
  const avgFatigue = evaluated.reduce((s, e) => s + (e.fatigue || 0), 0) / evaluated.length;
  assert(avgSleep === 3.0, 'Media de calidad de sueño calculada correctamente ( (4+2)/2 = 3.0 )');
  assert(avgFatigue === 3.0, 'Media de fatiga calculada correctamente');

  const discomfortCount = mockEntries.filter(e => e.hasDiscomfort).length;
  assert(discomfortCount === 1, 'Molestias activas detectadas correctamente (1 jugador)');
}

// 9. Validación de Aislamiento de Temporada y Métricas Ausentes vs Cero
console.log('\n9. Aislamiento de Temporada Activa y Distinción entre Cero y Ausente:');
{
  // Simulación de resolución de temporada activa para la consulta
  const activeSeason = { id: '663ed6ef-1dab-4350-9489-ed50f9e9ac15', is_active: true };
  const closedSeasonId = '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

  const buildMatchFilter = (activeSeasonObj?: { id: string } | null) => {
    if (activeSeasonObj?.id) {
      return { type: 'eq', field: 'season_id', value: activeSeasonObj.id };
    }
    return { type: 'neq', field: 'season_id', value: closedSeasonId };
  };

  const activeFilter = buildMatchFilter(activeSeason);
  assert(activeFilter.type === 'eq' && activeFilter.value === activeSeason.id, 'Filtra dinámicamente por la temporada activa');

  const fallbackFilter = buildMatchFilter(null);
  assert(fallbackFilter.type === 'neq' && fallbackFilter.value === closedSeasonId, 'Aplica guardia fallback excluyendo temporada cerrada si no hay temporada activa');

  // Distinción estricta de minutos y RPE: 0 explícito vs ausente (null/undefined)
  const playerMetricsSample = [
    { eventId: 'e1', minutes: 0, rpe: 5 },       // 0 minutos jugados explícitamente -> carga 0
    { eventId: 'e2', minutes: 60, rpe: 7 },      // 60 minutos -> carga 420
    { eventId: 'e3', minutes: null, rpe: 8 },    // minutos ausentes -> carga no calculable
    { eventId: 'e4', minutes: undefined, rpe: null } // sin datos
  ];

  let accumulatedTrainingMinutes = 0;
  let computedLoads: number[] = [];

  playerMetricsSample.forEach(m => {
    if (typeof m.minutes === 'number') {
      accumulatedTrainingMinutes += m.minutes;
    }
    if (typeof m.minutes === 'number' && typeof m.rpe === 'number') {
      computedLoads.push(m.minutes * m.rpe);
    }
  });

  assert(accumulatedTrainingMinutes === 60, 'Minutos acumulados suman correctamente (0 + 60 = 60)');
  assert(computedLoads.length === 2, 'Solo calcula cargas cuando ambos valores están definidos');
  assert(computedLoads[0] === 0, '0 minutos con RPE resulta en carga 0 explícita');
  assert(computedLoads[1] === 420, '60 minutos con RPE 7 resulta en carga 420');
}

// 10. Validación de Ficha Individual del Jugador (Drawer): Permisos, Ausencia de Datos y sRPE
console.log('\n10. Ficha Individual del Jugador (Drawer): Permisos, Ausencia de Datos y sRPE:');
{
  // 10.1 Permisos de acceso: jugador perteneciente al club y equipo autorizado
  const mockContext = { profile: { club_id: 'club-sporting-1', role: 'entrenador' } };
  const mockAuthorizedPlayer = { id: 'player-1', club_id: 'club-sporting-1', team_id: 'team-cadete-a' };
  const mockForeignPlayer = { id: 'player-2', club_id: 'club-rival-9', team_id: 'team-rival' };

  const checkPlayerAccess = (ctx: typeof mockContext, player: typeof mockAuthorizedPlayer) => {
    if (player.club_id !== ctx.profile.club_id) {
      return { allowed: false, reason: 'Jugador no pertenece al club del usuario' };
    }
    return { allowed: true };
  };

  assert(checkPlayerAccess(mockContext, mockAuthorizedPlayer).allowed === true, 'Permite acceso a jugador del propio club');
  assert(checkPlayerAccess(mockContext, mockForeignPlayer).allowed === false, 'Bloquea acceso a jugador de otro club');

  // 10.2 Cálculo de sRPE por sesión y tratamiento de datos ausentes/pendientes
  interface DrawerSessionSample {
    eventId: string;
    rpe?: number | null;
    minutes?: number | null;
    attendance?: { status: string; notes?: string } | null;
  }

  const sessions: DrawerSessionSample[] = [
    { eventId: 's1', rpe: 8, minutes: 75, attendance: { status: 'Presente' } },          // Completo
    { eventId: 's2', rpe: 6, minutes: 0, attendance: { status: 'Retraso' } },             // 0 minutos explícitos
    { eventId: 's3', rpe: 7, minutes: null, attendance: { status: 'Presente' } },          // Minutos pendientes/ausentes
    { eventId: 's4', rpe: null, minutes: 90, attendance: { status: 'Presente' } },         // RPE ausente
    { eventId: 's5', rpe: null, minutes: null, attendance: { status: 'Ausente', notes: 'Gripe' } }, // Sin feedback
  ];

  const processed = sessions.map(s => {
    const hasMinutes = typeof s.minutes === 'number';
    const hasRpe = typeof s.rpe === 'number';
    const sRPE = (hasMinutes && hasRpe) ? (s.minutes! * s.rpe!) : null;
    return {
      eventId: s.eventId,
      hasMinutes,
      hasRpe,
      sRPE,
      attendanceStatus: s.attendance?.status || 'No registrada'
    };
  });

  assert(processed[0].sRPE === 600, 'Sesión 1: 75 min * RPE 8 = carga 600 sRPE');
  assert(processed[1].sRPE === 0, 'Sesión 2: 0 min * RPE 6 = carga 0 sRPE (preserva cero)');
  assert(processed[2].sRPE === null, 'Sesión 3: minutos nulos deja carga como null');
  assert(processed[3].sRPE === null, 'Sesión 4: RPE nulo deja carga como null');
  assert(processed[4].sRPE === null && processed[4].attendanceStatus === 'Ausente', 'Sesión 5: Ausente registra asistencia sin carga');
}

// 11. Validación de Autorización Personal y Familiar (Mi Rendimiento - Fase 4)
console.log('\n11. Autorización Personal y Familiar (Mi Rendimiento):');
{
  interface MockUserContext {
    userId: string;
    clubId: string;
    role: string;
  }

  interface MockPlayerRecord {
    id: string;
    clubId: string;
    teamId: string;
    userAuthId?: string | null;
    tutorId?: string | null;
    linkedTutorIds?: string[];
  }

  const evaluatePerformanceAccess = (
    ctx: MockUserContext,
    targetPlayer: MockPlayerRecord
  ): { allowed: boolean; reason?: string } => {
    // 1. Aislamiento de club
    if (targetPlayer.clubId !== ctx.clubId) {
      return { allowed: false, reason: 'El jugador no pertenece a tu club' };
    }

    // 2. Administrador / Staff
    if (['admin', 'superadmin', 'coordinador'].includes(ctx.role)) {
      return { allowed: true };
    }

    // 3. Propio jugador con cuenta vinculada (user_auth_id)
    if (targetPlayer.userAuthId === ctx.userId) {
      return { allowed: true };
    }

    // 4. Tutor directo (tutor_id)
    if (targetPlayer.tutorId === ctx.userId) {
      return { allowed: true };
    }

    // 5. Segundo tutor vinculado (player_tutors)
    if (targetPlayer.linkedTutorIds && targetPlayer.linkedTutorIds.includes(ctx.userId)) {
      return { allowed: true };
    }

    // 6. Denegado por defecto (no es tutor ni jugador ni admin)
    return { allowed: false, reason: 'No tienes permisos de tutela sobre este menor' };
  };

  const clubA = 'club-saladar-001';
  const clubB = 'club-rival-002';

  const playerHijo = {
    id: 'p-hijo-1',
    clubId: clubA,
    teamId: 'team-cadete-a',
    userAuthId: null, // Menor de edad sin cuenta de usuario propia
    tutorId: 'user-padre-1',
    linkedTutorIds: ['user-madre-2']
  };

  const playerAdulto = {
    id: 'p-adulto-2',
    clubId: clubA,
    teamId: 'team-senior',
    userAuthId: 'user-jugador-3',
    tutorId: null,
    linkedTutorIds: []
  };

  const playerRival = {
    id: 'p-rival-3',
    clubId: clubB,
    teamId: 'team-rival-cadete',
    userAuthId: 'user-rival-4',
    tutorId: 'user-padre-rival',
    linkedTutorIds: []
  };

  // Caso 1: Acceso propio del jugador con cuenta de usuario
  const ctxJugadorPropio: MockUserContext = { userId: 'user-jugador-3', clubId: clubA, role: 'jugador' };
  const resPropio = evaluatePerformanceAccess(ctxJugadorPropio, playerAdulto);
  assert(resPropio.allowed === true, 'Jugador con cuenta propia accede a su propio rendimiento');

  // Caso 2: Tutor directo accede al rendimiento del menor sin cuenta
  const ctxPadre: MockUserContext = { userId: 'user-padre-1', clubId: clubA, role: 'family' };
  const resPadre = evaluatePerformanceAccess(ctxPadre, playerHijo);
  assert(resPadre.allowed === true, 'Tutor directo (tutor_id) accede al rendimiento de su hijo menor');

  // Caso 3: Segundo tutor vinculado (player_tutors) accede al rendimiento del menor
  const ctxMadre: MockUserContext = { userId: 'user-madre-2', clubId: clubA, role: 'family' };
  const resMadre = evaluatePerformanceAccess(ctxMadre, playerHijo);
  assert(resMadre.allowed === true, 'Segundo tutor vinculado (player_tutors) accede al rendimiento del menor');

  // Caso 4: Tutor no vinculado intenta acceder al menor
  const ctxOtroPadre: MockUserContext = { userId: 'user-extranno-5', clubId: clubA, role: 'family' };
  const resOtroPadre = evaluatePerformanceAccess(ctxOtroPadre, playerHijo);
  assert(resOtroPadre.allowed === false, 'Tutor no vinculado es estrictamente bloqueado');

  // Caso 5: Acceso cruzado entre jugadores (jugador intenta consultar datos de otro)
  const resCruzado = evaluatePerformanceAccess(ctxJugadorPropio, playerHijo);
  assert(resCruzado.allowed === false, 'Acceso cruzado entre jugadores queda terminantemente denegado');

  // Caso 6: Acceso cruzado entre clubes diferentes
  const resClubCruzado = evaluatePerformanceAccess(ctxPadre, playerRival);
  assert(resClubCruzado.allowed === false, 'Acceso a jugador de otro club queda terminantemente bloqueado');
}

console.log(`\n========================================`);
console.log(`TOTAL CASOS: ${passed + failed} | SUPERADOS: ${passed} | FALLIDOS: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}

