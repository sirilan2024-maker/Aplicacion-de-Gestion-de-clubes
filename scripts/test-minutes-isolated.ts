/**
 * Pruebas unitarias aisladas para el modelo de minutos, validación de feedback,
 * tokens HMAC y cálculo de cargas.
 * Ejecución 100% local, sin base de datos ni peticiones de red.
 */

import crypto from 'crypto';
import {
  calculatePlannedTrainingDuration,
  validateTrainingFeedbackInputs,
  calculateTrainingLoad,
  reconcileMatchMinutes,
  computeMinutesFromLiveEvents,
  getSpainReferenceDate,
  calculateCalendarDaysDiff,
  isConfirmedAttendanceStatus,
  isCancelledTrainingSession,
  isTrainingSessionEligible,
  calculateRollingWorkloadMetrics,
  aggregatePlayerMultiTeamWorkload,
  resolveOfficialMatchMinutes,
  canSubmitTrainingFeedbackForm,
  resolveTrainingFeedbackUIState,
} from '../src/lib/performance/minutes-service';
import { verifyFeedbackToken } from '../src/app/actions/feedback-actions';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

console.log("=== INICIANDO PRUEBAS UNITARIAS AISLADAS (MODELO DE MINUTOS Y TOKENS) ===\n");

// 1. Duración calculada a partir de los horarios
{
  const result = calculatePlannedTrainingDuration("18:00:00", "19:30:00");
  assert(result.durationMinutes === 90 && result.isFallback === false, "Duración 18:00 - 19:30 debe ser exactamente 90 minutos confirmados");

  const result75 = calculatePlannedTrainingDuration("17:30", "18:45");
  assert(result75.durationMinutes === 75 && result75.isFallback === false, "Duración 17:30 - 18:45 debe ser exactamente 75 minutos confirmados");
}

// 2. Ausencia de hora de fin (Fallback)
{
  const resultNoEnd = calculatePlannedTrainingDuration("18:00:00", null);
  assert(resultNoEnd.durationMinutes === 90 && resultNoEnd.isFallback === true, "Falta end_time: debe devolver 90 minutos con isFallback = true");

  const resultNoStart = calculatePlannedTrainingDuration(null, "19:00:00");
  assert(resultNoStart.durationMinutes === 90 && resultNoStart.isFallback === true, "Falta start_time: debe devolver 90 minutos con isFallback = true");
}

// 3. Minutos parciales y validación de rangos legítimos
{
  const partial = validateTrainingFeedbackInputs(7.5, 45);
  assert(partial.isValid === true && partial.cleanRpe === 7.5 && partial.cleanMinutes === 45, "Participación parcial de 45 minutos debe ser válida");

  const full = validateTrainingFeedbackInputs(9, 90);
  assert(full.isValid === true && full.cleanMinutes === 90, "90 minutos completos debe ser válido");
}

// 4. Valores inválidos rechazados en servidor
{
  const invalidRpeHigh = validateTrainingFeedbackInputs(15, 60);
  assert(invalidRpeHigh.isValid === false, "RPE 15 (>10) debe ser rechazado");

  const invalidRpeNegative = validateTrainingFeedbackInputs(-1, 60);
  assert(invalidRpeNegative.isValid === false, "RPE negativo (-1) debe ser rechazado");

  const validRpeZero = validateTrainingFeedbackInputs(0, 60);
  assert(validRpeZero.isValid === true && validRpeZero.cleanRpe === 0, "RPE 0 (sin esfuerzo/reposo) debe ser admitido");

  const invalidMinutesNeg = validateTrainingFeedbackInputs(6, -10);
  assert(invalidMinutesNeg.isValid === false, "Minutos negativos deben ser rechazados");

  const invalidMinutesHuge = validateTrainingFeedbackInputs(6, 999);
  assert(invalidMinutesHuge.isValid === false, "Minutos absurdos (999) deben ser rechazados");
}

// 5. RPE válido (0 a 10), distinción de 0 minutos (0 UA) y estados pendientes
{
  const rpeZero = validateTrainingFeedbackInputs(0, 45);
  assert(rpeZero.isValid === true && rpeZero.cleanRpe === 0, "RPE 0 (reposo/sin esfuerzo) debe ser admitido legítimamente");

  const noMinutes = validateTrainingFeedbackInputs(8, null);
  assert(noMinutes.isValid === true && noMinutes.cleanMinutes === null, "RPE 8 sin minutos debe ser aceptado con cleanMinutes = null");

  const zeroMinutes = validateTrainingFeedbackInputs(8, 0);
  assert(zeroMinutes.isValid === true && zeroMinutes.cleanMinutes === 0, "RPE 8 con 0 minutos debe ser aceptado preservando 0 explícito");

  const loadPendingMinutes = calculateTrainingLoad(8, null);
  assert(loadPendingMinutes.load === null && loadPendingMinutes.status === 'pending_minutes', "Sin minutos (null), la carga debe ser null y estado 'pending_minutes'");

  const loadPendingRpe = calculateTrainingLoad(null, 60);
  assert(loadPendingRpe.load === null && loadPendingRpe.status === 'pending_rpe', "Sin RPE (null), la carga debe ser null y estado 'pending_rpe'");

  const loadZeroMinutes = calculateTrainingLoad(8, 0);
  assert(loadZeroMinutes.load === 0 && loadZeroMinutes.status === 'confirmed', "Con 0 minutos reales y RPE 8, la carga es exactamente 0 UA confirmada");

  const loadZeroRpeZeroMin = calculateTrainingLoad(0, 0);
  assert(loadZeroRpeZeroMin.load === 0 && loadZeroRpeZeroMin.status === 'confirmed', "Con 0 minutos reales y RPE 0, la carga es exactamente 0 UA confirmada");

  const loadConfirmed = calculateTrainingLoad(8, 60);
  assert(loadConfirmed.load === 480 && loadConfirmed.status === 'confirmed', "RPE 8 * 60 min debe resultar en carga confirmada de 480 UA");
}

// 6. Precedencia de minutos de partido y detección de discrepancias
{
  // 6.1 Acta oficial tiene máxima prioridad y señala discrepancia con manual sin sobrescribir destructivamente
  const actaWithManual = reconcileMatchMinutes({
    actaMinutes: 70,
    manualMinutes: 90,
    liveMinutes: 70
  });
  assert(actaWithManual.minutes === 70 && actaWithManual.source === 'acta' && actaWithManual.hasDiscrepancy === true, "Acta oficial prevalece sobre manual y directo, marcando hasDiscrepancy: true");

  // 6.2 Manual validado prevalece sobre directo incompleto o conflictivo
  const manualOverLive = reconcileMatchMinutes({
    actaMinutes: null,
    manualMinutes: 80,
    liveMinutes: 60,
    isLiveReliable: true
  });
  assert(manualOverLive.minutes === 80 && manualOverLive.source === 'manual' && manualOverLive.hasDiscrepancy === true, "Manual validado prevalece sobre directo y señala discrepancia en notas");

  // 6.3 Directo no fiable (ej. incompleto) no desplaza manual ni genera minutos espurios
  const manualOverUnreliableLive = reconcileMatchMinutes({
    actaMinutes: null,
    manualMinutes: 80,
    liveMinutes: 45,
    isLiveReliable: false
  });
  assert(manualOverUnreliableLive.minutes === 80 && manualOverUnreliableLive.source === 'manual' && manualOverUnreliableLive.hasDiscrepancy === false, "Directo no fiable es descartado y se respeta manual");

  // 6.4 Directo se utiliza si es fiable y no hay acta ni manual
  const liveOnly = reconcileMatchMinutes({
    actaMinutes: null,
    manualMinutes: null,
    liveMinutes: 65,
    isLiveReliable: true
  });
  assert(liveOnly.minutes === 65 && liveOnly.source === 'live' && liveOnly.status === 'confirmed', "Sin acta ni manual, directo fiable se utiliza como confirmado");

  // 6.5 Directo no fiable sin otras fuentes queda pendiente
  const unreliableLiveOnly = reconcileMatchMinutes({
    actaMinutes: null,
    manualMinutes: null,
    liveMinutes: 40,
    isLiveReliable: false
  });
  assert(unreliableLiveOnly.minutes === null && unreliableLiveOnly.status === 'pending', "Directo no fiable sin otras fuentes queda pending");
}

// 7. Sustituciones y expulsiones cuando el directo sea suficiente
{
  const events = [
    { tipo_evento: 'Cambio', minuto: 60, player_id: 'player-suplente-1', notas: 'Cambio: Entra player-suplente-1 por player-titular-1' }
  ];

  // Titular sustituido en min 60
  const starterMinutes = computeMinutesFromLiveEvents({
    matchDurationMinutes: 90,
    isStarter: true,
    events,
    playerId: 'player-titular-1'
  });
  assert(starterMinutes.minutes === 60 && starterMinutes.isReliable === true, "Titular sustituido en min 60 debe tener 60 minutos calculados desde directo");

  // Suplente que entra en min 60
  const subMinutes = computeMinutesFromLiveEvents({
    matchDurationMinutes: 90,
    isStarter: false,
    events,
    playerId: 'player-suplente-1'
  });
  assert(subMinutes.minutes === 30 && subMinutes.isReliable === true, "Suplente que entra en min 60 de partido de 90 debe tener 30 minutos calculados");

  // Expulsión con roja
  const eventsRed = [
    { tipo_evento: 'Tarjeta Roja', minuto: 40, player_id: 'player-titular-2' }
  ];
  const redMinutes = computeMinutesFromLiveEvents({
    matchDurationMinutes: 90,
    isStarter: true,
    events: eventsRed,
    playerId: 'player-titular-2'
  });
  assert(redMinutes.minutes === 40 && redMinutes.isReliable === true, "Jugador expulsado en min 40 debe tener 40 minutos computados");
}

// 8. Cambios rotativos que deben dejar el cálculo pendiente
{
  const rotaryCategoryResult = computeMinutesFromLiveEvents({
    matchDurationMinutes: 60,
    isStarter: true,
    events: [],
    playerId: 'player-f8',
    isRotarySubstitutionCategory: true
  });
  assert(rotaryCategoryResult.minutes === null && rotaryCategoryResult.isReliable === false, "Categoría con sustituciones rotativas/volantes debe rechazar cálculo lineal y dejarlo pendiente");
}

// 9. Pruebas de seguridad aisladas para verifyFeedbackToken
(async () => {
  const testSecret = "test-secret-salt-strictly-isolated";
  process.env.FEEDBACK_SIGNING_SECRET = testSecret;

  const eventId = "11111111-1111-1111-1111-111111111111";
  const playerId = "22222222-2222-2222-2222-222222222222";
  const validExp = Date.now() + 1000 * 60 * 60; // 1 hora en el futuro
  const expiredExp = Date.now() - 1000 * 60;    // 1 minuto en el pasado

  const generateToken = (fType: string, eId: string, pId: string, exp: number, sec: string) => {
    return crypto.createHmac('sha256', sec).update(`${fType}:${eId}:${pId}:${exp}`).digest('hex');
  };

  const validRpeToken = generateToken('rpe', eventId, playerId, validExp, testSecret);
  const validWellnessToken = generateToken('wellness', eventId, playerId, validExp, testSecret);

  // 9.1 Token válido por tipo de formulario
  assert(await verifyFeedbackToken('rpe', eventId, playerId, validExp, validRpeToken) === true, "Token válido de RPE y no expirado debe ser verificado con éxito");
  assert(await verifyFeedbackToken('wellness', eventId, playerId, validExp, validWellnessToken) === true, "Token válido de Wellness y no expirado debe ser verificado con éxito");

  // 9.1.1 Aislamiento estricto entre tipos de formulario (rechazo cruzado)
  assert(await verifyFeedbackToken('rpe', eventId, playerId, validExp, validWellnessToken) === false, "Token de Wellness debe ser estrictamente rechazado al presentarse para RPE");
  assert(await verifyFeedbackToken('wellness', eventId, playerId, validExp, validRpeToken) === false, "Token de RPE debe ser estrictamente rechazado al presentarse para Wellness");
  assert(await verifyFeedbackToken('invalid_type' as any, eventId, playerId, validExp, validRpeToken) === false, "Tipo de formulario no canónico debe ser rechazado inmediatamente");

  // 9.2 Firma manipulada
  const tamperedToken = validRpeToken.substring(0, validRpeToken.length - 2) + "aa";
  assert(await verifyFeedbackToken('rpe', eventId, playerId, validExp, tamperedToken) === false, "Token con firma manipulada debe ser rechazado");

  // 9.3 Token caducado
  const expiredToken = generateToken('rpe', eventId, playerId, expiredExp, testSecret);
  assert(await verifyFeedbackToken('rpe', eventId, playerId, expiredExp, expiredToken) === false, "Token con timestamp expirado debe ser rechazado");

  // 9.4 Token con longitud incorrecta (incluyendo cadena vacía o longitud impar)
  assert(await verifyFeedbackToken('rpe', eventId, playerId, validExp, "") === false, "Token vacío debe ser rechazado sin lanzar excepción");
  assert(await verifyFeedbackToken('rpe', eventId, playerId, validExp, "abc") === false, "Token con longitud corta/dispar debe ser rechazado sin RangeError");
  assert(await verifyFeedbackToken('rpe', eventId, playerId, validExp, "a".repeat(128)) === false, "Token con longitud excesiva debe ser rechazado sin RangeError");

  // 9.5 eventId distinto
  const wrongEventId = "33333333-3333-3333-3333-333333333333";
  assert(await verifyFeedbackToken('rpe', wrongEventId, playerId, validExp, validRpeToken) === false, "Token generado para otro eventId debe ser rechazado");

  // 9.6 playerId distinto
  const wrongPlayerId = "44444444-4444-4444-4444-444444444444";
  assert(await verifyFeedbackToken('rpe', eventId, wrongPlayerId, validExp, validRpeToken) === false, "Token generado para otro playerId debe ser rechazado");

  // 9.7 Secreto ausente (fallo cerrado)
  delete process.env.FEEDBACK_SIGNING_SECRET;
  assert(await verifyFeedbackToken('rpe', eventId, playerId, validExp, validRpeToken) === false, "Sin FEEDBACK_SIGNING_SECRET configurado, verifyFeedbackToken debe fallar de forma cerrada (false)");

  // Restaurar testSecret para evitar residuos
  delete process.env.FEEDBACK_SIGNING_SECRET;

  // 9.8 Entradas malformadas (undefined, null, NaN)
  assert(await verifyFeedbackToken('rpe', null as any, playerId, validExp, validRpeToken) === false, "eventId null no debe provocar excepciones");
  assert(await verifyFeedbackToken('rpe', eventId, playerId, NaN, validRpeToken) === false, "exp NaN no debe provocar excepciones");
  assert(await verifyFeedbackToken('rpe', eventId, playerId, validExp, null as any) === false, "token null no debe provocar excepciones");

  console.log("\n=== FASE 1B: PRUEBAS DE VENTANAS TEMPORALES, ACWR, MULTI-EQUIPO Y MINUTOS ===");

  // Referencia sintética fija: 2026-10-18 19:00:00 Europe/Madrid (17:00:00Z en horario CEST +02:00)
  const refNow = new Date("2026-10-18T17:00:00.000Z");
  const refDateStr = getSpainReferenceDate(refNow);
  assert(refDateStr === "2026-10-18", "Referencia temporal en Europe/Madrid debe resolverse a 2026-10-18");

  // 10.1 Ventana aguda exacta de 7 días calendario: incluye D_ref (diff=0) y D_ref - 6d (diff=6); excluye D_ref - 7d (diff=7)
  {
    const w = calculateRollingWorkloadMetrics({
      now: refNow,
      sessions: [
        { eventId: "ev-d0", date: "2026-10-18", rpe: 7, minutes: 100, attendanceStatus: "present" }, // diff=0 -> 700 UA
        { eventId: "ev-d6", date: "2026-10-12", rpe: 7, minutes: 100, attendanceStatus: "present" }, // diff=6 -> 700 UA
        { eventId: "ev-d7", date: "2026-10-11", rpe: 7, minutes: 100, attendanceStatus: "present" }, // diff=7 -> fuera de aguda, dentro de crónica
      ],
    });
    assert(
      w.acuteSum === 1400 && w.acuteSessionCount === 2 && w.chronicSum === 2100,
      "Caso 1: Ventana aguda de 7 días incluye D_ref (2026-10-18) y D_ref-6d (2026-10-12), y excluye D_ref-7d (2026-10-11)"
    );
  }

  // 10.2 Ventana crónica exacta de 28 días calendario: incluye D_ref (diff=0) y D_ref - 27d (diff=27); excluye D_ref - 28d (diff=28)
  {
    const w = calculateRollingWorkloadMetrics({
      now: refNow,
      sessions: [
        { eventId: "ev-c0", date: "2026-10-18", rpe: 5, minutes: 100, attendanceStatus: "present" },  // diff=0 -> 500 UA
        { eventId: "ev-c27", date: "2026-09-21", rpe: 5, minutes: 100, attendanceStatus: "present" }, // diff=27 -> 500 UA
        { eventId: "ev-c28", date: "2026-09-20", rpe: 5, minutes: 100, attendanceStatus: "present" }, // diff=28 -> excluida
      ],
    });
    assert(
      w.chronicSum === 1000 && w.chronicSessionCount === 2,
      "Caso 2: Ventana crónica de 28 días incluye D_ref (2026-10-18) y D_ref-27d (2026-09-21), y excluye D_ref-28d (2026-09-20)"
    );
  }

  // 10.3 Días de descanso incluidos en el denominador / 7 y / 28
  {
    const w = calculateRollingWorkloadMetrics({
      now: refNow,
      sessions: [
        { eventId: "ev-rest-1", date: "2026-10-17", rpe: 7, minutes: 100, attendanceStatus: "present" }, // 700 UA en un único día
      ],
    });
    assert(
      w.acuteLoad === 100 && w.chronicLoad === 25 && w.acwr === 4.0,
      "Caso 3: Días de descanso incluidos en el denominador (/7 = 100 UA/día, /28 = 25 UA/día)"
    );
  }

  // 10.4 Exclusión de sesiones futuras (diffDays < 0)
  {
    const futureDiff = calculateCalendarDaysDiff("2026-10-18", "2026-10-19");
    const w = calculateRollingWorkloadMetrics({
      now: refNow,
      sessions: [
        { eventId: "ev-future", date: "2026-10-19", rpe: 8, minutes: 90, attendanceStatus: "present" },
      ],
    });
    assert(
      futureDiff === -1 && w.acuteSum === 0 && w.chronicSum === 0 && w.acwr === null,
      "Caso 4: Sesiones futuras (diffDays < 0) quedan estrictamente excluidas"
    );
  }

  // 10.5 Sesión de hoy antes de hora de inicio y sin asistencia registrada: excluida (incluso si tiene RPE y/o minutos registrados)
  {
    const morningNow = new Date("2026-10-18T08:00:00.000Z"); // 10:00 Europe/Madrid
    const eligibleNoMetrics = isTrainingSessionEligible({
      eventDate: "2026-10-18",
      eventStartTime: "18:30:00",
      attendanceStatus: "unmarked",
      hasRealMetrics: false,
      now: morningNow,
    });
    const eligibleWithRpeOnly = isTrainingSessionEligible({
      eventDate: "2026-10-18",
      eventStartTime: "18:30:00",
      attendanceStatus: null,
      hasRecordedMetrics: true,
      hasRealMetrics: true,
      now: morningNow,
    });
    const wFutureTodayWithMetrics = calculateRollingWorkloadMetrics({
      now: morningNow,
      sessions: [
        { eventId: "ev-today-rpe-only", date: "2026-10-18", start_time: "18:30:00", rpe: 7, minutes: null, attendanceStatus: null },
        { eventId: "ev-today-min-only", date: "2026-10-18", start_time: "18:30:00", rpe: null, minutes: 90, attendanceStatus: "unmarked" },
        { eventId: "ev-today-both-metrics", date: "2026-10-18", start_time: "18:30:00", rpe: 7, minutes: 90, attendanceStatus: "pending" },
        { eventId: "ev-today-no-starttime", date: "2026-10-18", start_time: null, rpe: 8, minutes: 90, attendanceStatus: null },
      ],
    });
    assert(
      eligibleNoMetrics === false &&
      eligibleWithRpeOnly === false &&
      wFutureTodayWithMetrics.acuteSessionCount === 0 &&
      wFutureTodayWithMetrics.acuteSum === 0 &&
      wFutureTodayWithMetrics.evaluatedSessions.every(s => s.status === "ineligible"),
      "Caso 5: Sesión de hoy futura (10:00 < 18:30) o sin start_time y sin decisión de asistencia queda excluida aunque tenga RPE, minutos o ambos"
    );
  }

  // 10.6 Sesión de hoy con asistencia registrada (incluida ausencia explícita) o alcanzada/pasada su hora de inicio en Europe/Madrid: elegible
  {
    const morningNow = new Date("2026-10-18T08:00:00.000Z"); // 10:00 Europe/Madrid
    const exactStartNow = new Date("2026-10-18T16:30:00.000Z"); // 18:30 Europe/Madrid (exactamente igual a start_time)
    const eveningNow = new Date("2026-10-18T17:00:00.000Z"); // 19:00 Europe/Madrid
    const eligibleByAttendance = isTrainingSessionEligible({
      eventDate: "2026-10-18",
      eventStartTime: "18:30:00",
      attendanceStatus: "presente",
      hasRealMetrics: false,
      now: morningNow,
    });
    const eligibleByExplicitAbsence = isTrainingSessionEligible({
      eventDate: "2026-10-18",
      eventStartTime: "18:30:00",
      attendanceStatus: "ausente",
      hasRealMetrics: false,
      now: morningNow,
    });
    const eligibleByExactStartTime = isTrainingSessionEligible({
      eventDate: "2026-10-18",
      eventStartTime: "18:30:00",
      attendanceStatus: null,
      hasRealMetrics: false,
      now: exactStartNow,
    });
    const eligibleByStartTime = isTrainingSessionEligible({
      eventDate: "2026-10-18",
      eventStartTime: "18:30:00",
      attendanceStatus: null,
      hasRealMetrics: false,
      now: eveningNow,
    });
    assert(
      eligibleByAttendance === true &&
      eligibleByExplicitAbsence === true &&
      isConfirmedAttendanceStatus("ausente") === false &&
      eligibleByExactStartTime === true &&
      eligibleByStartTime === true,
      "Caso 6: Sesión de hoy con decisión explícita (presente o ausente) o hora de inicio alcanzada/superada en Europe/Madrid es elegible, pero 'ausente' no cuenta como presencia confirmada"
    );
  }

  // 10.7 Exclusión de sesión cancelada cuando la cancelación sea verificable
  {
    const cancelledObj = { id: "ev-canc", status: "Cancelado" };
    const isCancelled = isCancelledTrainingSession(cancelledObj);
    const w = calculateRollingWorkloadMetrics({
      now: refNow,
      sessions: [
        { eventId: "ev-canc", date: "2026-10-16", rpe: 8, minutes: 90, event: cancelledObj },
      ],
    });
    assert(
      isCancelled === true && w.acuteSum === 0 && w.chronicSum === 0,
      "Caso 7: Sesión cancelada verificable queda excluida del cálculo de carga y ACWR"
    );
  }

  // 10.8 Caso de cruce horario UTC vs Europe/Madrid (22:30Z en verano CEST = 00:30 del día siguiente; 23:30Z en invierno CET = 00:30 del día siguiente)
  {
    const summerLateUtc = new Date("2026-07-15T22:30:00.000Z"); // 2026-07-16 00:30 CEST (+02:00)
    const winterLateUtc = new Date("2026-01-15T23:30:00.000Z"); // 2026-01-16 00:30 CET (+01:00)
    assert(
      getSpainReferenceDate(summerLateUtc) === "2026-07-16" &&
      getSpainReferenceDate(winterLateUtc) === "2026-01-16",
      "Caso 8: Cruce horario UTC vs Europe/Madrid resuelve la fecha local española exacta en verano (22:30Z -> día +1) e invierno (23:30Z -> día +1)"
    );
  }

  // 10.9 RPE = 0 y minutos = 60 genera 0 UA confirmada y cuenta como carga válida 0, no como pendiente
  {
    const loadRes = calculateTrainingLoad(0, 60);
    const w = calculateRollingWorkloadMetrics({
      now: refNow,
      sessions: [
        { eventId: "ev-rpe0", date: "2026-10-17", rpe: 0, minutes: 60 },
      ],
    });
    assert(
      loadRes.load === 0 && loadRes.status === "confirmed" && w.acuteSessionCount === 1 && w.acuteSum === 0,
      "Caso 9: RPE = 0 y minutos = 60 genera 0 UA confirmada y cuenta como sesión válida con carga 0"
    );
  }

  // 10.10 RPE = 8 y minutos = 0 genera 0 UA confirmada, no pendiente
  {
    const loadRes = calculateTrainingLoad(8, 0);
    const w = calculateRollingWorkloadMetrics({
      now: refNow,
      sessions: [
        { eventId: "ev-min0", date: "2026-10-17", rpe: 8, minutes: 0 },
      ],
    });
    assert(
      loadRes.load === 0 && loadRes.status === "confirmed" && w.acuteSessionCount === 1 && w.acuteSum === 0,
      "Caso 10: RPE = 8 y minutos = 0 genera 0 UA confirmada, no pendiente"
    );
  }

  // 10.11 RPE = null y minutos = 90 queda pending_rpe y no aporta carga
  {
    const loadRes = calculateTrainingLoad(null, 90);
    const w = calculateRollingWorkloadMetrics({
      now: refNow,
      sessions: [
        { eventId: "ev-null-rpe", date: "2026-10-17", rpe: null, minutes: 90 },
      ],
    });
    assert(
      loadRes.load === null && loadRes.status === "pending_rpe" && w.acuteSessionCount === 0 && w.acuteSum === 0,
      "Caso 11: RPE = null y minutos = 90 queda pending_rpe y no aporta carga"
    );
  }

  // 10.12 RPE = 7 y minutos = null queda pending_minutes y no aporta carga
  {
    const loadRes = calculateTrainingLoad(7, null);
    const w = calculateRollingWorkloadMetrics({
      now: refNow,
      sessions: [
        { eventId: "ev-null-min", date: "2026-10-17", rpe: 7, minutes: null },
      ],
    });
    assert(
      loadRes.load === null && loadRes.status === "pending_minutes" && w.acuteSessionCount === 0 && w.acuteSum === 0,
      "Caso 12: RPE = 7 y minutos = null queda pending_minutes y no aporta carga"
    );
  }

  // 10.13 Sin cargas válidas en 28 días: acuteLoad = 0, chronicLoad = 0, acwr = null
  {
    const w = calculateRollingWorkloadMetrics({
      now: refNow,
      sessions: [
        { eventId: "ev-old", date: "2026-08-01", rpe: 7, minutes: 90 },
        { eventId: "ev-incomplete", date: "2026-10-17", rpe: null, minutes: 90 },
      ],
    });
    assert(
      w.acuteLoad === 0 && w.chronicLoad === 0 && w.acwr === null,
      "Caso 13: Sin cargas válidas en 28 días devuelve acuteLoad = 0, chronicLoad = 0, acwr = null"
    );
  }

  // 10.14 Con carga válida solo en ventana aguda: calcular acuteLoad, chronicLoad y acwr sin división por cero
  {
    const w = calculateRollingWorkloadMetrics({
      now: refNow,
      sessions: [
        { eventId: "ev-only-acute", date: "2026-10-16", rpe: 7, minutes: 80 }, // 560 UA -> acute=80, chronic=20, acwr=4.00
      ],
    });
    assert(
      w.acuteLoad === 80 && w.chronicLoad === 20 && w.acwr === 4.0,
      "Caso 14: Carga válida solo en ventana aguda calcula acuteLoad (80), chronicLoad (20) y acwr (4.0) sin división por cero"
    );
  }

  // 10.15 Varias sesiones válidas el mismo día se suman antes de dividir por 7 y 28
  {
    const w = calculateRollingWorkloadMetrics({
      now: refNow,
      sessions: [
        { eventId: "ev-same-day-1", date: "2026-10-15", rpe: 5, minutes: 60 }, // 300 UA
        { eventId: "ev-same-day-2", date: "2026-10-15", rpe: 7, minutes: 60 }, // 420 UA -> total día = 720 UA
      ],
    });
    assert(
      w.dailyLoads["2026-10-15"] === 720 &&
      w.acuteSum === 720 &&
      Math.abs(w.acuteLoad - 720 / 7) < 1e-6 &&
      Math.abs(w.chronicLoad - 720 / 28) < 1e-6 &&
      w.acwr === 4.0,
      "Caso 15: Varias sesiones válidas el mismo día se suman (720 UA) antes de dividir por 7 y 28"
    );
  }

  // 10.16 Jugador multi-equipo con sesiones en dos equipos el mismo día o la misma semana: se agregan sin duplicar eventId
  {
    const agg = aggregatePlayerMultiTeamWorkload({
      now: refNow,
      contextTeamId: "team-cadete-a",
      sessions: [
        { eventId: "ev-cadete-1", teamId: "team-cadete-a", date: "2026-10-15", rpe: 6, minutes: 90, attendanceStatus: "presente" }, // 540 UA
        { eventId: "ev-juvenil-1", teamId: "team-juvenil-b", date: "2026-10-15", rpe: 7, minutes: 60, attendanceStatus: "presente" }, // 420 UA
        { eventId: "ev-juvenil-2", teamId: "team-juvenil-b", date: "2026-10-01", rpe: 8, minutes: 90, attendanceStatus: "presente" }, // 720 UA (crónica)
      ],
    });
    assert(
      agg.acuteSum === 960 &&
      agg.chronicSum === 1680 &&
      agg.contextTeamTrainingMinutes === 90 &&
      agg.totalClubTrainingMinutes === 240 &&
      agg.minutesByTeam["team-cadete-a"] === 90 &&
      agg.minutesByTeam["team-juvenil-b"] === 150 &&
      agg.acwr === Number(((960 / 7) / (1680 / 28)).toFixed(2)),
      "Caso 16: Jugador multi-equipo agrega cargas de ambos equipos en su ACWR biológico y mantiene minutos separados por equipo"
    );
  }

  // 10.17 Misma sesión recibida dos veces por eventId (idéntica o fragmentada en entradas parciales): se fusiona y deduplica sin duplicar carga
  {
    const aggDup = aggregatePlayerMultiTeamWorkload({
      now: refNow,
      contextTeamId: "team-cadete-a",
      sessions: [
        { eventId: "ev-dup-1", teamId: "team-cadete-a", date: "2026-10-16", rpe: 7, minutes: 80, attendanceStatus: "presente" },
        { eventId: "ev-dup-1", teamId: "team-cadete-a", date: "2026-10-16", rpe: 7, minutes: 80, attendanceStatus: "presente" },
      ],
    });
    const aggMerged = aggregatePlayerMultiTeamWorkload({
      now: refNow,
      contextTeamId: "team-cadete-a",
      sessions: [
        { eventId: "test-1", teamId: "team-cadete-a", date: "2026-10-16", rpe: 7, minutes: null, attendanceStatus: null },
        { eventId: "test-1", teamId: "team-cadete-a", date: "2026-10-16", rpe: null, minutes: 90, attendanceStatus: "presente" },
      ],
    });
    const aggZeroMerged = aggregatePlayerMultiTeamWorkload({
      now: refNow,
      contextTeamId: "team-cadete-a",
      sessions: [
        { eventId: "test-zero-1", teamId: "team-cadete-a", date: "2026-10-16", rpe: 0, minutes: null, attendanceStatus: "presente" },
        { eventId: "test-zero-1", teamId: "team-cadete-a", date: "2026-10-16", rpe: null, minutes: 60, attendanceStatus: null },
      ],
    });
    const aggConflict = aggregatePlayerMultiTeamWorkload({
      now: refNow,
      contextTeamId: "team-cadete-a",
      sessions: [
        { eventId: "test-conflict-1", teamId: "team-cadete-a", date: "2026-10-16", rpe: 7, minutes: 90, attendanceStatus: "presente" },
        { eventId: "test-conflict-1", teamId: "team-cadete-a", date: "2026-10-16", rpe: 4, minutes: 90, attendanceStatus: "presente" },
      ],
    });
    assert(
      aggDup.acuteSessionCount === 1 &&
      aggDup.acuteSum === 560 &&
      aggDup.contextTeamTrainingMinutes === 80 &&
      aggMerged.evaluatedSessions.length === 1 &&
      aggMerged.evaluatedSessions[0].rpe === 7 &&
      aggMerged.evaluatedSessions[0].minutes === 90 &&
      aggMerged.evaluatedSessions[0].load === 630 &&
      aggMerged.acuteSessionCount === 1 &&
      aggMerged.acuteSum === 630 &&
      aggZeroMerged.evaluatedSessions.length === 1 &&
      aggZeroMerged.evaluatedSessions[0].rpe === 0 &&
      aggZeroMerged.evaluatedSessions[0].minutes === 60 &&
      aggZeroMerged.evaluatedSessions[0].load === 0 &&
      aggZeroMerged.acuteSessionCount === 1 &&
      aggConflict.evaluatedSessions.length === 1 &&
      aggConflict.evaluatedSessions[0].rpe === null &&
      aggConflict.evaluatedSessions[0].status === "pending_rpe" &&
      aggConflict.acuteSessionCount === 0 &&
      aggConflict.acuteSum === 0,
      "Caso 17: Registros del mismo eventId fusionan campos complementarios (RPE 7 + Min 90 = 630 UA), preservan 0 válido, no duplican carga y dejan pendientes valores contradictorios"
    );
  }

  // 10.18 Minutos de partido y minutos de entrenamiento permanecen separados
  {
    const trainingAgg = aggregatePlayerMultiTeamWorkload({
      now: refNow,
      contextTeamId: "team-a",
      sessions: [
        { eventId: "ev-tr-1", teamId: "team-a", date: "2026-10-16", rpe: 6, minutes: 90, attendanceStatus: "presente" },
      ],
    });
    const matchMins = resolveOfficialMatchMinutes({
      matchEstado: "Finalizado",
      minutosJugados: 75,
      titular: true,
    });
    assert(
      trainingAgg.contextTeamTrainingMinutes === 90 &&
      matchMins === 75 &&
      trainingAgg.acuteSum === 540,
      "Caso 18: Minutos de partido (75') y minutos de entrenamiento (90') permanecen separados y el partido no inyecta carga ficticia en ACWR"
    );
  }

  // 10.19 Jugador titular de partido sin minutos oficiales ni manuales: no recibe 90 minutos automáticos
  {
    const starterNoMinutes = resolveOfficialMatchMinutes({
      matchEstado: "Finalizado",
      minutosJugados: null,
      minutesPlayed: null,
      titular: true,
      convocatoriaStatus: "convocado",
    });
    const unplayedStarter = resolveOfficialMatchMinutes({
      matchEstado: "Pendiente",
      minutosJugados: 90,
      minutesPlayed: 90,
      titular: true,
    });
    const explicitZeroSub = resolveOfficialMatchMinutes({
      matchEstado: "Finalizado",
      minutosJugados: 0,
      minutesPlayed: null,
      titular: false,
    });
    assert(
      starterNoMinutes === null && unplayedStarter === null && explicitZeroSub === 0,
      "Caso 19: Titular sin minutos registrados devuelve null (nunca 90 automáticos), partido no finalizado devuelve null y 0 explícito devuelve 0"
    );
  }

  // 10.20 Estado unmarked no cuenta como asistencia confirmada
  {
    assert(
      isConfirmedAttendanceStatus("unmarked") === false &&
      isConfirmedAttendanceStatus("pending") === false &&
      isConfirmedAttendanceStatus("ausente") === false &&
      isConfirmedAttendanceStatus("presente") === true &&
      isConfirmedAttendanceStatus("retraso") === true,
      "Caso 20: Estado 'unmarked' jamás cuenta como asistencia confirmada"
    );
  }

  console.log("\n=== FASE 1B.2: PRUEBAS DE PERSISTENCIA PARCIAL Y COMUNICACIÓN VERAZ EN FEEDBACK ===");

  // 11.1 Persistencia completa (confirmed): se muestra la confirmación habitual
  {
    const uiConfirmed = resolveTrainingFeedbackUIState({
      success: true,
      persistenceStatus: "confirmed",
      savedTargets: {
        trainingMetrics: true,
        sessionFeedback: true,
        discomfortIncident: false,
      },
    });
    assert(
      uiConfirmed.viewState === "confirmed" &&
      uiConfirmed.isSubmitted === true &&
      uiConfirmed.isPartial === false &&
      uiConfirmed.isError === false &&
      uiConfirmed.title === "¡Datos Enviados!" &&
      uiConfirmed.message.includes("guardados correctamente") &&
      uiConfirmed.warningText === null,
      "Fase 1B.2 (1): Persistencia completa ('confirmed') muestra la confirmación habitual de guardado completo"
    );
  }

  // 11.2 Persistencia parcial (success: true, persistenceStatus: 'partial'): aviso de guardado parcial y NO confirmación total
  {
    const uiPartial = resolveTrainingFeedbackUIState({
      success: true,
      persistenceStatus: "partial",
      savedTargets: {
        trainingMetrics: true,
        sessionFeedback: false,
        discomfortIncident: false,
      },
      warning: "El esfuerzo se guardó, pero la ficha de sesión no pudo insertarse.",
    });
    assert(
      uiPartial.viewState === "partial" &&
      uiPartial.isSubmitted === true &&
      uiPartial.isPartial === true &&
      uiPartial.isError === false &&
      uiPartial.title === "Guardado Parcial" &&
      !uiPartial.message.includes("guardados correctamente en el sistema") &&
      uiPartial.warningText === "El esfuerzo se guardó, pero la ficha de sesión no pudo insertarse." &&
      uiPartial.targetSummary?.trainingMetricsSaved === true &&
      uiPartial.targetSummary?.sessionFeedbackSaved === false,
      "Fase 1B.2 (2): Persistencia parcial ('partial') muestra aviso de guardado parcial con el warning real y nunca afirma guardado total"
    );
  }

  // 11.3 Persistencia parcial con warning ausente o vacío: no falla ni muestra texto vacío
  {
    const uiPartialNoWarning = resolveTrainingFeedbackUIState({
      success: true,
      persistenceStatus: "partial",
      savedTargets: {
        trainingMetrics: true,
        sessionFeedback: false,
        discomfortIncident: false,
      },
    });
    const uiPartialBlankWarning = resolveTrainingFeedbackUIState({
      success: true,
      persistenceStatus: "partial",
      warning: "   ",
    });
    assert(
      uiPartialNoWarning.viewState === "partial" &&
      uiPartialNoWarning.isPartial === true &&
      typeof uiPartialNoWarning.warningText === "string" &&
      uiPartialNoWarning.warningText.trim().length > 0 &&
      typeof uiPartialBlankWarning.warningText === "string" &&
      uiPartialBlankWarning.warningText.trim().length > 0,
      "Fase 1B.2 (3): Persistencia parcial sin warning (undefined o vacío) no falla ni genera texto vacío"
    );
  }

  // 11.4 y 11.5 Selección y envío de RPE = 0 permitido vs RPE = null bloqueado
  {
    const allowedRpeZero = canSubmitTrainingFeedbackForm({
      submitting: false,
      selectedPlayerId: "22222222-2222-2222-2222-222222222222",
      rpe: 0,
    });
    const allowedRpeTen = canSubmitTrainingFeedbackForm({
      submitting: false,
      selectedPlayerId: "22222222-2222-2222-2222-222222222222",
      rpe: 10,
    });
    const blockedRpeNull = canSubmitTrainingFeedbackForm({
      submitting: false,
      selectedPlayerId: "22222222-2222-2222-2222-222222222222",
      rpe: null,
    });
    const blockedWhileSubmitting = canSubmitTrainingFeedbackForm({
      submitting: true,
      selectedPlayerId: "22222222-2222-2222-2222-222222222222",
      rpe: 0,
    });
    const blockedWithoutPlayer = canSubmitTrainingFeedbackForm({
      submitting: false,
      selectedPlayerId: "",
      rpe: 5,
    });
    assert(
      allowedRpeZero === true &&
      allowedRpeTen === true &&
      blockedRpeNull === false &&
      blockedWhileSubmitting === false &&
      blockedWithoutPlayer === false,
      "Fase 1B.2 (4 y 5): RPE = 0 y RPE = 10 están permitidos para envío, mientras que RPE === null, submitting = true o jugador vacío bloquean el envío"
    );
  }

  // 11.6 Error completo de envío (success: false): mantiene el comportamiento de error existente
  {
    const uiFailed = resolveTrainingFeedbackUIState({
      success: false,
      persistenceStatus: "failed",
      error: "No se pudo registrar la métrica de esfuerzo.",
    });
    const uiUncertain = resolveTrainingFeedbackUIState({
      success: false,
      persistenceStatus: "uncertain",
      error: "La operación no se completó íntegramente. Por seguridad, verifica con tu cuerpo técnico antes de reenviar.",
    });
    assert(
      uiFailed.viewState === "form" &&
      uiFailed.isSubmitted === false &&
      uiFailed.isError === true &&
      uiFailed.errorToast === "No se pudo registrar la métrica de esfuerzo." &&
      uiUncertain.viewState === "form" &&
      uiUncertain.isSubmitted === false &&
      uiUncertain.isError === true &&
      uiUncertain.errorToast?.includes("verifica con tu cuerpo técnico") === true,
      "Fase 1B.2 (6): Error completo o incierto de envío conserva el formulario activo y expone el mensaje de error"
    );
  }

  console.log("\n=== TODAS LAS PRUEBAS UNITARIAS AISLADAS FINALIZARON CON ÉXITO ===");
})();
