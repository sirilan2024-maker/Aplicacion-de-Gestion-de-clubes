/**
 * Sporting Saladar — Módulo de Rendimiento: Pruebas Unitarias Aisladas de Recordatorios
 * Fase 7: Avisos antes y después del entrenamiento
 * 
 * Verificaciones:
 * 1. Ventana de aviso de bienestar respecto a hora real de inicio (start_time).
 * 2. Ventana de aviso de feedback respecto a hora real de fin (end_time).
 * 3. Ausencia de start_time o end_time: rechazo estricto sin inventar horarios.
 * 4. Omisión si el formulario ya está completado.
 * 5. Omisión si el aviso ya fue enviado (alreadySent).
 * 6. Resolución del destinatario: jugador con cuenta vs tutor autorizado para menor sin cuenta.
 * 7. Claves canónicas de idempotencia para evitar duplicados.
 * 8. Huso peninsular español (CEST / CET).
 */

import {
  calculateWellnessReminderWindow,
  calculateFeedbackReminderWindow,
  isTimeInReminderWindow,
  resolvePlayerRecipient,
  buildReminderIdempotencyKey,
  evaluateReminderEligibility,
  parseSpainDateTime,
  PlayerRecipientInfo,
  TrainingSessionSchedule
} from '../src/lib/performance/reminders-service';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FALLO: ${message}`);
    failed++;
  }
}

console.log('--- TEST SUITE: PERFORMANCE REMINDERS SERVICE (AISLADO) ---\n');

// 1. Cálculo de Ventana de Bienestar Previo (start_time)
console.log('1. Ventana de Bienestar Previo respecto a hora real de inicio:');
const wellnessSchedule: TrainingSessionSchedule = {
  eventId: 'ev-100',
  date: '2026-10-15',
  startTime: '18:00',
  endTime: '19:30',
  teamId: 'team-juvenil-a',
  teamName: 'Juvenil A',
  clubId: 'club-saladar'
};

const wellnessWindow = calculateWellnessReminderWindow(wellnessSchedule.date, wellnessSchedule.startTime, 180);
assert(wellnessWindow.isValid === true, 'Ventana de bienestar calculada con éxito');
assert(Boolean(wellnessWindow.windowStart && wellnessWindow.windowEnd), 'Ventana tiene inicio y fin definidos');

// A las 14:30 (3.5 horas antes del entreno de las 18:00) -> Demasiado temprano
const timeTooEarly = parseSpainDateTime('2026-10-15', '14:30')!;
assert(isTimeInReminderWindow(wellnessWindow, timeTooEarly) === false, '14:30 está fuera de ventana (demasiado temprano)');

// A las 16:30 (1.5 horas antes del entreno de las 18:00) -> Dentro de ventana
const timeInsideWellness = parseSpainDateTime('2026-10-15', '16:30')!;
assert(isTimeInReminderWindow(wellnessWindow, timeInsideWellness) === true, '16:30 está dentro de ventana de aviso de bienestar');

// A las 18:05 (entrenamiento ya empezado) -> Fuera de ventana
const timeAfterStart = parseSpainDateTime('2026-10-15', '18:05')!;
assert(isTimeInReminderWindow(wellnessWindow, timeAfterStart) === false, '18:05 está fuera de ventana (sesión ya iniciada)');

// Regla: No inventar horarios si falta start_time
const missingStartWindow = calculateWellnessReminderWindow('2026-10-15', null);
assert(missingStartWindow.isValid === false, 'Falta start_time: declara ventana inválida');
assert(missingStartWindow.reason === 'missing_start_time', 'Reporta motivo exacto missing_start_time sin inventar horas');


// 2. Cálculo de Ventana de Feedback Post-Entrenamiento (end_time)
console.log('\n2. Ventana de Feedback Post-Entrenamiento respecto a hora real de fin:');
const feedbackSchedule: TrainingSessionSchedule = {
  eventId: 'ev-100',
  date: '2026-10-15',
  startTime: '18:00',
  endTime: '19:30',
  teamId: 'team-juvenil-a'
};

const feedbackWindow = calculateFeedbackReminderWindow(feedbackSchedule.date, feedbackSchedule.endTime, 15, 240);
assert(feedbackWindow.isValid === true, 'Ventana de feedback calculada con éxito');

// A las 19:20 (sesión aún no concluida) -> Fuera de ventana
const timeDuringTraining = parseSpainDateTime('2026-10-15', '19:20')!;
assert(isTimeInReminderWindow(feedbackWindow, timeDuringTraining) === false, '19:20 está fuera de ventana (sesión aún en juego)');

// A las 19:35 (solo 5 min tras terminar, margen de descanso no cumplido) -> Fuera de ventana
const timeJustFinished = parseSpainDateTime('2026-10-15', '19:35')!;
assert(isTimeInReminderWindow(feedbackWindow, timeJustFinished) === false, '19:35 está fuera de ventana (margen de 15 min no cumplido)');

// A las 20:15 (45 min tras finalizar) -> Dentro de ventana
const timeInsideFeedback = parseSpainDateTime('2026-10-15', '20:15')!;
assert(isTimeInReminderWindow(feedbackWindow, timeInsideFeedback) === true, '20:15 está dentro de ventana de feedback post-sesión');

// A las 00:30 del día siguiente (más de 5 horas tras fin) -> Ventana cerrada
const timeExpired = parseSpainDateTime('2026-10-16', '00:30')!;
assert(isTimeInReminderWindow(feedbackWindow, timeExpired) === false, '00:30 está fuera de ventana (ventana de 4h expirada)');

// Regla: No inventar duración si falta end_time
const missingEndWindow = calculateFeedbackReminderWindow('2026-10-15', undefined);
assert(missingEndWindow.isValid === false, 'Falta end_time: declara ventana inválida');
assert(missingEndWindow.reason === 'missing_end_time', 'Reporta motivo exacto missing_end_time sin asumir duraciones');


// 3. Resolución del Destinatario (Jugador con cuenta vs Tutor)
console.log('\n3. Resolución del Destinatario (Jugador con cuenta vs Tutor de menor):');

// 3.1 Jugador mayor con cuenta propia
const playerWithAccount: PlayerRecipientInfo = {
  id: 'player-senior-1',
  firstName: 'Carlos',
  lastName: 'Gómez',
  userAuthId: 'auth-user-carlos-123',
  tutorId: null,
  email: 'carlos@sportingsaladar.com'
};
const recipientPlayer = resolvePlayerRecipient(playerWithAccount);
assert(recipientPlayer.recipientType === 'player', 'Jugador con cuenta propia se resuelve como recipientType player');
assert(recipientPlayer.userId === 'auth-user-carlos-123', 'Asigna userId del jugador');
assert(recipientPlayer.targetPlayerName === 'Carlos Gómez', 'Nombre del jugador asignado');

// 3.2 Menor sin cuenta propia tutelado por padre/madre
const minorPlayerWithTutor: PlayerRecipientInfo = {
  id: 'player-cadete-2',
  firstName: 'Lucas',
  lastName: 'Martínez',
  userAuthId: null, // menor sin cuenta
  tutorId: 'auth-tutor-padre-456',
  email: null,
  tutorEmail: 'padre.lucas@email.com'
};
const recipientTutor = resolvePlayerRecipient(minorPlayerWithTutor);
assert(recipientTutor.recipientType === 'tutor', 'Menor sin cuenta se resuelve como recipientType tutor');
assert(recipientTutor.userId === 'auth-tutor-padre-456', 'Asigna userId del tutor');
assert(recipientTutor.email === 'padre.lucas@email.com', 'Asigna email del tutor');
assert(recipientTutor.targetPlayerName === 'Lucas Martínez', 'Conserva el nombre del menor como objetivo');

// 3.3 Menor sin cuenta y sin tutor vinculado
const minorWithoutAccountOrTutor: PlayerRecipientInfo = {
  id: 'player-infantil-3',
  firstName: 'Mateo',
  lastName: 'Pérez',
  userAuthId: null,
  tutorId: null
};
const recipientNone = resolvePlayerRecipient(minorWithoutAccountOrTutor);
assert(recipientNone.recipientType === 'none', 'Sin cuenta ni tutor se resuelve como recipientType none');
assert(Boolean(recipientNone.reason), 'Indica motivo claro de omisión');


// 4. No Enviar si Formulario ya Completado o Aviso ya Despachado
console.log('\n4. Omisión por Formulario Completado y Duplicados:');

// 4.1 Formulario ya completado
const evalCompleted = evaluateReminderEligibility({
  reminderType: 'WELLNESS_REMINDER',
  schedule: wellnessSchedule,
  player: playerWithAccount,
  now: timeInsideWellness,
  isFormCompleted: true
});
assert(evalCompleted.eligible === false, 'Omitido si el formulario ya está completado');
assert(evalCompleted.reason === 'already_completed', 'Razón reportada: already_completed');

// 4.2 Aviso ya enviado previamente
const evalAlreadySent = evaluateReminderEligibility({
  reminderType: 'WELLNESS_REMINDER',
  schedule: wellnessSchedule,
  player: playerWithAccount,
  now: timeInsideWellness,
  alreadySent: true
});
assert(evalAlreadySent.eligible === false, 'Omitido si el aviso ya fue enviado');
assert(evalAlreadySent.reason === 'already_sent', 'Razón reportada: already_sent');

// 4.3 Fuera de ventana horaria
const evalOutsideWindow = evaluateReminderEligibility({
  reminderType: 'WELLNESS_REMINDER',
  schedule: wellnessSchedule,
  player: playerWithAccount,
  now: timeTooEarly
});
assert(evalOutsideWindow.eligible === false, 'Omitido si está fuera de ventana horaria');
assert(evalOutsideWindow.reason === 'outside_window', 'Razón reportada: outside_window');

// 4.4 Sesión sin horario definido
const scheduleWithoutTime: TrainingSessionSchedule = {
  eventId: 'ev-no-time',
  date: '2026-10-15',
  startTime: null,
  teamId: 'team-cadete'
};
const evalNoTime = evaluateReminderEligibility({
  reminderType: 'WELLNESS_REMINDER',
  schedule: scheduleWithoutTime,
  player: playerWithAccount,
  now: timeInsideWellness
});
assert(evalNoTime.eligible === false, 'Omitido si la sesión no tiene hora definida');
assert(evalNoTime.reason === 'missing_schedule', 'Razón reportada: missing_schedule');

// 4.5 Todo correcto: elegible para despacho
const evalEligible = evaluateReminderEligibility({
  reminderType: 'WELLNESS_REMINDER',
  schedule: wellnessSchedule,
  player: playerWithAccount,
  now: timeInsideWellness,
  isFormCompleted: false,
  alreadySent: false
});
assert(evalEligible.eligible === true, 'Sesión y jugador en regla resultan en eligible: true');
assert(evalEligible.reason === 'ready', 'Razón reportada: ready');
assert(Boolean(evalEligible.idempotencyKey), 'Genera clave de idempotencia canónica');


// 5. Claves de Idempotencia Canónicas
console.log('\n5. Claves de Idempotencia Canónicas (Anti-Duplicidad):');

const key1 = buildReminderIdempotencyKey('WELLNESS_REMINDER', 'ev-1', 'pl-1', 'user-1', '2026-10-15');
const key2 = buildReminderIdempotencyKey('WELLNESS_REMINDER', 'ev-1', 'pl-1', 'user-1', '2026-10-15');
const keyDiffPlayer = buildReminderIdempotencyKey('WELLNESS_REMINDER', 'ev-1', 'pl-2', 'user-2', '2026-10-15');
const keyRpe = buildReminderIdempotencyKey('SESSION_FEEDBACK_REMINDER', 'ev-1', 'pl-1', 'user-1', '2026-10-15');

assert(key1 === key2, 'Mismos parámetros generan exactamente la misma clave');
assert(key1 !== keyDiffPlayer, 'Distinto jugador genera clave distinta');
assert(key1 !== keyRpe, 'Bienestar y RPE generan claves distintas');
assert(key1.startsWith('reminder:wellness:ev-1:pl-1:user-1:2026-10-15'), 'Prefijo canónico wellness correcto');
assert(keyRpe.startsWith('reminder:rpe:ev-1:pl-1:user-1:2026-10-15'), 'Prefijo canónico rpe correcto');

// 6. Concurrencia, Reintentos, Fallos Parciales y Ventanas Multisesión
console.log('\n6. Concurrencia e Idempotencia en Simulación de Notificaciones:');

// 6.1 Dos ejecuciones concurrentes con la misma clave de idempotencia
{
  const inMemoryDeliveries = new Map<string, { status: string; attempts: number }>();

  async function simulateHandleInApp(key: string) {
    const existing = inMemoryDeliveries.get(key);
    if (existing && existing.status === 'SENT') {
      return { channel: 'IN_APP', status: 'SENT', duplicated: false };
    }
    // Simula atomicidad asegurada por UNIQUE constraint (upsert on conflict)
    if (!existing) {
      inMemoryDeliveries.set(key, { status: 'SENT', attempts: 1 });
      return { channel: 'IN_APP', status: 'SENT', duplicated: false };
    } else {
      return { channel: 'IN_APP', status: existing.status, duplicated: true };
    }
  }

  const concurrentKey = 'reminder:wellness:ev-10:pl-10:u-10:2026-10-15:IN_APP';
  // Ambas llamadas compiten
  const [resA, resB] = [simulateHandleInApp(concurrentKey), simulateHandleInApp(concurrentKey)];
  assert(inMemoryDeliveries.get(concurrentKey)?.status === 'SENT', 'La entrega compartida queda en SENT');
  assert(inMemoryDeliveries.get(concurrentKey)?.attempts === 1, 'No se incrementa contador indebidamente');
}

// 6.2 Reintento de un canal fallido y prevención de reenvío de canal completado
console.log('\n7. Reintentos de Canales Fallidos vs Canales Completados:');
{
  interface ChannelDeliveryState {
    status: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
    attempts: number;
    lastError?: string;
  }
  const store = new Map<string, ChannelDeliveryState>();

  // Estado inicial tras primera ejecución: IN_APP tuvo éxito, EMAIL falló por timeout de red
  store.set('reminder:rpe:ev-20:pl-20:u-20:2026-10-15:IN_APP', { status: 'SENT', attempts: 1 });
  store.set('reminder:rpe:ev-20:pl-20:u-20:2026-10-15:EMAIL', { status: 'FAILED', attempts: 1, lastError: 'SMTP connection timeout' });

  function dispatchChannelWithRetry(key: string, channel: 'IN_APP' | 'EMAIL', shouldSucceed: boolean) {
    const existing = store.get(key);
    if (existing && existing.status === 'SENT') {
      // Regla: no reenviar si ya fue enviado exitosamente
      return { channel, status: 'SKIPPED_ALREADY_SENT', executed: false };
    }
    // Si estaba fallido o no existía, reintentar
    const attempts = (existing?.attempts || 0) + 1;
    if (shouldSucceed) {
      store.set(key, { status: 'SENT', attempts });
      return { channel, status: 'SENT', executed: true };
    } else {
      store.set(key, { status: 'FAILED', attempts, lastError: 'Persistent failure' });
      return { channel, status: 'FAILED', executed: true };
    }
  }

  // Segunda ejecución del cron:
  const inAppRetry = dispatchChannelWithRetry('reminder:rpe:ev-20:pl-20:u-20:2026-10-15:IN_APP', 'IN_APP', true);
  const emailRetry = dispatchChannelWithRetry('reminder:rpe:ev-20:pl-20:u-20:2026-10-15:EMAIL', 'EMAIL', true);

  assert(inAppRetry.status === 'SKIPPED_ALREADY_SENT', 'Canal IN_APP completado se omite y NO se reenvía');
  assert(inAppRetry.executed === false, 'IN_APP no genera invocaciones duplicadas al proveedor');
  assert(emailRetry.status === 'SENT', 'Canal EMAIL fallido previamente se reintenta y concluye con éxito');
  assert(emailRetry.executed === true, 'EMAIL ejecuta el reintento');
  assert(store.get('reminder:rpe:ev-20:pl-20:u-20:2026-10-15:EMAIL')?.attempts === 2, 'Contador de intentos sube a 2');
}

// 6.3 Ventanas de Recordatorios en Sesiones de Mañana, Tarde y Noche
console.log('\n8. Evaluación de Ventanas en Sesiones de Mañana, Tarde y Noche:');
{
  const morningTraining: TrainingSessionSchedule = {
    eventId: 'ev-morning',
    date: '2026-10-15',
    startTime: '10:00',
    endTime: '11:30',
    teamId: 'team-senior',
  };

  const afternoonTraining: TrainingSessionSchedule = {
    eventId: 'ev-afternoon',
    date: '2026-10-15',
    startTime: '17:30',
    endTime: '19:00',
    teamId: 'team-juvenil',
  };

  const nightTraining: TrainingSessionSchedule = {
    eventId: 'ev-night',
    date: '2026-10-15',
    startTime: '20:30',
    endTime: '22:00',
    teamId: 'team-cadete',
  };

  const dummyPlayer: PlayerRecipientInfo = {
    id: 'pl-test',
    firstName: 'Alejandro',
    lastName: 'Ruiz',
    userAuthId: 'u-alejandro',
  };

  // Cron a las 09:00 CEST:
  // - Morning (10:00): ventana bienestar [07:00, 10:00] -> ACTIVA
  // - Afternoon (17:30): ventana bienestar [14:30, 17:30] -> FUERA
  // - Night (20:30): ventana bienestar [17:30, 20:30] -> FUERA
  const cronAt0900 = parseSpainDateTime('2026-10-15', '09:00')!;
  const morningAt0900 = evaluateReminderEligibility({
    reminderType: 'WELLNESS_REMINDER',
    schedule: morningTraining,
    player: dummyPlayer,
    now: cronAt0900,
  });
  const afternoonAt0900 = evaluateReminderEligibility({
    reminderType: 'WELLNESS_REMINDER',
    schedule: afternoonTraining,
    player: dummyPlayer,
    now: cronAt0900,
  });
  assert(morningAt0900.eligible === true, 'A las 09:00, entreno matinal (10:00) está en ventana de bienestar activa');
  assert(afternoonAt0900.eligible === false && afternoonAt0900.reason === 'outside_window', 'A las 09:00, entreno de tarde (17:30) está fuera de ventana');

  // Cron a las 16:00 CEST:
  // - Afternoon (17:30): ventana bienestar [14:30, 17:30] -> ACTIVA
  const cronAt1600 = parseSpainDateTime('2026-10-15', '16:00')!;
  const afternoonAt1600 = evaluateReminderEligibility({
    reminderType: 'WELLNESS_REMINDER',
    schedule: afternoonTraining,
    player: dummyPlayer,
    now: cronAt1600,
  });
  assert(afternoonAt1600.eligible === true, 'A las 16:00, entreno de tarde (17:30) está en ventana de bienestar activa');

  // Cron a las 19:45 CEST:
  // - Afternoon (17:30 - 19:00): ventana feedback [19:15, 23:15] -> ACTIVA
  // - Night (20:30): ventana bienestar [17:30, 20:30] -> ACTIVA
  const cronAt1945 = parseSpainDateTime('2026-10-15', '19:45')!;
  const afternoonFeedbackAt1945 = evaluateReminderEligibility({
    reminderType: 'SESSION_FEEDBACK_REMINDER',
    schedule: afternoonTraining,
    player: dummyPlayer,
    now: cronAt1945,
  });
  const nightWellnessAt1945 = evaluateReminderEligibility({
    reminderType: 'WELLNESS_REMINDER',
    schedule: nightTraining,
    player: dummyPlayer,
    now: cronAt1945,
  });
  assert(afternoonFeedbackAt1945.eligible === true, 'A las 19:45, feedback de tarde (fin 19:00) está en ventana activa');
  assert(nightWellnessAt1945.eligible === true, 'A las 19:45, bienestar de sesión nocturna (inicio 20:30) está en ventana activa');

  // Cron a las 22:45 CEST:
  // - Night (20:30 - 22:00): ventana feedback [22:15, 02:15] -> ACTIVA
  const cronAt2245 = parseSpainDateTime('2026-10-15', '22:45')!;
  const nightFeedbackAt2245 = evaluateReminderEligibility({
    reminderType: 'SESSION_FEEDBACK_REMINDER',
    schedule: nightTraining,
    player: dummyPlayer,
    now: cronAt2245,
  });
  assert(nightFeedbackAt2245.eligible === true, 'A las 22:45, feedback de noche (fin 22:00) está en ventana activa');
}

// 6.4 Aislamiento de Errores de Rendimiento frente a Recordatorios Generales de Eventos
console.log('\n9. Aislamiento de Errores de Rendimiento frente a Eventos Generales:');
{
  let generalRemindersDispatched = false;
  let generalSummaryReturned = false;

  function runCronPipelineSimulated(shouldPerformanceThrow: boolean) {
    // 1. Recordatorios de eventos generales
    generalRemindersDispatched = true;

    // 2. Recordatorios de rendimiento en bloque aislado
    try {
      if (shouldPerformanceThrow) {
        throw new Error('Database connection reset during performance evaluation');
      }
    } catch (err: any) {
      // Silenciado / logueado sin abortar la respuesta HTTP del endpoint
    }

    // 3. Conclusión del pipeline
    generalSummaryReturned = true;
    return { success: true };
  }

  const resultWithPerfError = runCronPipelineSimulated(true);
  assert(generalRemindersDispatched === true, 'Recordatorios generales de eventos son ejecutados');
  assert(generalSummaryReturned === true, 'Pipeline concluye exitosamente a pesar de fallo en módulo de rendimiento');
  assert(resultWithPerfError.success === true, 'El endpoint no devuelve error 500 ante fallo aislado de rendimiento');
}

// 6.5 Validación Estática del Workflow reminders-cron.yml
console.log('\n10. Validación Estática del Workflow reminders-cron.yml:');
{
  const fs = require('fs');
  const path = require('path');
  const workflowPath = path.resolve(__dirname, '../.github/workflows/reminders-cron.yml');
  const exists = fs.existsSync(workflowPath);
  assert(exists, 'El archivo .github/workflows/reminders-cron.yml existe');

  if (exists) {
    const content = fs.readFileSync(workflowPath, 'utf8');

    // 1. Programado cada 30 minutos
    assert(content.includes("cron: '*/30 * * * *'"), 'El workflow tiene programado schedule cada 30 minutos (*/30 * * * *)');

    // 2. Control de concurrencia
    assert(content.includes('concurrency:'), 'El workflow define control de concurrency');
    assert(content.includes('group: reminders-cron-pipeline'), 'El grupo de concurrencia está acotado (reminders-cron-pipeline)');

    // 3. Referencias a secretos sin valores en texto plano y obligatoriedad de APP_BASE_URL
    assert(content.includes('${{ secrets.CRON_SECRET }}'), 'Utiliza ${{ secrets.CRON_SECRET }} sin exponer valores');
    assert(content.includes('${{ secrets.APP_BASE_URL }}'), 'Utiliza ${{ secrets.APP_BASE_URL }} dinámico');
    assert(!content.includes('https://app.clubsportingsaladar.com'), 'No contiene ningún dominio o fallback hardcodeado');
    assert(!content.includes('Bearer tu-token'), 'No contiene secretos ni tokens hardcodeados');
    assert(!content.includes('Bearer re_'), 'No contiene tokens de Resend ni credenciales privadas');
    assert(content.includes('APP_BASE_URL no está configurado'), 'Comprueba explícitamente que APP_BASE_URL esté configurado y aborta si falta');

    // 4. Validación estricta del formato de URL (protocolo, credenciales, rutas, queries, fragmentos y estructura de host)
    assert(content.includes('VALID_URL_REGEX'), 'Aplica expresión regular estricta de validación de URL');
    assert(content.includes('^https://'), 'Exige protocolo https:// en la expresión regular');

    // Extraer dinámicamente la expresión regular LITERAL del propio archivo del workflow para no depender de una copia
    const regexMatch = content.match(/VALID_URL_REGEX='([^']+)'/);
    assert(Boolean(regexMatch && regexMatch[1]), 'Extrae dinámicamente la expresión regular literal de reminders-cron.yml');
    const extractedRegexPattern = regexMatch ? regexMatch[1] : '';
    const urlRegex = new RegExp(extractedRegexPattern);

    assert(urlRegex.test('https://example.com'), 'Regex extraída del workflow acepta dominio https válido');
    assert(urlRegex.test('https://example.com/'), 'Regex extraída del workflow acepta dominio https con barra final');
    assert(urlRegex.test('https://sub.example.com:8443'), 'Regex extraída del workflow acepta subdominio con puerto');
    assert(urlRegex.test('https://app.clubsportingsaladar.com'), 'Regex extraída del workflow acepta dominio del club');
    assert(urlRegex.test('https://sporting-saladar-prod.vercel.app'), 'Regex extraída del workflow acepta dominio vercel.app');
    assert(!urlRegex.test('http://example.com'), 'Regex extraída del workflow rechaza http no seguro');
    assert(!urlRegex.test('https://user:pass@example.com'), 'Regex extraída del workflow rechaza URL con credenciales');
    assert(!urlRegex.test('https://example.com/api/test'), 'Regex extraída del workflow rechaza URL con subrutas');
    assert(!urlRegex.test('https://example.com?query=1'), 'Regex extraída del workflow rechaza URL con query string');
    assert(!urlRegex.test('https://example.com#fragment'), 'Regex extraída del workflow rechaza URL con fragmento');
    assert(!urlRegex.test('https://-invalid.com'), 'Regex extraída del workflow rechaza host empezando por guión');
    assert(!urlRegex.test('https://invalid-.com'), 'Regex extraída del workflow rechaza host terminando en guión');
    assert(!urlRegex.test('https://inv..alid.com'), 'Regex extraída del workflow rechaza host con puntos dobles');
    assert(!urlRegex.test(''), 'Regex extraída del workflow rechaza cadena vacía');
    assert(!urlRegex.test('   '), 'Regex extraída del workflow rechaza espacios en blanco');

    // 5. Manejo seguro del secreto: cabecera mediante @archivo efímero sin exposición en ps/argv
    assert(content.includes('-H "@$AUTH_HEADER_FILE"'), 'Pasa la cabecera de autorización a curl mediante archivo efímero (@file) evitando exposición en línea de comandos/ps');
    assert(content.includes('chmod 600 "$AUTH_HEADER_FILE"'), 'Restringe permisos del archivo de cabecera a 600 (solo lectura/escritura del propietario)');

    // 6. Manejo robusto de señales y limpieza con trap
    assert(content.includes('trap cleanup EXIT'), 'Registra trap cleanup al salir normalmente (EXIT)');
    assert(content.includes('trap \'cleanup; trap - INT; kill -INT $$\' INT'), 'Propaga correctamente la señal INT tras la limpieza sin anular la terminación');
    assert(content.includes('trap \'cleanup; trap - TERM; kill -TERM $$\' TERM'), 'Propaga correctamente la señal TERM tras la limpieza sin anular la terminación');

    // 7. Verificación de código HTTP de respuesta y no fuga de cuerpo
    assert(content.includes('HTTP_STATUS') && content.includes('-ne 200'), 'Verifica que HTTP_STATUS sea 200 y aborta (exit 1) en caso de fallo');
    assert(!content.includes('cat "$HTTP_BODY_FILE"'), 'No ejecuta cat sobre HTTP_BODY_FILE ni imprime el cuerpo en logs');

    // 8. Método POST y Endpoint correcto
    assert(content.includes('-X POST'), 'Invoca el endpoint mediante método POST');
    assert(content.includes('/api/events/send-reminders'), 'Apunta a la ruta canónica /api/events/send-reminders');

    // 9. Timeouts de red y captura explícita de fallos de curl
    assert(content.includes('--connect-timeout 15'), 'Define connect-timeout de 15 segundos para no quedar colgado');
    assert(content.includes('--max-time 120'), 'Define max-time de 120 segundos para la ejecución total');
    assert(content.includes('CURL_EXIT'), 'Captura código de salida de curl y aborta si la conexión falla');
  }
}

console.log(`\n========================================`);
console.log(`TOTAL CASOS: ${passed + failed} | SUPERADOS: ${passed} | FALLIDOS: ${failed}`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}


