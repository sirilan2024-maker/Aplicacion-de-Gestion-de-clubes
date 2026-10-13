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
  computeMinutesFromLiveEvents
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

  console.log("\n=== TODAS LAS PRUEBAS UNITARIAS AISLADAS FINALIZARON CON ÉXITO ===");
})();
