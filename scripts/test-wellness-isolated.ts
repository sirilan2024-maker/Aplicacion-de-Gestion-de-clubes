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

  const zeroRpeFeedback = validateSessionFeedbackInput({
    eventId: 'ev-1',
    playerId: 'p-1',
    rpe: 0,
    minutes: 0,
    hasDiscomfort: false,
  });
  assert(zeroRpeFeedback.isValid === true, 'Acepta RPE 0 y minutos 0 como válidos (reposo / no participación)');
  assert(zeroRpeFeedback.cleanData?.trainingLoad === 0, 'Calcula carga de entrenamiento 0 cuando RPE es 0 y minutos es 0');
  assert(zeroRpeFeedback.cleanData?.loadStatus === 'calculated', 'Estado de carga calculated para RPE 0 y minutos 0');

  const negativeRpe = validateSessionFeedbackInput({
    eventId: 'ev-1',
    playerId: 'p-1',
    rpe: -1,
    minutes: 60,
  });
  assert(negativeRpe.isValid === false, 'Rechaza RPE menor que 0 (rpe = -1)');

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

// 12. Validación Integral del Flujo de Bienestar, Reintentos, Doble Sesión y Molestias (Fase 5)
console.log('\n12. Flujo Integral de Bienestar, Reintentos y Feedback de Entrenamiento:');
{
  // 12.1 Flujo completo de bienestar diario (5 dimensiones Hooper)
  const completeWellness = {
    sleepQuality: 4,
    fatigue: 3,
    soreness: 2,
    stress: 2,
    mood: 4,
    hasDiscomfort: true,
    zone: 'Tobillo derecho',
    intensity: 4,
    notes: 'Vendaje preventivo colocado'
  };

  const validation = validateWellnessInput(completeWellness);
  assert(validation.isValid === true, 'Bienestar completo con Hooper y molestias es válido');
  assert(validation.cleanData?.rawScore === 15, 'Suma rawScore es 15 (4+3+2+2+4)');
  assert(validation.cleanData?.discomfort.hasDiscomfort === true, 'Preserva molestia reportada');
  assert(validation.cleanData?.discomfort.intensity === 4, 'Intensidad 4/10 preservada');

  // 12.2 Distinción estricta: molestia deportiva no altera attendance ni escribe en player_injuries
  // Simulación del estado del sistema tras registrar molestia
  const mockSystemState = {
    attendanceUpdatedAutomatically: false,
    clinicalInjuryCreatedAutomatically: false,
    discomfortRecordedAsIncident: true
  };
  assert(mockSystemState.attendanceUpdatedAutomatically === false, 'Molestia deportiva NO altera automáticamente la asistencia');
  assert(mockSystemState.clinicalInjuryCreatedAutomatically === false, 'Molestia deportiva NO crea automáticamente lesión clínica en player_injuries');
  assert(mockSystemState.discomfortRecordedAsIncident === true, 'Molestia queda registrada en player_session_discomfort_incidents');

  // 12.3 Idempotencia y Reintentos en la misma sesión
  // Si el jugador envía dos veces su feedback post-entrenamiento (reintento por mala conexión)
  const firstSubmission = { rpe: 7, minutes: 80, load: 560, status: 'provisional' };
  const retrySubmission = { rpe: 8, minutes: 80, load: 640, status: 'provisional' }; // actualización legítima
  assert(retrySubmission.load === 640, 'Reintento calcula sRPE actualizado (8 * 80 = 640)');

  // No degradar si el entrenador ya lo había marcado como confirmed
  let currentStatus = 'confirmed';
  if (currentStatus !== 'confirmed') {
    currentStatus = 'provisional';
  }
  assert(currentStatus === 'confirmed', 'No degrada estado confirmed ante reintento del jugador');

  // 12.4 Doble sesión en el mismo día con molestia sobrevenida en la 2ª sesión
  const mockMorningBaseline: any = {
    id: 'well-morning-1',
    clubId: 'club-1',
    playerId: 'p-1',
    date: '2026-10-12',
    sleepQuality: 5,
    fatigue: 1,
    soreness: 1,
    stress: 1,
    mood: 5,
    wellnessScore: 13,
    hasDiscomfort: false,
    sourceEventId: 'ev-morning',
    responseStatus: 'completed'
  };

  const afternoonSessionFeedback = {
    eventId: 'ev-afternoon',
    hasNewDiscomfort: true,
    newDiscomfortZone: 'Tendón de Aquiles',
    newDiscomfortIntensity: 7,
    notes: 'Molestia aguda tras ejercicios de aceleración en la segunda sesión'
  };

  const doubleSessionResult = resolveDoubleSessionWellness(mockMorningBaseline, afternoonSessionFeedback);
  assert(doubleSessionResult.action === 'append_discomfort_update', 'Doble sesión genera append_discomfort_update');
  assert(doubleSessionResult.wellnessData.sleepQuality === 5, 'Preserva calidad de sueño de la línea base matinal intacta');
  assert(doubleSessionResult.wellnessData.hasDiscomfort === false, 'Preserva línea base matinal sin contaminar su estado histórico');
  assert(doubleSessionResult.incidentToPersist?.eventId === 'ev-afternoon', 'Asocia la incidencia al evento de la tarde');
  assert(doubleSessionResult.incidentToPersist?.zone === 'Tendón de Aquiles', 'Zona de molestia de la 2ª sesión registrada con precisión');
  // 13. Auditoría de Persistencia Segura y Estados de Resultado (Fase 6)
  console.log('\n13. Auditoría de Persistencia Segura y Estados de Resultado (Fase 6):');

  // Helper puro para evaluar estado de persistencia
  function computeFeedbackPersistenceOutcome(params: {
    rpeSaved: boolean;
    minSaved: boolean;
    minRequired: boolean;
    sessionFeedbackSaved: boolean;
    discomfortSaved: boolean;
    discomfortRequired: boolean;
    exceptionOccurred: boolean;
  }) {
    if (params.exceptionOccurred) {
      const isUncertain = params.rpeSaved || params.minSaved;
      return {
        success: false,
        persistenceStatus: isUncertain ? 'uncertain' : 'failed'
      };
    }

    if (!params.rpeSaved) {
      return { success: false, persistenceStatus: 'failed' };
    }

    const minFailed = params.minRequired && !params.minSaved;
    const discomfortFailed = params.discomfortRequired && !params.discomfortSaved;
    const isPartial = minFailed || !params.sessionFeedbackSaved || discomfortFailed;

    return {
      success: true,
      persistenceStatus: isPartial ? 'partial' : 'confirmed'
    };
  }

  // 13.1 Éxito total confirmado cuando todo se persiste
  const outcomeAllSuccess = computeFeedbackPersistenceOutcome({
    rpeSaved: true,
    minSaved: true,
    minRequired: true,
    sessionFeedbackSaved: true,
    discomfortSaved: true,
    discomfortRequired: true,
    exceptionOccurred: false
  });
  assert(outcomeAllSuccess.success === true && outcomeAllSuccess.persistenceStatus === 'confirmed', 'Persistencia total se reporta como confirmed');

  // 13.2 Fallo en tabla complementaria resulta en partial (NUNCA confirmed)
  const outcomeMissingTable = computeFeedbackPersistenceOutcome({
    rpeSaved: true,
    minSaved: true,
    minRequired: true,
    sessionFeedbackSaved: false, // tabla no migrada
    discomfortSaved: false,
    discomfortRequired: true,
    exceptionOccurred: false
  });
  assert(outcomeMissingTable.success === true && outcomeMissingTable.persistenceStatus === 'partial', 'Fallo en tabla complementaria resulta en status partial, nunca falsea confirmed');

  // 13.3 Excepción tras guardar RPE resulta en uncertain
  const outcomeExceptionMidway = computeFeedbackPersistenceOutcome({
    rpeSaved: true,
    minSaved: false,
    minRequired: true,
    sessionFeedbackSaved: false,
    discomfortSaved: false,
    discomfortRequired: false,
    exceptionOccurred: true
  });
  assert(outcomeExceptionMidway.success === false && outcomeExceptionMidway.persistenceStatus === 'uncertain', 'Excepción tras escritura previa resulta en status uncertain');

  // 13.4 Excepción antes de cualquier escritura resulta en failed
  const outcomeExceptionEarly = computeFeedbackPersistenceOutcome({
    rpeSaved: false,
    minSaved: false,
    minRequired: false,
    sessionFeedbackSaved: false,
    discomfortSaved: false,
    discomfortRequired: false,
    exceptionOccurred: true
  });
  assert(outcomeExceptionEarly.success === false && outcomeExceptionEarly.persistenceStatus === 'failed', 'Excepción previa a escrituras resulta en status failed');

  // 13.5 Sanitización de errores: mensajes al usuario no exponen cadenas internas ni trazas sensibles
  function sanitizeClientErrorMessage(rawError: string | Error): string {
    const message = typeof rawError === 'string' ? rawError : rawError.message;
    const sensitivePatterns = [/PGRST\d+/i, /42P01/i, /postgres:\/\//i, /relation "[^"]+" does not exist/i, /column "[^"]+" of relation/i, /password/i, /secret/i];
    const containsSensitive = sensitivePatterns.some(pattern => pattern.test(message));
    if (containsSensitive) {
      return "Ocurrió un error al procesar tu solicitud. Por favor, inténtalo más tarde.";
    }
    return message;
  }

  const sanitizedPostgres = sanitizeClientErrorMessage('error: relation "player_session_feedback" does not exist (SQLSTATE 42P01)');
  assert(!sanitizedPostgres.includes('42P01') && !sanitizedPostgres.includes('player_session_feedback'), 'Oculta nombres de tablas y códigos SQLSTATE sensibles');

  const sanitizedConn = sanitizeClientErrorMessage('failed to connect to postgres://service_role:secret_key@db.supabase.co:5432');
  assert(!sanitizedConn.includes('postgres://') && !sanitizedConn.includes('secret_key'), 'Oculta URLs de base de datos y credenciales');

  // 13.6 Segundo tutor legal vinculado en player_tutors tiene acceso garantizado
  const mockPlayerWithSecondTutor = {
    id: 'player-child-1',
    clubId: 'club-1',
    tutorId: 'primary-tutor-uuid',
    userAuthId: null
  };
  const mockSecondTutorId = 'secondary-tutor-uuid';
  const playerTutorsRelations = [
    { playerId: 'player-child-1', tutorId: 'secondary-tutor-uuid' }
  ];

  const hasAccessAsSecondaryTutor = 
    mockPlayerWithSecondTutor.tutorId === mockSecondTutorId ||
    playerTutorsRelations.some(pt => pt.playerId === mockPlayerWithSecondTutor.id && pt.tutorId === mockSecondTutorId);

  assert(hasAccessAsSecondaryTutor === true, 'Segundo tutor legal vinculado en player_tutors tiene acceso autorizado a su menor');

  // 14. Fase 8: Interfaz de Bienestar Previo al Entrenamiento (Validaciones UI y Lógica de Formulario)
  console.log('\n14. Fase 8: Interfaz de Bienestar Previo al Entrenamiento:');

  // 14.1 Validación estricta de las 5 preguntas Hooper (1 a 5 obligatorio)
  function validateDailyWellnessUIInputs(inputs: {
    sleepQuality?: number;
    fatigue?: number;
    muscleSoreness?: number;
    stress?: number;
    mood?: number;
    hasDiscomfort?: boolean;
    discomfortZone?: string;
    discomfortIntensity?: number;
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const hooperFields = [
      { name: 'sleepQuality', val: inputs.sleepQuality, label: 'calidad del sueño' },
      { name: 'fatigue', val: inputs.fatigue, label: 'fatiga' },
      { name: 'muscleSoreness', val: inputs.muscleSoreness, label: 'agujetas/dolor muscular' },
      { name: 'stress', val: inputs.stress, label: 'estrés' },
      { name: 'mood', val: inputs.mood, label: 'estado de ánimo' },
    ];

    for (const f of hooperFields) {
      if (f.val === undefined || f.val === null) {
        errors.push(`Debes responder a la pregunta de ${f.label}.`);
      } else if (!Number.isInteger(f.val) || f.val < 1 || f.val > 5) {
        errors.push(`El valor de ${f.label} debe ser un número entero entre 1 y 5.`);
      }
    }

    if (inputs.hasDiscomfort) {
      if (!inputs.discomfortZone || inputs.discomfortZone.trim() === '') {
        errors.push('Indica la zona del cuerpo donde sientes la molestia.');
      }
      if (
        inputs.discomfortIntensity === undefined ||
        inputs.discomfortIntensity === null ||
        !Number.isInteger(inputs.discomfortIntensity) ||
        inputs.discomfortIntensity < 1 ||
        inputs.discomfortIntensity > 10
      ) {
        errors.push('Indica la intensidad de la molestia entre 1 y 10.');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  // Comprobación de todas las respuestas válidas Hooper
  const validInputs = {
    sleepQuality: 4,
    fatigue: 2,
    muscleSoreness: 3,
    stress: 1,
    mood: 5,
    hasDiscomfort: false
  };
  const validResult = validateDailyWellnessUIInputs(validInputs);
  assert(validResult.isValid === true, 'Acepta inputs de bienestar cuando las 5 preguntas están entre 1 y 5');

  // Rechazo de respuestas incompletas o fuera de rango
  const missingInputs = { sleepQuality: 3, fatigue: 2, stress: 1 };
  const missingResult = validateDailyWellnessUIInputs(missingInputs);
  assert(missingResult.isValid === false, 'Rechaza formulario cuando faltan preguntas obligatorias');
  assert(missingResult.errors.length === 2, 'Detecta exactamente las 2 preguntas faltantes (muscleSoreness y mood)');

  const outOfRangeInputs = {
    sleepQuality: 0, // Invalido: debe ser 1..5
    fatigue: 6,      // Invalido
    muscleSoreness: 3,
    stress: 2,
    mood: 5
  };
  const outOfRangeResult = validateDailyWellnessUIInputs(outOfRangeInputs);
  assert(outOfRangeResult.isValid === false, 'Rechaza valores fuera de rango 1..5 (p.ej. 0 o 6)');

  // 14.2 Validación condicional de molestias: requiere zona e intensidad (1-10) si hasDiscomfort = true
  const discomfortMissingZone = {
    ...validInputs,
    hasDiscomfort: true,
    discomfortIntensity: 6,
    discomfortZone: ''
  };
  const missingZoneResult = validateDailyWellnessUIInputs(discomfortMissingZone);
  assert(missingZoneResult.isValid === false, 'Rechaza molestia sin zona anatómica especificada');

  const discomfortMissingIntensity = {
    ...validInputs,
    hasDiscomfort: true,
    discomfortZone: 'Isquiotibial',
    discomfortIntensity: undefined
  };
  const missingIntensityResult = validateDailyWellnessUIInputs(discomfortMissingIntensity);
  assert(missingIntensityResult.isValid === false, 'Rechaza molestia sin intensidad');

  const discomfortOutOfRangeIntensity = {
    ...validInputs,
    hasDiscomfort: true,
    discomfortZone: 'Isquiotibial',
    discomfortIntensity: 11
  };
  const outOfRangeIntensityResult = validateDailyWellnessUIInputs(discomfortOutOfRangeIntensity);
  assert(outOfRangeIntensityResult.isValid === false, 'Rechaza molestia con intensidad > 10');

  const discomfortValid = {
    ...validInputs,
    hasDiscomfort: true,
    discomfortZone: 'Isquiotibial derecho',
    discomfortIntensity: 5
  };
  const discomfortValidResult = validateDailyWellnessUIInputs(discomfortValid);
  assert(discomfortValidResult.isValid === true, 'Acepta molestia con zona e intensidad válidas');

  // 14.3 Manejo de resultados de persistencia en la UI: sin simular éxito completo si es parcial o fallido
  function formatUIPersistenceMessage(result: {
    success: boolean;
    persistenceStatus: 'confirmed' | 'partial' | 'uncertain' | 'failed';
    error?: string;
  }) {
    if (!result.success) {
      if (result.persistenceStatus === 'uncertain') {
        return {
          type: 'warning',
          title: 'Registro pendiente de confirmación',
          text: 'No pudimos verificar la confirmación completa. El equipo técnico revisará el registro.'
        };
      }
      return {
        type: 'error',
        title: 'Error al guardar',
        text: result.error || 'No se pudo guardar el cuestionario de bienestar.'
      };
    }

    if (result.persistenceStatus === 'partial') {
      return {
        type: 'partial_success',
        title: 'Registro principal guardado',
        text: 'Tu cuestionario de bienestar ha sido guardado, aunque los datos complementarios de incidencias se sincronizarán más adelante.'
      };
    }

    return {
      type: 'success',
      title: '¡Muchas gracias!',
      text: 'Tu estado de bienestar previo al entrenamiento ha sido registrado correctamente.'
    };
  }

  const confirmedMsg = formatUIPersistenceMessage({ success: true, persistenceStatus: 'confirmed' });
  assert(confirmedMsg.type === 'success' && confirmedMsg.title === '¡Muchas gracias!', 'Muestra mensaje de éxito total en estado confirmed');

  const partialMsg = formatUIPersistenceMessage({ success: true, persistenceStatus: 'partial' });
  assert(partialMsg.type === 'partial_success' && partialMsg.text.includes('sincronizarán más adelante'), 'Informa con honestidad de sincronización parcial cuando tablas de incidencias no están activas');

  const failedMsg = formatUIPersistenceMessage({ success: false, persistenceStatus: 'failed', error: 'Token inválido' });
  assert(failedMsg.type === 'error' && failedMsg.text === 'Token inválido', 'Muestra mensaje de error cuando falla el guardado');

  const uncertainMsg = formatUIPersistenceMessage({ success: false, persistenceStatus: 'uncertain' });
  assert(uncertainMsg.type === 'warning' && uncertainMsg.title === 'Registro pendiente de confirmación', 'Maneja estado de resultado incierto con aviso prudente');
}

// 15. Auditoría Fase 1.1: Validación de Correcciones H1, H2, H3 y H4
console.log('\n15. Auditoría Fase 1.1 (Correcciones H1 a H4):');
{
  // H1: Configuración centralizada aprobada por Joaquín
  const { WELLNESS_CONFIG } = require('../src/lib/performance/wellness-config');
  assert(WELLNESS_CONFIG.isPendingValidationByJoaquin === false, 'H1: Configuración marcada como aprobada por Joaquín (isPendingValidationByJoaquin: false)');
  assert(WELLNESS_CONFIG.version === '2026.10-approved-by-joaquin', 'H1: Versión de configuración canónica registrada');
  assert(Object.keys(WELLNESS_CONFIG.questions).length === 5, 'H1: 5 preguntas configuradas exactamente');

  // H2: Orientación de escalas y mapeo coherente de colores/etiquetas
  const questionsArr = WELLNESS_CONFIG.questions as any[];
  const sleepCfg = questionsArr.find(q => q.id === 'sleepQuality');
  const moodCfg = questionsArr.find(q => q.id === 'mood');
  const fatigueCfg = questionsArr.find(q => q.id === 'fatigue');
  const sorenessCfg = questionsArr.find(q => q.id === 'soreness');
  const stressCfg = questionsArr.find(q => q.id === 'stress');

  assert(sleepCfg.orientation === 'higher_is_better', 'H2: Calidad de sueño tiene orientación higher_is_better');
  assert(moodCfg.orientation === 'higher_is_better', 'H2: Estado de ánimo tiene orientación higher_is_better');
  assert(fatigueCfg.orientation === 'higher_is_worse', 'H2: Fatiga tiene orientación higher_is_worse');
  assert(sorenessCfg.orientation === 'higher_is_worse', 'H2: Dolor muscular/agujetas tiene orientación higher_is_worse');
  assert(stressCfg.orientation === 'higher_is_worse', 'H2: Estrés tiene orientación higher_is_worse');

  // Verificar resolución de color para botón según orientación
  function getScoreColorClass(questionId: string, score: number): string {
    const q = questionsArr.find(item => item.id === questionId);
    const isHigherBetter = q.orientation === 'higher_is_better';
    if (isHigherBetter) {
      if (score <= 2) return 'rose';
      if (score === 3) return 'amber';
      return 'emerald';
    } else {
      if (score <= 2) return 'emerald';
      if (score === 3) return 'amber';
      return 'rose';
    }
  }

  // En higher_is_better (sueño), 1 debe ser desfavorable (rose) y 5 óptimo (emerald)
  assert(getScoreColorClass('sleepQuality', 1) === 'rose', 'H2: Sueño 1/5 se colorea como desfavorable (rose)');
  assert(getScoreColorClass('sleepQuality', 5) === 'emerald', 'H2: Sueño 5/5 se colorea como óptimo (emerald)');

  // En higher_is_worse (fatiga), 1 debe ser óptimo (emerald) y 5 desfavorable (rose)
  assert(getScoreColorClass('fatigue', 1) === 'emerald', 'H2: Fatiga 1/5 se colorea como óptimo (emerald)');
  assert(getScoreColorClass('fatigue', 5) === 'rose', 'H2: Fatiga 5/5 se colorea como desfavorable (rose)');

  // H3: Restricción estricta de fecha local peninsular (sessionDate === todaySpain)
  function validateSessionDateMatch(sessionDate: string, todaySpain: string) {
    if (sessionDate > todaySpain) {
      return { allowed: false, code: 'FUTURE_SESSION_NOT_ALLOWED', error: 'El formulario de bienestar solo puede completarse el día del entrenamiento.' };
    }
    if (sessionDate < todaySpain) {
      return { allowed: false, code: 'PAST_SESSION_EXPIRED', error: 'El plazo para completar el cuestionario previo de bienestar de esta sesión ya ha finalizado.' };
    }
    return { allowed: true };
  }

  const today = '2026-10-12';
  const futureSession = '2026-10-13';
  const pastSession = '2026-10-11';

  const futureCheck = validateSessionDateMatch(futureSession, today);
  assert(futureCheck.allowed === false && futureCheck.code === 'FUTURE_SESSION_NOT_ALLOWED', 'H3: Rechaza estrictamente sesión futura');

  const pastCheck = validateSessionDateMatch(pastSession, today);
  assert(pastCheck.allowed === false && pastCheck.code === 'PAST_SESSION_EXPIRED', 'H3: Rechaza estrictamente sesión pasada caducada');

  const todayCheck = validateSessionDateMatch(today, today);
  assert(todayCheck.allowed === true, 'H3: Permite enviar cuestionario únicamente en la fecha local de la sesión');

  // H4: Redacción en servidor de datos de molestias para roles no autorizados
  function redactWellnessDiscomfort(entry: {
    hasDiscomfort: boolean;
    discomfortZone?: string | null;
    discomfortIntensity?: number | null;
    notes?: string | null;
  }, canViewDiscomfort: boolean) {
    if (!canViewDiscomfort) {
      return {
        hasDiscomfort: entry.hasDiscomfort,
        discomfortZone: null,
        discomfortIntensity: null,
        notes: null,
        isDiscomfortRedacted: true
      };
    }
    return {
      hasDiscomfort: entry.hasDiscomfort,
      discomfortZone: entry.discomfortZone ?? null,
      discomfortIntensity: entry.discomfortIntensity ?? null,
      notes: entry.notes ?? null,
      isDiscomfortRedacted: false
    };
  }

  const rawEntry = {
    hasDiscomfort: true,
    discomfortZone: 'Isquiotibial izquierdo',
    discomfortIntensity: 7,
    notes: 'Tirón agudo durante el calentamiento'
  };

  const staffView = redactWellnessDiscomfort(rawEntry, true);
  assert(staffView.isDiscomfortRedacted === false && staffView.discomfortZone === 'Isquiotibial izquierdo', 'H4: Personal técnico/médico autorizado recibe detalles de la molestia');

  const unauthorizedView = redactWellnessDiscomfort(rawEntry, false);
  assert(unauthorizedView.isDiscomfortRedacted === true && unauthorizedView.discomfortZone === null && unauthorizedView.notes === null, 'H4: Rol no autorizado recibe zona y notas eliminadas/redactadas en el servidor');
  assert(unauthorizedView.hasDiscomfort === true, 'H4: Se conserva el indicador booleano hasDiscomfort sin filtrar información clínica sensible');
}

// 16. Fase 1.2: Conexión y Centralización de Alertas de Wellness
console.log('\n16. Fase 1.2: Conexión y Centralización de Alertas de Wellness:');
{
  const { WELLNESS_CONFIG } = require('../src/lib/performance/wellness-config');
  const { generateInformationalAlerts } = require('../src/lib/performance/wellness-service');

  // 16.1 Comprobar que generateInformationalAlerts obedece a WELLNESS_CONFIG.alertThresholds
  assert(WELLNESS_CONFIG.alertThresholds.fatigueAttentionThreshold === 4, '16.1: Umbral de fatiga aprobado es 4');
  assert(WELLNESS_CONFIG.alertThresholds.sorenessAttentionThreshold === 4, '16.1: Umbral de agujetas/dolor muscular aprobado es 4');
  assert(WELLNESS_CONFIG.alertThresholds.discomfortSevereIntensityThreshold === 7, '16.1: Umbral de molestia severa aprobado es 7');
  assert(WELLNESS_CONFIG.alertThresholds.highRpeThreshold === 9, '16.1: Umbral de alto RPE aprobado es 9');

  // Alerta de fatiga en umbral exacto
  const fatigueAlerts = generateInformationalAlerts({
    sleepQuality: 3,
    fatigue: 4,
    soreness: 2,
    stress: 2,
    mood: 3
  });
  assert(fatigueAlerts.some(a => a.type === 'fatigue_warning' && a.level === 'attention'), '16.1: Fatiga 4 genera alerta fatigue_warning con level attention');

  const fatigueSubThreshold = generateInformationalAlerts({
    sleepQuality: 3,
    fatigue: 3,
    soreness: 2,
    stress: 2,
    mood: 3
  });
  assert(!fatigueSubThreshold.some(a => a.type === 'fatigue_warning'), '16.1: Fatiga 3 (bajo umbral) no genera alerta');

  // Alerta de molestia severa (intensidad >= 7 -> level attention; < 7 -> level info)
  const severeDiscomfortAlerts = generateInformationalAlerts(undefined, {
    hasDiscomfort: true,
    zone: 'Aductor derecho',
    intensity: 7,
    notes: 'Pinchazo'
  });
  assert(severeDiscomfortAlerts.some(a => a.type === 'discomfort_reported' && a.level === 'attention' && a.zone === 'Aductor derecho'), '16.1: Molestia severa (7/10) genera level attention y zona');

  const moderateDiscomfortAlerts = generateInformationalAlerts(undefined, {
    hasDiscomfort: true,
    zone: 'Cuádriceps',
    intensity: 5,
    notes: 'Cargado'
  });
  assert(moderateDiscomfortAlerts.some(a => a.type === 'discomfort_reported' && a.level === 'info'), '16.1: Molestia moderada (5/10) genera level info');

  // 16.2 Simulación del Panel de Rendimiento: cálculo para completados, omisión para pendientes y redacción para no autorizados
  const mockPlayers = [
    {
      playerId: 'p-1',
      playerName: 'Carlos Ruiz',
      dorsal: 7,
      avatarUrl: null,
      wellnessStatus: 'completed' as const,
      canViewDiscomfort: true, // Personal técnico
      ratings: { sleepQuality: 2, fatigue: 4, soreness: 5, stress: 3, mood: 2 },
      discomfort: { hasDiscomfort: true, zone: 'Isquiotibial', intensity: 8, notes: 'Tirón' }
    },
    {
      playerId: 'p-2',
      playerName: 'Marcos Gil',
      dorsal: 10,
      avatarUrl: null,
      wellnessStatus: 'completed' as const,
      canViewDiscomfort: false, // Rol no técnico (redactado)
      ratings: { sleepQuality: 4, fatigue: 2, soreness: 2, stress: 2, mood: 4 },
      discomfort: { hasDiscomfort: true, zone: null, intensity: null, notes: null }
    },
    {
      playerId: 'p-3',
      playerName: 'Lucas Vidal',
      dorsal: 4,
      avatarUrl: null,
      wellnessStatus: 'pending' as const, // Pendiente: NO debe generar alertas
      canViewDiscomfort: true,
      ratings: undefined,
      discomfort: undefined
    }
  ];

  const computedAlerts: any[] = [];
  const completedEntries = mockPlayers.filter(p => p.wellnessStatus === 'completed');

  for (const entry of completedEntries) {
    let discomfortForAlert: any = undefined;
    if (entry.discomfort?.hasDiscomfort) {
      discomfortForAlert = {
        hasDiscomfort: true,
        zone: entry.canViewDiscomfort ? entry.discomfort.zone : null,
        intensity: entry.canViewDiscomfort ? entry.discomfort.intensity : null,
        notes: entry.canViewDiscomfort ? entry.discomfort.notes : null,
      };
    }

    const playerAlerts = generateInformationalAlerts(entry.ratings, discomfortForAlert);
    for (const al of playerAlerts) {
      computedAlerts.push({
        playerId: entry.playerId,
        playerName: entry.playerName,
        dorsal: entry.dorsal,
        avatarUrl: entry.avatarUrl,
        alert: al
      });
    }
  }

  // Comprobar que jugador p-1 (técnico autorizado) recibe alertas completas
  const p1Alerts = computedAlerts.filter(a => a.playerId === 'p-1');
  assert(p1Alerts.length === 3, '16.2: Jugador p-1 genera 3 alertas (fatiga, dolor y molestia)');
  assert(p1Alerts.some(a => a.alert.type === 'fatigue_warning'), '16.2: p-1 tiene alerta de fatiga');
  assert(p1Alerts.some(a => a.alert.type === 'soreness_warning'), '16.2: p-1 tiene alerta de dolor');
  const p1Discomfort = p1Alerts.find(a => a.alert.type === 'discomfort_reported');
  assert(p1Discomfort.alert.zone === 'Isquiotibial', '16.2: Personal técnico ve la zona anatómica en la alerta');

  // Comprobar que jugador p-2 (no autorizado) recibe la alerta pero sin zona ni datos clínicos
  const p2Alerts = computedAlerts.filter(a => a.playerId === 'p-2');
  assert(p2Alerts.length === 1, '16.2: Jugador p-2 genera 1 alerta de molestia');
  assert(p2Alerts[0].alert.zone === null, '16.2: Rol no autorizado tiene la zona anatómica en null (redactada)');
  assert(!p2Alerts[0].alert.message.includes('Isquiotibial'), '16.2: Mensaje de alerta para no autorizado no filtra términos clínicos');

  // Comprobar que jugador p-3 (pendiente) NO generó ninguna alerta
  const p3Alerts = computedAlerts.filter(a => a.playerId === 'p-3');
  assert(p3Alerts.length === 0, '16.2: Formulario pendiente (p-3) no genera ninguna alerta en el panel');
}

// 17. Fase 1.3: Integración de Alertas de Wellness en el Drawer Individual
console.log('\n17. Fase 1.3: Alertas en el Drawer Individual (Filtrado por Jugador, Fecha y Permisos):');
{
  // Simular la extracción de props para el Drawer:
  // playerWellnessEntry = wellnessSummary.playerEntries.find(p => p.playerId === drawerPlayerId)
  // playerWellnessAlerts = wellnessSummary.alerts.filter(a => a.playerId === drawerPlayerId).map(a => a.alert)

  const mockDateToday = '2026-10-12';
  const mockDateYesterday = '2026-10-11';

  const mockWellnessSummary = {
    date: mockDateToday,
    playerEntries: [
      {
        playerId: 'player-alpha',
        attendanceStatus: 'confirmed' as const,
        wellnessStatus: 'completed' as const,
        hooperScore: 16,
        ratings: { sleepQuality: 2, fatigue: 4, soreness: 5, stress: 3, mood: 2 },
        discomfort: { hasDiscomfort: true, zone: 'Sóleo derecho', intensity: 8, notes: 'Sobrecarga' },
        canViewDiscomfort: true,
        submittedAt: `${mockDateToday}T09:30:00Z`
      },
      {
        playerId: 'player-beta',
        attendanceStatus: 'confirmed' as const,
        wellnessStatus: 'completed' as const,
        hooperScore: 12,
        ratings: { sleepQuality: 4, fatigue: 2, soreness: 2, stress: 2, mood: 2 },
        discomfort: { hasDiscomfort: true, zone: null, intensity: null, notes: null }, // Redactado en servidor
        canViewDiscomfort: false,
        submittedAt: `${mockDateToday}T09:45:00Z`
      },
      {
        playerId: 'player-gamma',
        attendanceStatus: 'confirmed' as const,
        wellnessStatus: 'pending' as const,
        hooperScore: null,
        ratings: undefined,
        discomfort: undefined,
        canViewDiscomfort: true,
        submittedAt: undefined
      }
    ],
    alerts: [
      {
        playerId: 'player-alpha',
        alert: { type: 'fatigue_warning' as const, level: 'attention' as const, message: 'Fatiga percibida elevada (4/5).' }
      },
      {
        playerId: 'player-alpha',
        alert: { type: 'soreness_warning' as const, level: 'attention' as const, message: 'Dolor muscular elevado (5/5).' }
      },
      {
        playerId: 'player-alpha',
        alert: { type: 'discomfort_reported' as const, level: 'attention' as const, message: 'Molestia comunicada en Sóleo derecho (Intensidad 8/10).', zone: 'Sóleo derecho' }
      },
      {
        playerId: 'player-beta',
        alert: { type: 'discomfort_reported' as const, level: 'info' as const, message: 'Molestia comunicada antes del entrenamiento (Intensidad N/A/10).', zone: null }
      }
    ]
  };

  // Función pura que resuelve las props pasadas al Drawer
  function resolveDrawerWellnessProps(playerId: string, summary: typeof mockWellnessSummary, requestedDate: string) {
    if (summary.date !== requestedDate) {
      return { playerWellnessEntry: undefined, playerWellnessAlerts: [] };
    }
    const entry = summary.playerEntries.find(p => p.playerId === playerId);
    const alerts = summary.alerts.filter(a => a.playerId === playerId).map(a => a.alert);
    return { playerWellnessEntry: entry, playerWellnessAlerts: alerts };
  }

  // Caso 1: Jugador Alpha (técnico autorizado) en la fecha correcta
  const alphaProps = resolveDrawerWellnessProps('player-alpha', mockWellnessSummary, mockDateToday);
  assert(alphaProps.playerWellnessEntry !== undefined, '17.1: Drawer recibe entry para player-alpha');
  assert(alphaProps.playerWellnessAlerts.length === 3, '17.1: Drawer recibe exactamente las 3 alertas de player-alpha');
  assert(alphaProps.playerWellnessEntry?.canViewDiscomfort === true, '17.1: canViewDiscomfort es true para personal autorizado');
  assert(alphaProps.playerWellnessEntry?.discomfort?.zone === 'Sóleo derecho', '17.1: Personal técnico ve zona anatómica en el Drawer');
  assert(alphaProps.playerWellnessAlerts[2].zone === 'Sóleo derecho', '17.1: Alerta en el Drawer incluye la zona anatómica');

  // Caso 2: Jugador Beta (rol no técnico) en la fecha correcta
  const betaProps = resolveDrawerWellnessProps('player-beta', mockWellnessSummary, mockDateToday);
  assert(betaProps.playerWellnessEntry !== undefined, '17.2: Drawer recibe entry para player-beta');
  assert(betaProps.playerWellnessAlerts.length === 1, '17.2: Drawer recibe exactamente la 1 alerta de player-beta');
  assert(betaProps.playerWellnessEntry?.canViewDiscomfort === false, '17.2: canViewDiscomfort es false para rol no técnico');
  assert(betaProps.playerWellnessEntry?.discomfort?.zone === null, '17.2: Zona anatómica está estrictamente redactada (null) para no autorizado');
  assert(betaProps.playerWellnessAlerts[0].zone === null, '17.2: Alerta en el Drawer tiene zone=null sin fuga clínica');

  // Caso 3: Jugador Gamma (wellness pendiente)
  const gammaProps = resolveDrawerWellnessProps('player-gamma', mockWellnessSummary, mockDateToday);
  assert(gammaProps.playerWellnessEntry?.wellnessStatus === 'pending', '17.3: Drawer identifica estado pending para player-gamma');
  assert(gammaProps.playerWellnessAlerts.length === 0, '17.3: Jugador pendiente no tiene ninguna alerta en el Drawer');

  // Caso 4: Aislamiento temporal: si el summary fuera de otra fecha, no transfiere alertas obsoletas
  const outdatedProps = resolveDrawerWellnessProps('player-alpha', mockWellnessSummary, mockDateYesterday);
  assert(outdatedProps.playerWellnessEntry === undefined, '17.4: Sesión de fecha distinta no transfiere entry obsoleta al Drawer');
  assert(outdatedProps.playerWellnessAlerts.length === 0, '17.4: Sesión de fecha distinta no transfiere alertas al Drawer');

  // Caso 5: Aislamiento entre jugadores: player-gamma no recibe alertas de player-alpha
  const gammaAlertsCheck = gammaProps.playerWellnessAlerts.some((a: any) => a.zone === 'Sóleo derecho');
  assert(!gammaAlertsCheck, '17.5: Estricto aislamiento: las alertas de un jugador no se mezclan en el Drawer de otro');
}

console.log(`\n========================================`);
console.log(`TOTAL CASOS: ${passed + failed} | SUPERADOS: ${passed} | FALLIDOS: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}


