/**
 * Sporting Saladar — Módulo de Rendimiento: Servicio Puro de Avisos y Recordatorios
 * 
 * Reglas arquitectónicas obligatorias:
 * 1. Aviso de bienestar previo: programado exclusivamente respecto a la hora real de inicio (start_time).
 * 2. Aviso de feedback post-sesión: programado exclusivamente respecto a la hora real de finalización (end_time).
 * 3. No inventar horarios: si falta start_time o end_time, se declara horario no programable.
 * 4. Resolución de destinatario: jugador con cuenta propia (user_auth_id) o tutor autorizado (tutor_id) cuando es menor sin cuenta.
 * 5. Omitir envío si el formulario ya está completado. Si la tabla no está disponible, no fingir conocimiento.
 * 6. Generación determinista de claves de idempotencia para evitar duplicados.
 */

export interface PlayerRecipientInfo {
  id: string; // player_id
  firstName: string;
  lastName?: string | null;
  userAuthId?: string | null;
  tutorId?: string | null;
  email?: string | null;
  tutorEmail?: string | null;
  parent1Email?: string | null;
}

export interface ResolvedRecipient {
  recipientType: 'player' | 'tutor' | 'none';
  userId?: string;
  email?: string;
  displayName: string;
  targetPlayerName: string;
  reason?: string;
}

export interface TrainingSessionSchedule {
  eventId: string;
  date: string; // YYYY-MM-DD
  startTime?: string | null; // HH:MM or HH:MM:SS
  endTime?: string | null;   // HH:MM or HH:MM:SS
  title?: string;
  teamId: string;
  teamName?: string;
  clubId?: string;
}

export interface ReminderWindowResult {
  isValid: boolean;
  windowStart?: Date;
  windowEnd?: Date;
  targetEventTime?: Date;
  reason?: string;
}

export interface ReminderEvaluationResult {
  eligible: boolean;
  reason: 'ready' | 'missing_schedule' | 'outside_window' | 'already_completed' | 'no_recipient' | 'already_sent';
  recipient?: ResolvedRecipient;
  idempotencyKey?: string;
  window?: ReminderWindowResult;
  message?: string;
}

/**
 * Parsea una fecha YYYY-MM-DD y una hora HH:MM[:SS] en el huso peninsular (Europe/Madrid)
 * sin depender de conversiones erráticas ni UTC neutro.
 */
export function parseSpainDateTime(dateStr: string, timeStr?: string | null): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return null;
  }
  if (!timeStr || !/^\d{1,2}:\d{2}(:\d{2})?$/.test(timeStr.trim())) {
    return null;
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const parts = timeStr.trim().split(':').map(Number);
  const hours = parts[0];
  const minutes = parts[1];
  const seconds = parts[2] || 0;

  // Determinar desfase peninsular español:
  // Horario de verano (CEST): UTC+2 (desde último domingo de marzo al último domingo de octubre)
  // Horario de invierno (CET): UTC+1 (resto del año)
  // Usamos el constructor nativo para resolver el desfase exacto en Europe/Madrid:
  const isoCandidate = `${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  // Crear fecha base y ajustar con Intl para garantizar coincidencia con Europe/Madrid
  const tempDate = new Date(`${isoCandidate}+01:00`); // Provisión CET
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    timeZoneName: 'shortOffset'
  });
  
  const formatted = formatter.format(tempDate);
  // Si en esa fecha el desfase es GMT+2 (verano), ajustar
  const isSummer = formatted.includes('+2') || formatted.includes('GMT+2');
  const offsetStr = isSummer ? '+02:00' : '+01:00';

  return new Date(`${isoCandidate}${offsetStr}`);
}

/**
 * Calcula la ventana de aviso para el Cuestionario de Bienestar Previo.
 * Regla: Se programa respecto a la hora real de inicio (start_time).
 * Por defecto abre 180 min (3h) antes del entrenamiento y cierra al comenzar la sesión.
 * Si falta start_time, NO inventa horario y devuelve isValid: false.
 */
export function calculateWellnessReminderWindow(
  dateStr: string,
  startTimeStr?: string | null,
  minutesBeforeStart: number = 180
): ReminderWindowResult {
  if (!startTimeStr || startTimeStr.trim() === '') {
    return {
      isValid: false,
      reason: 'missing_start_time'
    };
  }

  const sessionStart = parseSpainDateTime(dateStr, startTimeStr);
  if (!sessionStart || isNaN(sessionStart.getTime())) {
    return {
      isValid: false,
      reason: 'invalid_start_time_format'
    };
  }

  const windowStart = new Date(sessionStart.getTime() - minutesBeforeStart * 60 * 1000);
  const windowEnd = new Date(sessionStart.getTime()); // Cierra justo al inicio de la sesión

  return {
    isValid: true,
    targetEventTime: sessionStart,
    windowStart,
    windowEnd
  };
}

/**
 * Calcula la ventana de aviso para el Feedback Post-Entrenamiento (RPE y Minutos).
 * Regla: Se programa respecto a la hora real de finalización (end_time).
 * Por defecto abre 15 min tras terminar la sesión y permanece activa durante 240 min (4h).
 * Si falta end_time, NO inventa duración y devuelve isValid: false.
 */
export function calculateFeedbackReminderWindow(
  dateStr: string,
  endTimeStr?: string | null,
  delayAfterMinutes: number = 15,
  windowDurationMinutes: number = 240
): ReminderWindowResult {
  if (!endTimeStr || endTimeStr.trim() === '') {
    return {
      isValid: false,
      reason: 'missing_end_time'
    };
  }

  const sessionEnd = parseSpainDateTime(dateStr, endTimeStr);
  if (!sessionEnd || isNaN(sessionEnd.getTime())) {
    return {
      isValid: false,
      reason: 'invalid_end_time_format'
    };
  }

  const windowStart = new Date(sessionEnd.getTime() + delayAfterMinutes * 60 * 1000);
  const windowEnd = new Date(windowStart.getTime() + windowDurationMinutes * 60 * 1000);

  return {
    isValid: true,
    targetEventTime: sessionEnd,
    windowStart,
    windowEnd
  };
}

/**
 * Comprueba si una fecha y hora dada se encuentra dentro de la ventana de aviso calculada.
 */
export function isTimeInReminderWindow(window: ReminderWindowResult, now: Date = new Date()): boolean {
  if (!window.isValid || !window.windowStart || !window.windowEnd) {
    return false;
  }
  const t = now.getTime();
  return t >= window.windowStart.getTime() && t <= window.windowEnd.getTime();
}

/**
 * Resuelve el destinatario autorizado de la notificación:
 * 1. Jugador con cuenta propia (userAuthId): recibe el aviso directamente.
 * 2. Menor sin cuenta (userAuthId null) pero con tutor (tutorId): el aviso se dirige al tutor autorizado.
 * 3. Si no hay cuenta autenticada disponible para el menor ni para el tutor: se marca como no direccionable in-app.
 */
export function resolvePlayerRecipient(player: PlayerRecipientInfo): ResolvedRecipient {
  const targetPlayerName = `${player.firstName || ''} ${player.lastName || ''}`.trim() || 'Jugador';

  // Caso 1: Jugador con cuenta de usuario vinculada
  if (player.userAuthId && player.userAuthId.trim() !== '') {
    return {
      recipientType: 'player',
      userId: player.userAuthId,
      email: player.email || undefined,
      displayName: targetPlayerName,
      targetPlayerName
    };
  }

  // Caso 2: Menor tutelado -> enviar al tutor legal
  if (player.tutorId && player.tutorId.trim() !== '') {
    const tutorEmail = player.tutorEmail || player.parent1Email;
    return {
      recipientType: 'tutor',
      userId: player.tutorId,
      email: tutorEmail || undefined,
      displayName: 'Tutor / Familiar',
      targetPlayerName
    };
  }

  // Caso 3: Sin cuenta de usuario vinculada
  return {
    recipientType: 'none',
    displayName: targetPlayerName,
    targetPlayerName,
    reason: 'Jugador menor sin cuenta propia y sin tutor con usuario registrado en el sistema'
  };
}

/**
 * Genera la clave de idempotencia canónica para evitar duplicados en el envío.
 */
export function buildReminderIdempotencyKey(
  type: 'WELLNESS_REMINDER' | 'SESSION_FEEDBACK_REMINDER',
  eventId: string,
  playerId: string,
  targetUserId: string,
  dateStr: string
): string {
  const prefix = type === 'WELLNESS_REMINDER' ? 'wellness' : 'rpe';
  // En bienestar se vincula a la fecha basal; en RPE se vincula a la sesión concreta
  return `reminder:${prefix}:${eventId}:${playerId}:${targetUserId}:${dateStr}`;
}

/**
 * Evalúa si procede enviar el recordatorio de Rendimiento para un jugador y sesión específicos.
 */
export function evaluateReminderEligibility(params: {
  reminderType: 'WELLNESS_REMINDER' | 'SESSION_FEEDBACK_REMINDER';
  schedule: TrainingSessionSchedule;
  player: PlayerRecipientInfo;
  now?: Date;
  isFormCompleted?: boolean;
  alreadySent?: boolean;
}): ReminderEvaluationResult {
  const { reminderType, schedule, player, now = new Date(), isFormCompleted, alreadySent } = params;

  // 1. Si ya fue enviado previamente, omitir
  if (alreadySent) {
    return {
      eligible: false,
      reason: 'already_sent',
      message: 'El recordatorio ya fue despachado previamente para esta sesión.'
    };
  }

  // 2. Si el formulario ya fue completado, omitir (no molestar al jugador)
  if (isFormCompleted) {
    return {
      eligible: false,
      reason: 'already_completed',
      message: 'El jugador ya ha completado la autoevaluación correspondiente.'
    };
  }

  // 3. Resolver destinatario
  const recipient = resolvePlayerRecipient(player);
  if (recipient.recipientType === 'none' || !recipient.userId) {
    return {
      eligible: false,
      reason: 'no_recipient',
      recipient,
      message: recipient.reason || 'Sin destinatario válido para notificación'
    };
  }

  // 4. Calcular ventana horaria
  let window: ReminderWindowResult;
  if (reminderType === 'WELLNESS_REMINDER') {
    window = calculateWellnessReminderWindow(schedule.date, schedule.startTime);
  } else {
    window = calculateFeedbackReminderWindow(schedule.date, schedule.endTime);
  }

  if (!window.isValid) {
    return {
      eligible: false,
      reason: 'missing_schedule',
      recipient,
      window,
      message: window.reason === 'missing_start_time'
        ? 'La sesión no tiene hora de inicio especificada. Horario no programable.'
        : 'La sesión no tiene hora de finalización especificada. Horario no programable.'
    };
  }

  // 5. Verificar si estamos dentro de la ventana de envío
  const inWindow = isTimeInReminderWindow(window, now);
  if (!inWindow) {
    return {
      eligible: false,
      reason: 'outside_window',
      recipient,
      window,
      message: 'Fuera de la ventana horaria autorizada para este aviso.'
    };
  }

  // 6. Todo en regla: generar clave de idempotencia
  const idempotencyKey = buildReminderIdempotencyKey(
    reminderType,
    schedule.eventId,
    player.id,
    recipient.userId,
    schedule.date
  );

  return {
    eligible: true,
    reason: 'ready',
    recipient,
    idempotencyKey,
    window,
    message: 'Listo para despacho seguro.'
  };
}
