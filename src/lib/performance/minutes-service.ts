import { differenceInMinutes, parse } from 'date-fns';

export interface PlannedDurationResult {
  durationMinutes: number;
  isFallback: boolean;
}

export interface ReconciledMinutesResult {
  minutes: number | null;
  source: 'acta' | 'live' | 'manual' | 'player_provisional' | 'none';
  status: 'confirmed' | 'provisional' | 'pending';
  hasDiscrepancy?: boolean;
  notes?: string;
}

/**
 * 1. Calcula la duración prevista de una sesión de entrenamiento
 * a partir de start_time y end_time ('HH:mm' o 'HH:mm:ss').
 * Si falta end_time o el horario es inválido, devuelve 90 minutos con isFallback = true.
 */
export function calculatePlannedTrainingDuration(
  startTime?: string | null,
  endTime?: string | null
): PlannedDurationResult {
  if (!startTime || !endTime) {
    return { durationMinutes: 90, isFallback: true };
  }

  try {
    const cleanStart = startTime.slice(0, 5);
    const cleanEnd = endTime.slice(0, 5);
    
    const baseDate = new Date(2000, 0, 1);
    const startDate = parse(cleanStart, 'HH:mm', baseDate);
    const endDate = parse(cleanEnd, 'HH:mm', baseDate);

    const diff = differenceInMinutes(endDate, startDate);

    if (diff > 0 && diff <= 360) {
      return { durationMinutes: diff, isFallback: false };
    }
  } catch (err) {
    // Silently fallback on parse error
  }

  return { durationMinutes: 90, isFallback: true };
}

/**
 */
export type TrainingLoadStatus = 'confirmed' | 'pending_rpe' | 'pending_minutes';

export interface CalculatedTrainingLoadResult {
  load: number | null; // en UA (Unidades Arbitrarias)
  status: TrainingLoadStatus;
  notes?: string;
}

/**
 * 2. Valida los valores numéricos de RPE y minutos para entrenamiento.
 * Permite participaciones parciales legítimas (ej. 15, 30 minutos).
 * Admite RPE de 0 (reposo/sin esfuerzo) a 10 (esfuerzo máximo).
 */
export function validateTrainingFeedbackInputs(
  rpe: unknown,
  minutes: unknown
): { isValid: boolean; error?: string; cleanRpe?: number; cleanMinutes?: number | null } {
  if (typeof rpe !== 'number' || isNaN(rpe) || rpe < 0 || rpe > 10) {
    return { isValid: false, error: 'El RPE debe ser un valor numérico entre 0 y 10.' };
  }

  let cleanMinutes: number | null = null;

  if (minutes !== undefined && minutes !== null && minutes !== '') {
    const numMinutes = typeof minutes === 'number' ? minutes : parseFloat(String(minutes));
    if (isNaN(numMinutes) || numMinutes < 0 || numMinutes > 300) {
      return { isValid: false, error: 'Los minutos deben ser un valor positivo razonable (máximo 300).' };
    }
    cleanMinutes = Math.round(numMinutes);
  }

  return {
    isValid: true,
    cleanRpe: Math.round(rpe * 10) / 10,
    cleanMinutes
  };
}

/**
 * 3. Calcula la carga de entrenamiento en Unidades Arbitrarias (UA):
 * Reglas estrictas:
 * - Si RPE es nulo o ausente: 'pending_rpe' (carga null, nunca 0 inventado).
 * - Si minutos son nulos o pendientes: 'pending_minutes' (carga null, nunca 0 inventado).
 * - Si minutos reales = 0 (participó 0 minutos) con RPE registrado (incluso RPE 0): Carga = 0 UA, status: 'confirmed'.
 * - Ambos válidos: minutos * RPE en UA, status: 'confirmed'.
 */
export function calculateTrainingLoad(
  rpe: number | null | undefined,
  minutes: number | null | undefined
): CalculatedTrainingLoadResult {
  if (rpe === null || rpe === undefined || isNaN(rpe)) {
    return { load: null, status: 'pending_rpe', notes: 'Pendiente de RPE' };
  }

  if (minutes === null || minutes === undefined || isNaN(minutes)) {
    return { load: null, status: 'pending_minutes', notes: 'Pendiente de confirmación de minutos' };
  }

  // Si minutos reales son 0, la carga real disputada es exactamente 0 UA
  if (minutes === 0) {
    return { load: 0, status: 'confirmed', notes: '0 minutos reales (0 UA)' };
  }

  return { load: rpe * minutes, status: 'confirmed' };
}

/**
 * 4. Reconciliación de minutos de partidos entre fuentes según jerarquía:
 * Prioridad 1: Acta oficial
 * Prioridad 2: Directo (si es fiable)
 * Prioridad 3: Registro manual del entrenador
 * Prioridad 4: Estimación provisional
 */
export function reconcileMatchMinutes(params: {
  actaMinutes?: number | null;
  liveMinutes?: number | null;
  manualMinutes?: number | null;
  provisionalMinutes?: number | null;
  isLiveReliable?: boolean;
}): ReconciledMinutesResult {
  const { actaMinutes, liveMinutes, manualMinutes, provisionalMinutes, isLiveReliable = true } = params;

  // 1. Prioridad Máxima: Acta Oficial
  if (typeof actaMinutes === 'number' && actaMinutes >= 0) {
    const hasDiscrepancy = typeof manualMinutes === 'number' && manualMinutes !== actaMinutes;
    return {
      minutes: actaMinutes,
      source: 'acta',
      status: 'confirmed',
      hasDiscrepancy,
      notes: hasDiscrepancy ? `Discrepancia detectada: acta indica ${actaMinutes} min y entrenador registró ${manualMinutes} min.` : undefined
    };
  }

  // 2. Prioridad Secundaria: Registro manual validado del entrenador
  // Los minutos manuales validados NO deben ser desplazados por un cálculo en directo incompleto o no fiable.
  if (typeof manualMinutes === 'number' && manualMinutes >= 0) {
    const hasDiscrepancyWithLive = isLiveReliable && typeof liveMinutes === 'number' && liveMinutes !== manualMinutes;
    return {
      minutes: manualMinutes,
      source: 'manual',
      status: 'confirmed',
      hasDiscrepancy: hasDiscrepancyWithLive,
      notes: hasDiscrepancyWithLive ? `Discrepancia detectada: entrenador registró ${manualMinutes} min frente a ${liveMinutes} min calculados en directo.` : undefined
    };
  }

  // 3. Prioridad Terciaria: Directo (solo si el cálculo es fiable y no existe fuente de mayor jerarquía)
  if (isLiveReliable && typeof liveMinutes === 'number' && liveMinutes >= 0) {
    return {
      minutes: liveMinutes,
      source: 'live',
      status: 'confirmed'
    };
  }

  // 4. Estimación provisional (pendiente de validación)
  if (typeof provisionalMinutes === 'number' && provisionalMinutes > 0) {
    return {
      minutes: provisionalMinutes,
      source: 'player_provisional',
      status: 'provisional',
      notes: 'Estimación provisional no confirmada por acta o cuerpo técnico.'
    };
  }

  return {
    minutes: null,
    source: 'none',
    status: 'pending'
  };
}

/**
 * 5. Calcula minutos de un jugador a partir de eventos en directo (match_events)
 * cuando la categoría tiene duración conocida y el directo es lineal (no rotativo).
 */
export function computeMinutesFromLiveEvents(params: {
  matchDurationMinutes: number;
  isStarter: boolean;
  events: Array<{
    tipo_evento: string;
    minuto: number;
    player_id?: string | null;
    notas?: string | null;
  }>;
  playerId: string;
  isRotarySubstitutionCategory?: boolean;
}): { minutes: number | null; isReliable: boolean; reason?: string } {
  const { matchDurationMinutes, isStarter, events, playerId, isRotarySubstitutionCategory } = params;

  // Si la categoría tiene cambios rotativos (F8 continuo), no es fiable calcular con un timeline lineal
  if (isRotarySubstitutionCategory) {
    return {
      minutes: null,
      isReliable: false,
      reason: 'Categoría con sustituciones rotativas/volantes: cálculo automático en directo no aplicable.'
    };
  }

  let minuteIn = isStarter ? 0 : null;
  let minuteOut: number | null = null;

  for (const ev of events) {
    const tipo = (ev.tipo_evento || '').toLowerCase();
    const notas = (ev.notas || '').toLowerCase();

    // Expulsión
    if (tipo.includes('roja') && ev.player_id === playerId) {
      minuteOut = minuteOut !== null ? Math.min(minuteOut, ev.minuto) : ev.minuto;
    }

    // Sustitución
    if (tipo.includes('cambio')) {
      if (ev.player_id === playerId) {
        // Jugador que entra
        minuteIn = ev.minuto;
      } else {
        // Comprobar si es el jugador que sale
        const isPlayerOut = (ev as any).player_out_id === playerId ||
          notas.includes(`por ${playerId}`) ||
          notas.endsWith(playerId);
        if (isPlayerOut) {
          minuteOut = ev.minuto;
        }
      }
    }
  }

  if (minuteIn === null) {
    // Suplente no ingresó
    return { minutes: 0, isReliable: true };
  }

  const effectiveEnd = minuteOut !== null ? minuteOut : matchDurationMinutes;
  const total = Math.max(0, effectiveEnd - minuteIn);

  return {
    minutes: total,
    isReliable: true
  };
}

// ============================================================================
// FASE 1B: FUENTE COMÚN DE CÁLCULO DE CARGA, VENTANAS TEMPORALES Y ELEGIBILIDAD
// ============================================================================

const CONFIRMED_ATTENDANCE_STATUS_SET = new Set([
  'presente',
  'present',
  'confirmado',
  'confirmed',
  'retraso',
  'late',
  'asiste',
  'justificado',
  'justificada',
  'justified',
  'excused',
  'lesionado',
  'permiso',
  'enfermedad'
]);

const UNDECIDED_ATTENDANCE_STATUS_SET = new Set([
  '',
  'unmarked',
  'pendiente',
  'pending',
  'no registrada',
  'sin marcar'
]);

const CANCELLED_SESSION_STATUS_SET = new Set([
  'cancelado',
  'cancelada',
  'cancelled',
  'canceled',
  'suspendido',
  'suspendida',
  'aplazado',
  'aplazada'
]);

/**
 * 6. Resuelve la fecha canónica YYYY-MM-DD en el huso horario peninsular (Europe/Madrid).
 * No introduce dependencias externas y maneja correctamente cambios de día cerca de medianoche.
 */
export function getSpainReferenceDate(dateInput: Date | string | number = new Date()): string {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput.trim())) {
    return dateInput.trim();
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return '';
  }
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d);
}

/**
 * Obtiene los minutos transcurridos desde medianoche (0..1439) en Europe/Madrid para un instante dado.
 */
export function getSpainMinutesOfDay(dateInput: Date | string | number = new Date()): number | null {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const parts = formatter.format(d).split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  const hour = parts[0] === 24 ? 0 : parts[0];
  return hour * 60 + parts[1];
}

/**
 * Convierte una cadena 'HH:mm' o 'HH:mm:ss' en minutos desde medianoche.
 */
export function parseTimeStringToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/**
 * 7. Calcula la diferencia exacta en días naturales entre referenceDate y targetDate:
 * diffDays = (referenceDate - targetDate) en días enteros.
 * - diffDays === 0: mismo día natural en Europe/Madrid.
 * - diffDays > 0: targetDate es pasado respecto a referenceDate.
 * - diffDays < 0: targetDate es futuro respecto a referenceDate.
 * Usa Date.UTC sobre los componentes YYYY-MM-DD para evitar desfases de 1 día por DST o huso horario.
 */
export function calculateCalendarDaysDiff(
  referenceDateInput: Date | string | number,
  targetDateInput: Date | string | number
): number | null {
  const refStr = getSpainReferenceDate(referenceDateInput);
  const targetStr = getSpainReferenceDate(targetDateInput);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(refStr) || !/^\d{4}-\d{2}-\d{2}$/.test(targetStr)) {
    return null;
  }

  const [rY, rM, rD] = refStr.split('-').map(Number);
  const [tY, tM, tD] = targetStr.split('-').map(Number);

  const refUtc = Date.UTC(rY, rM - 1, rD);
  const targetUtc = Date.UTC(tY, tM - 1, tD);

  return Math.round((refUtc - targetUtc) / (1000 * 60 * 60 * 24));
}

/**
 * 8. Comprueba si un estado de asistencia corresponde a asistencia confirmada.
 * Regla estricta: 'unmarked' NUNCA equivale a asistencia confirmada.
 */
export function isConfirmedAttendanceStatus(status?: string | null): boolean {
  const normalized = (status || '').toLowerCase().trim();
  if (!normalized || normalized === 'unmarked') {
    return false;
  }
  return CONFIRMED_ATTENDANCE_STATUS_SET.has(normalized);
}

/**
 * Comprueba si ya se ha pasado lista para un registro (confirmado, retraso, ausente o justificado),
 * excluyendo estados vacíos, pendientes o 'unmarked'.
 */
export function hasRecordedAttendanceDecision(status?: string | null): boolean {
  const normalized = (status || '').toLowerCase().trim();
  if (!normalized || UNDECIDED_ATTENDANCE_STATUS_SET.has(normalized)) {
    return false;
  }
  return true;
}

/**
 * 9. Comprueba si una sesión tiene un estado de cancelación verificable en el objeto.
 * No asume cancelación si el campo no existe.
 */
export function isCancelledTrainingSession(event: {
  status?: string | null;
  estado?: string | null;
  is_cancelled?: boolean | null;
  cancelled?: boolean | null;
}): boolean {
  if (!event) return false;
  if (event.is_cancelled === true || event.cancelled === true) return true;
  const st = (event.status || event.estado || '').toLowerCase().trim();
  if (st && CANCELLED_SESSION_STATUS_SET.has(st)) {
    return true;
  }
  return false;
}

export interface TrainingSessionEligibilityParams {
  event?: {
    id?: string;
    date?: string | null;
    start_time?: string | null;
    event_type?: string | null;
    status?: string | null;
    estado?: string | null;
    is_cancelled?: boolean | null;
    cancelled?: boolean | null;
  } | null;
  /** Fecha directa del evento (alternativa o complemento a event.date) */
  eventDate?: Date | string | null;
  /** Hora de inicio directa (alternativa o complemento a event.start_time) */
  eventStartTime?: string | null;
  /** Instante o fecha de referencia (por defecto, ahora en Europe/Madrid) */
  now?: Date | string | number;
  /** Estado de asistencia individual registrado para esta sesión */
  attendanceStatus?: string | null;
  /** Estados de asistencia registrados para esta sesión (del jugador o del equipo) */
  attendanceStatuses?: Array<string | null | undefined>;
  /** Si existen datos reales de carga (RPE o minutos) ya registrados en la sesión */
  hasRecordedMetrics?: boolean;
  /** Alias de hasRecordedMetrics */
  hasRealMetrics?: boolean;
}

/**
 * 10. Determina si una sesión de entrenamiento es elegible para contabilizarse en asistencia,
 * historial ejecutado y ventanas de carga:
 * - Debe ser de tipo 'Entrenamiento' (si event_type está definido).
 * - No debe estar cancelada de forma verificable.
 * - No debe ser de una fecha futura (diffDays < 0 en Europe/Madrid).
 * - Si es del día actual (diffDays === 0 en Europe/Madrid):
 *   Solo es elegible si:
 *   a) Ya se ha pasado lista (existe al menos un estado de asistencia decidido, distinto de 'unmarked'/'pending')
 *      o ya tiene métricas reales registradas, O
 *   b) Tiene start_time definido y la hora actual en Europe/Madrid ya ha alcanzado o superado start_time.
 */
export function isTrainingSessionEligible(params: TrainingSessionEligibilityParams): boolean {
  const {
    event,
    eventDate,
    eventStartTime,
    now = new Date(),
    attendanceStatus,
    attendanceStatuses = [],
    hasRecordedMetrics = false,
    hasRealMetrics = false,
  } = params;

  const targetDate = eventDate ?? event?.date;
  if (!targetDate) return false;

  if (event?.event_type && event.event_type !== 'Entrenamiento' && event.event_type.toLowerCase() !== 'training') {
    return false;
  }

  if (event && isCancelledTrainingSession(event)) {
    return false;
  }

  const diffDays = calculateCalendarDaysDiff(now, targetDate);
  if (diffDays === null || diffDays < 0) {
    // Sesión de fecha futura: excluida
    return false;
  }

  if (diffDays > 0) {
    // Sesión de fecha pasada: elegible
    return true;
  }

  // Sesión del día actual (diffDays === 0):
  // Condición A: ¿Se ha pasado lista (existe al menos una decisión explícita de asistencia, distinta de unmarked/pending)?
  // La existencia de RPE o minutos por sí sola NO hace elegible una sesión futura del día actual.
  const allStatuses = attendanceStatus !== undefined ? [attendanceStatus, ...attendanceStatuses] : attendanceStatuses;
  const hasAttendancePassed = allStatuses.some(st => hasRecordedAttendanceDecision(st));
  if (hasAttendancePassed) {
    return true;
  }

  // Condición B: ¿Ha comenzado ya la sesión según su start_time y la hora actual en Europe/Madrid?
  // Nota: Solo se evalúa la hora si `now` incluye información horaria (Date, timestamp o ISO con 'T'),
  // no si se pasó únicamente una cadena de fecha 'YYYY-MM-DD' sin hora.
  const hasTimeComponent =
    now instanceof Date ||
    typeof now === 'number' ||
    (typeof now === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(now.trim()));

  const effectiveStartTime = eventStartTime ?? event?.start_time;
  if (hasTimeComponent && effectiveStartTime) {
    const startMins = parseTimeStringToMinutes(effectiveStartTime);
    const currentMins = getSpainMinutesOfDay(now);
    if (startMins !== null && currentMins !== null && currentMins >= startMins) {
      return true;
    }
  }

  return false;
}

export interface SessionWorkloadEntryInput {
  eventId: string;
  date: string;
  teamId?: string | null;
  rpe?: number | null;
  minutes?: number | null;
  start_time?: string | null;
  startTime?: string | null;
  event_type?: string | null;
  status?: string | null;
  estado?: string | null;
  is_cancelled?: boolean | null;
  cancelled?: boolean | null;
  attendanceStatus?: string | null;
  attendanceStatuses?: Array<string | null | undefined>;
  event?: {
    id?: string;
    date?: string | null;
    start_time?: string | null;
    event_type?: string | null;
    status?: string | null;
    estado?: string | null;
    is_cancelled?: boolean | null;
    cancelled?: boolean | null;
  } | null;
}

export type MultiTeamSessionInput = SessionWorkloadEntryInput;

export interface RollingWorkloadResult {
  referenceDate: string;
  /** Suma total de UA en la ventana aguda de 7 días naturales [ref - 6d, ref] */
  acuteTotalLoad: number;
  /** Alias de acuteTotalLoad */
  acuteSum: number;
  /** Suma total de UA en la ventana crónica de 28 días naturales [ref - 27d, ref] */
  chronicTotalLoad: number;
  /** Alias de chronicTotalLoad */
  chronicSum: number;
  /** Número de sesiones con carga confirmada en la ventana aguda de 7 días */
  acuteSessionCount: number;
  /** Número de sesiones con carga confirmada en la ventana crónica de 28 días */
  chronicSessionCount: number;
  /** Media diaria aguda: UA de los últimos 7 días / 7 (incluye días de descanso en el denominador) */
  acuteLoad: number;
  /** Media diaria crónica: UA de los últimos 28 días / 28 (incluye días de descanso en el denominador) */
  chronicLoad: number;
  /** Cociente ACWR = acuteLoad / chronicLoad redondeado a 2 decimales, o null si chronicLoad <= 0 */
  acwr: number | null;
  /** Cargas diarias confirmadas por fecha YYYY-MM-DD */
  dailyLoads: Record<string, number>;
  /** Sesiones evaluadas con su estado de carga ('confirmed' | 'pending_rpe' | 'pending_minutes' | 'ineligible') */
  evaluatedSessions: Array<{
    eventId: string;
    date: string;
    teamId?: string | null;
    rpe: number | null;
    minutes: number | null;
    load: number | null;
    status: TrainingLoadStatus | 'ineligible';
  }>;
}

/**
 * 11. Calcula de forma unificada las ventanas de 7 y 28 días, medias diarias y ACWR:
 * - Ventana aguda (7 días naturales): fechas con 0 <= diffDays <= 6 (exactamente 7 fechas: [D_ref - 6, D_ref]).
 * - Ventana crónica (28 días naturales): fechas con 0 <= diffDays <= 27 (exactamente 28 fechas: [D_ref - 27, D_ref]).
 * - Deduplica y fusiona sesiones por `eventId`: combina campos complementarios (ej. RPE en una entrada y minutos en otra)
 *   sin duplicar sesiones ni sumar valores, y ante valores válidos contradictorios para el mismo `eventId` aplica un
 *   criterio conservador dejando la métrica en conflicto como `null` (pendiente).
 * - Solo suma cargas cuando tanto `rpe` (0..10) como `minutes` (0..300) están presentes y validados.
 * - Un día de descanso (o sin carga confirmada) aporta 0 a la suma y permanece en el divisor (/ 7 y / 28).
 * - Si chronicLoad === 0, devuelve acwr: null (sin fallback artificial 1.05).
 */
export function calculateRollingWorkloadMetrics(params: {
  sessions: SessionWorkloadEntryInput[];
  now?: Date | string | number;
}): RollingWorkloadResult {
  const { sessions, now = new Date() } = params;
  const referenceDate = getSpainReferenceDate(now);
  const dailyLoads: Record<string, number> = {};
  const evaluatedSessions: RollingWorkloadResult['evaluatedSessions'] = [];
  let acuteSessionCount = 0;
  let chronicSessionCount = 0;

  interface MergedSessionWorkloadEntry {
    eventId: string;
    date: string;
    teamId?: string | null;
    rpe: number | null;
    rpeConflict: boolean;
    minutes: number | null;
    minutesConflict: boolean;
    start_time: string | null;
    event_type: string | null;
    status: string | null;
    estado: string | null;
    is_cancelled: boolean;
    cancelled: boolean;
    attendanceStatuses: Array<string | null | undefined>;
  }

  const mergedByEventId = new Map<string, MergedSessionWorkloadEntry>();

  for (const s of sessions) {
    if (!s || !s.eventId) continue;

    const hasValidRpe = typeof s.rpe === 'number' && !isNaN(s.rpe) && s.rpe >= 0 && s.rpe <= 10;
    const hasValidMin = typeof s.minutes === 'number' && !isNaN(s.minutes) && s.minutes >= 0 && s.minutes <= 300;
    const cleanRpe = hasValidRpe ? s.rpe! : null;
    const cleanMin = hasValidMin ? s.minutes! : null;

    const entryDate = (s.date ?? s.event?.date ?? '') || '';
    const entryStartTime = s.start_time ?? s.startTime ?? s.event?.start_time ?? null;
    const entryEventType = s.event_type ?? s.event?.event_type ?? null;
    const entryStatus = s.status ?? s.event?.status ?? null;
    const entryEstado = s.estado ?? s.event?.estado ?? null;
    const entryIsCancelled = Boolean(s.is_cancelled === true || s.event?.is_cancelled === true);
    const entryCancelled = Boolean(s.cancelled === true || s.event?.cancelled === true);
    const entryStatuses: Array<string | null | undefined> = [];
    if (s.attendanceStatus !== undefined) entryStatuses.push(s.attendanceStatus);
    if (Array.isArray(s.attendanceStatuses)) entryStatuses.push(...s.attendanceStatuses);

    const existing = mergedByEventId.get(s.eventId);
    if (!existing) {
      mergedByEventId.set(s.eventId, {
        eventId: s.eventId,
        date: entryDate,
        teamId: s.teamId,
        rpe: cleanRpe,
        rpeConflict: false,
        minutes: cleanMin,
        minutesConflict: false,
        start_time: entryStartTime,
        event_type: entryEventType,
        status: entryStatus,
        estado: entryEstado,
        is_cancelled: entryIsCancelled,
        cancelled: entryCancelled,
        attendanceStatuses: entryStatuses,
      });
    } else {
      // Fusión de RPE: completar si estaba ausente; si hay conflicto entre dos valores válidos distintos, dejar null (conservador)
      if (cleanRpe !== null) {
        if (existing.rpe === null && !existing.rpeConflict) {
          existing.rpe = cleanRpe;
        } else if (existing.rpe !== null && existing.rpe !== cleanRpe) {
          existing.rpeConflict = true;
          existing.rpe = null;
        }
      }

      // Fusión de minutos: completar si estaba ausente; si hay conflicto entre dos valores válidos distintos, dejar null (conservador)
      if (cleanMin !== null) {
        if (existing.minutes === null && !existing.minutesConflict) {
          existing.minutes = cleanMin;
        } else if (existing.minutes !== null && existing.minutes !== cleanMin) {
          existing.minutesConflict = true;
          existing.minutes = null;
        }
      }

      if (!existing.date && entryDate) existing.date = entryDate;
      if ((existing.teamId === undefined || existing.teamId === null) && s.teamId !== undefined && s.teamId !== null) {
        existing.teamId = s.teamId;
      }
      if (!existing.start_time && entryStartTime) existing.start_time = entryStartTime;
      if (!existing.event_type && entryEventType) existing.event_type = entryEventType;

      // Conservar cualquier estado de cancelación verificable
      if (entryIsCancelled) existing.is_cancelled = true;
      if (entryCancelled) existing.cancelled = true;
      if (entryStatus && (!existing.status || isCancelledTrainingSession({ status: entryStatus }))) {
        existing.status = entryStatus;
      }
      if (entryEstado && (!existing.estado || isCancelledTrainingSession({ estado: entryEstado }))) {
        existing.estado = entryEstado;
      }

      if (entryStatuses.length > 0) {
        existing.attendanceStatuses.push(...entryStatuses);
      }
    }
  }

  for (const merged of mergedByEventId.values()) {
    const cleanRpe = merged.rpe;
    const cleanMin = merged.minutes;

    const effectiveEvent = {
      id: merged.eventId,
      date: merged.date,
      start_time: merged.start_time,
      event_type: merged.event_type ?? 'Entrenamiento',
      status: merged.status,
      estado: merged.estado,
      is_cancelled: merged.is_cancelled,
      cancelled: merged.cancelled,
    };

    const eligible = isTrainingSessionEligible({
      event: effectiveEvent,
      now,
      attendanceStatuses: merged.attendanceStatuses,
      hasRecordedMetrics: cleanRpe !== null || cleanMin !== null
    });

    if (!eligible) {
      evaluatedSessions.push({
        eventId: merged.eventId,
        date: getSpainReferenceDate(merged.date),
        teamId: merged.teamId,
        rpe: cleanRpe,
        minutes: cleanMin,
        load: null,
        status: 'ineligible'
      });
      continue;
    }

    const loadRes = calculateTrainingLoad(cleanRpe, cleanMin);
    const dateKey = getSpainReferenceDate(merged.date);

    evaluatedSessions.push({
      eventId: merged.eventId,
      date: dateKey,
      teamId: merged.teamId,
      rpe: cleanRpe,
      minutes: cleanMin,
      load: loadRes.load,
      status: loadRes.status
    });

    if (loadRes.status === 'confirmed' && loadRes.load !== null && dateKey) {
      dailyLoads[dateKey] = (dailyLoads[dateKey] || 0) + loadRes.load;
      const diffDays = calculateCalendarDaysDiff(referenceDate, dateKey);
      if (diffDays !== null && diffDays >= 0) {
        if (diffDays <= 6) acuteSessionCount++;
        if (diffDays <= 27) chronicSessionCount++;
      }
    }
  }

  let acuteTotalLoad = 0;
  let chronicTotalLoad = 0;

  for (const [dateStr, dayLoad] of Object.entries(dailyLoads)) {
    const diffDays = calculateCalendarDaysDiff(referenceDate, dateStr);
    if (diffDays === null || diffDays < 0) continue; // Nunca incluir fechas futuras

    if (diffDays >= 0 && diffDays <= 6) {
      acuteTotalLoad += dayLoad;
    }
    if (diffDays >= 0 && diffDays <= 27) {
      chronicTotalLoad += dayLoad;
    }
  }

  const acuteLoad = acuteTotalLoad / 7;
  const chronicLoad = chronicTotalLoad / 28;
  const acwr = chronicLoad > 0 ? Number((acuteLoad / chronicLoad).toFixed(2)) : null;

  return {
    referenceDate,
    acuteTotalLoad,
    acuteSum: acuteTotalLoad,
    chronicTotalLoad,
    chronicSum: chronicTotalLoad,
    acuteSessionCount,
    chronicSessionCount,
    acuteLoad,
    chronicLoad,
    acwr,
    dailyLoads,
    evaluatedSessions
  };
}

/**
 * 12. Agrega la carga válida de un jugador que participa en varios equipos del club
 * manteniendo estrictamente separados los minutos del equipo consultado (contextTeamId)
 * respecto a la carga biológica acumulada (ACWR) entre equipos.
 */
export function aggregatePlayerMultiTeamWorkload(params: {
  sessions: SessionWorkloadEntryInput[];
  contextTeamId?: string | null;
  now?: Date | string | number;
}): RollingWorkloadResult & {
  contextTeamTrainingMinutes: number;
  totalClubTrainingMinutes: number;
  minutesByTeam: Record<string, number>;
} {
  const { sessions, contextTeamId, now = new Date() } = params;
  const workload = calculateRollingWorkloadMetrics({ sessions, now });

  let contextTeamTrainingMinutes = 0;
  let totalClubTrainingMinutes = 0;
  const minutesByTeam: Record<string, number> = {};

  for (const ev of workload.evaluatedSessions) {
    if (ev.status === 'ineligible' || ev.minutes === null) continue;
    totalClubTrainingMinutes += ev.minutes;
    if (ev.teamId) {
      minutesByTeam[ev.teamId] = (minutesByTeam[ev.teamId] || 0) + ev.minutes;
    }
    if (!contextTeamId || ev.teamId === contextTeamId) {
      contextTeamTrainingMinutes += ev.minutes;
    }
  }

  return {
    ...workload,
    contextTeamTrainingMinutes,
    totalClubTrainingMinutes,
    minutesByTeam
  };
}

/**
 * 13. Resuelve los minutos oficiales de un partido sin asignar nunca 90 minutos por defecto al titular.
 * - Si el partido no está 'Finalizado', devuelve null.
 * - Si tiene minutos explícitos registrados (incluido 0 real), devuelve el número.
 * - Si es titular o suplente pero no hay minutos registrados en el acta/convocatoria, devuelve null (pendiente).
 */
export function resolveOfficialMatchMinutes(params: {
  matchStatus?: string | null;
  matchEstado?: string | null;
  minutosJugados?: number | string | null;
  minutesPlayed?: number | string | null;
  isStarter?: boolean | null;
  titular?: boolean | null;
  convocatoriaStatus?: string | null;
}): number | null {
  const statusStr = params.matchStatus ?? params.matchEstado ?? '';
  const isFinished = statusStr.toLowerCase().trim() === 'finalizado';
  if (!isFinished) {
    return null;
  }

  const raw = params.minutosJugados ?? params.minutesPlayed;
  if (raw === null || raw === undefined || raw === '') {
    return null;
  }

  const num = Number(raw);
  if (isNaN(num) || num < 0) {
    return null;
  }

  return num;
}

export interface TrainingFeedbackResponseLike {
  success: boolean;
  persistenceStatus: 'confirmed' | 'partial' | 'uncertain' | 'failed';
  savedTargets?: {
    trainingMetrics: boolean;
    sessionFeedback: boolean;
    discomfortIncident: boolean;
  };
  warning?: string;
  error?: string;
}

export interface TrainingFeedbackUIState {
  viewState: 'form' | 'confirmed' | 'partial';
  isSubmitted: boolean;
  isPartial: boolean;
  isError: boolean;
  title: string;
  message: string;
  warningText: string | null;
  errorToast: string | null;
  targetSummary: {
    trainingMetricsSaved: boolean;
    sessionFeedbackSaved: boolean;
    discomfortIncidentSaved: boolean;
  } | null;
}

/**
 * 14. Determina si el formulario de feedback post-entrenamiento puede enviarse.
 * - Exige jugador seleccionado (`selectedPlayerId` no vacío), no estar enviando (`!submitting`)
 *   y un RPE numérico explícito entre 0 y 10 (`rpe !== null`, admitiendo `rpe === 0`).
 */
export function canSubmitTrainingFeedbackForm(params: {
  submitting: boolean;
  selectedPlayerId?: string | null;
  rpe: number | null | undefined;
}): boolean {
  if (params.submitting) return false;
  if (!params.selectedPlayerId || params.selectedPlayerId.trim() === '') return false;
  if (params.rpe === null || params.rpe === undefined || typeof params.rpe !== 'number' || isNaN(params.rpe)) {
    return false;
  }
  return params.rpe >= 0 && params.rpe <= 10;
}

/**
 * 15. Resuelve de forma determinista el estado visual y los mensajes al jugador tras `submitTrainingFeedback`:
 * - `success: true` + `persistenceStatus: 'confirmed'`: confirmación habitual de guardado completo.
 * - `success: true` + `persistenceStatus: 'partial'`: aviso veraz de guardado parcial (nunca afirma guardado total),
 *   mostrando `result.warning` o un mensaje explicativo de respaldo no vacío si `warning` está ausente.
 * - `success: false`: conserva el formulario y expone el mensaje de error para mostrar al usuario.
 */
export function resolveTrainingFeedbackUIState(
  result: TrainingFeedbackResponseLike
): TrainingFeedbackUIState {
  if (!result || !result.success) {
    const errorMsg =
      result?.error && result.error.trim().length > 0
        ? result.error.trim()
        : 'No se pudo registrar la evaluación.';
    return {
      viewState: 'form',
      isSubmitted: false,
      isPartial: false,
      isError: true,
      title: '',
      message: '',
      warningText: null,
      errorToast: errorMsg,
      targetSummary: null,
    };
  }

  const targetSummary = result.savedTargets
    ? {
        trainingMetricsSaved: Boolean(result.savedTargets.trainingMetrics),
        sessionFeedbackSaved: Boolean(result.savedTargets.sessionFeedback),
        discomfortIncidentSaved: Boolean(result.savedTargets.discomfortIncident),
      }
    : null;

  if (result.persistenceStatus === 'partial') {
    const cleanWarning =
      typeof result.warning === 'string' && result.warning.trim().length > 0
        ? result.warning.trim()
        : 'La métrica principal de esfuerzo se ha guardado, pero el registro complementario de la sesión quedó pendiente de sincronización.';

    return {
      viewState: 'partial',
      isSubmitted: true,
      isPartial: true,
      isError: false,
      title: 'Guardado Parcial',
      message:
        'Tu esfuerzo principal ha quedado registrado, pero algunos datos complementarios de la sesión no pudieron guardarse por completo.',
      warningText: cleanWarning,
      errorToast: null,
      targetSummary,
    };
  }

  return {
    viewState: 'confirmed',
    isSubmitted: true,
    isPartial: false,
    isError: false,
    title: '¡Datos Enviados!',
    message: 'Gracias por rellenar tu evaluación. Tus datos han sido guardados correctamente en el sistema.',
    warningText: null,
    errorToast: null,
    targetSummary,
  };
}

export const CLOSED_SEASON_ID_25_26 = '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

export interface RawTrainingEventSource {
  id: string;
  team_id?: string | null;
  season_id?: string | null;
  date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  event_type?: string | null;
  title?: string | null;
  status?: string | null;
  estado?: string | null;
  is_cancelled?: boolean | null;
  cancelled?: boolean | null;
}

export interface RawTrainingAttendanceSource {
  event_id: string;
  player_id?: string | null;
  status?: string | null;
  notes?: string | null;
  event?: RawTrainingEventSource | null;
}

export interface RawTrainingMetricSource {
  event_id: string;
  player_id?: string | null;
  rpe?: number | string | null;
  minutes?: number | string | null;
  metric_name?: string | null;
  value?: number | string | null;
  event?: RawTrainingEventSource | null;
}

export interface ContextTeamTrainingHistoryItem {
  id: string;
  teamId: string | null;
  date: string;
  title: string;
  rpe: number | null;
  minutes: number | null;
  load: number | null;
  status: string;
  rawAttendanceStatus: string | null;
  attendanceNotes?: string;
  attended: boolean;
  hasRealMetrics: boolean;
}

export interface ReconciledPlayerClubTrainingResult {
  contextTeamHistory: ContextTeamTrainingHistoryItem[];
  multiTeamSessions: SessionWorkloadEntryInput[];
  workload: RollingWorkloadResult & {
    contextTeamTrainingMinutes: number;
    totalClubTrainingMinutes: number;
    minutesByTeam: Record<string, number>;
  };
  contextAttendance: {
    totalTrainings: number;
    trainingsAttended: number;
    attendancePct: number;
  };
}

/**
 * Calcula de forma uniforme el porcentaje de asistencia confirmada sobre un conjunto de eventos,
 * utilizando `isConfirmedAttendanceStatus` como única regla para el numerador (excluyendo
 * 'justificado', 'excused', 'lesionado', 'ausente', etc.) y evitando doble conteo por evento.
 */
export function computeConfirmedAttendancePercentage(
  events: Array<{ id: string }>,
  attendanceRecords: Array<{ event_id?: string | null; status?: string | null }>
): { totalEvents: number; confirmedCount: number; pct: number } {
  const validEvents = (events || []).filter(ev => Boolean(ev?.id));
  const totalEvents = validEvents.length;
  if (totalEvents === 0) {
    return { totalEvents: 0, confirmedCount: 0, pct: 0 };
  }

  const confirmedEventIds = new Set<string>();
  for (const a of attendanceRecords || []) {
    if (a?.event_id && isConfirmedAttendanceStatus(a.status)) {
      confirmedEventIds.add(a.event_id);
    }
  }

  let confirmedCount = 0;
  for (const ev of validEvents) {
    if (confirmedEventIds.has(ev.id)) {
      confirmedCount++;
    }
  }

  const pct = Math.round((confirmedCount / totalEvents) * 100);
  return { totalEvents, confirmedCount, pct };
}

/**
 * Resuelve el conjunto de equipos verificados de la temporada activa del club y valida si
 * `playerTeamId` (`players.team_id`) pertenece realmente a dicha temporada activa.
 * Nunca añade `playerTeamId` por el mero hecho de figurar en `players.team_id`.
 */
export function resolveVerifiedActiveSeasonTeamIds(params: {
  clubId: string | null;
  activeSeasonId: string | null;
  candidateTeams: Array<{ id?: string | null; club_id?: string | null; season_id?: string | null }>;
  playerTeamId?: string | null;
}): { activeSeasonTeamIds: Set<string>; verifiedContextTeamId: string | null } {
  const { clubId, activeSeasonId, candidateTeams = [], playerTeamId = null } = params;
  const activeSeasonTeamIds = new Set<string>();

  for (const t of candidateTeams) {
    if (!t?.id) continue;
    if (clubId && t.club_id && t.club_id !== clubId) continue;
    if (t.season_id === CLOSED_SEASON_ID_25_26) continue;
    if (activeSeasonId) {
      if (t.season_id !== activeSeasonId) continue;
    } else {
      if (!t.season_id) continue;
    }
    activeSeasonTeamIds.add(t.id);
  }

  const verifiedContextTeamId =
    playerTeamId && activeSeasonTeamIds.has(playerTeamId) ? playerTeamId : null;

  return { activeSeasonTeamIds, verifiedContextTeamId };
}

function parseValidRpeOrNull(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (isNaN(num) || num < 0 || num > 10) return null;
  return num;
}

function parseValidMinutesOrNull(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  if (isNaN(num) || num < 0 || num > 300) return null;
  return Math.round(num);
}

function classifyMetricRecordField(
  metric: RawTrainingMetricSource
): { rpe?: number | null; minutes?: number | null } {
  const result: { rpe?: number | null; minutes?: number | null } = {};
  if (metric.rpe !== undefined && metric.rpe !== null && metric.rpe !== '') {
    result.rpe = parseValidRpeOrNull(metric.rpe);
  }
  if (metric.minutes !== undefined && metric.minutes !== null && metric.minutes !== '') {
    result.minutes = parseValidMinutesOrNull(metric.minutes);
  }

  if (metric.metric_name && metric.value !== undefined && metric.value !== null && metric.value !== '') {
    const mName = metric.metric_name.toLowerCase();
    const isMinutesMetric =
      mName.includes('min') || mName.includes('durac') || mName.includes('tiempo');
    const isRpeMetric =
      !isMinutesMetric &&
      (mName.includes('rpe') ||
        mName.includes('esfuerzo') ||
        mName.includes('borg') ||
        mName.includes('carga') ||
        mName.includes('fatiga') ||
        mName.includes('s-rpe'));
    if (isMinutesMetric) {
      result.minutes = parseValidMinutesOrNull(metric.value);
    } else if (isRpeMetric) {
      result.rpe = parseValidRpeOrNull(metric.value);
    }
  }
  return result;
}

/**
 * 16. Reconcilia todas las fuentes de entrenamientos de un jugador en el club (`teamEvents`,
 * `attendanceEntries`, `metricEntries`) aplicando:
 * - Aislamiento estricto de temporada: solo admite eventos cuyos `team_id` pertenezcan a
 *   `activeSeasonTeamIds` (y nunca a la temporada cerrada 25/26 `584f508a-fc1a-4339-b5b2-4296ffde2f4c`),
 *   y opcionalmente con fecha `>= seasonStartDate`.
 * - Pre-fusión determinista por `eventId` ANTES de evaluar `isTrainingSessionEligible`, para que
 *   una entrada inicial incompleta nunca bloquee datos válidos posteriores del mismo `eventId`.
 * - Regla conservadora ante conflictos en el mismo `eventId` (`rpe` o `minutes` distintos válidos -> `null`).
 * - Separación estricta entre:
 *   a) `contextTeamHistory` y `contextAttendance`: solo sesiones elegibles del `contextTeamId` (equipo principal/consultado).
 *   b) `multiTeamSessions` y `workload`: todas las sesiones elegibles del club en la temporada activa para el ACWR.
 */
export function reconcilePlayerClubTrainingHistory(params: {
  contextTeamId: string | null;
  activeSeasonTeamIds: Iterable<string>;
  seasonStartDate?: string | null;
  teamEvents?: RawTrainingEventSource[];
  attendanceEntries?: RawTrainingAttendanceSource[];
  metricEntries?: RawTrainingMetricSource[];
  now?: Date | string | number;
}): ReconciledPlayerClubTrainingResult {
  const {
    contextTeamId,
    activeSeasonTeamIds,
    seasonStartDate = null,
    teamEvents = [],
    attendanceEntries = [],
    metricEntries = [],
    now = new Date(),
  } = params;

  const allowedTeams = new Set<string>(activeSeasonTeamIds);
  const minDateKey =
    seasonStartDate && /^\d{4}-\d{2}-\d{2}/.test(seasonStartDate.trim())
      ? seasonStartDate.trim().slice(0, 10)
      : seasonStartDate
      ? getSpainReferenceDate(seasonStartDate)
      : null;

  interface MergedCandidate {
    id: string;
    teamId: string | null;
    seasonId: string | null;
    date: string | null;
    startTime: string | null;
    endTime: string | null;
    eventType: string | null;
    title: string | null;
    status: string | null;
    estado: string | null;
    isCancelled: boolean;
    attendanceStatus: string | null;
    attendanceNotes: string | undefined;
    attendanceStatuses: string[];
    rpe: number | null;
    rpeConflict: boolean;
    minutes: number | null;
    minutesConflict: boolean;
  }

  const candidates = new Map<string, MergedCandidate>();

  const ensureCandidate = (eventId: string): MergedCandidate => {
    let existing = candidates.get(eventId);
    if (!existing) {
      existing = {
        id: eventId,
        teamId: null,
        seasonId: null,
        date: null,
        startTime: null,
        endTime: null,
        eventType: null,
        title: null,
        status: null,
        estado: null,
        isCancelled: false,
        attendanceStatus: null,
        attendanceNotes: undefined,
        attendanceStatuses: [],
        rpe: null,
        rpeConflict: false,
        minutes: null,
        minutesConflict: false,
      };
      candidates.set(eventId, existing);
    }
    return existing;
  };

  const mergeEventMeta = (target: MergedCandidate, ev?: RawTrainingEventSource | null) => {
    if (!ev) return;
    if (ev.team_id && !target.teamId) target.teamId = ev.team_id;
    if (ev.season_id === CLOSED_SEASON_ID_25_26) {
      target.seasonId = CLOSED_SEASON_ID_25_26;
    } else if (ev.season_id && !target.seasonId) {
      target.seasonId = ev.season_id;
    }
    if (ev.date && !target.date) target.date = ev.date;
    if (ev.start_time && !target.startTime) target.startTime = ev.start_time;
    if (ev.end_time && !target.endTime) target.endTime = ev.end_time;
    if (ev.event_type && !target.eventType) target.eventType = ev.event_type;
    if (ev.title && !target.title) target.title = ev.title;
    if (ev.status && !target.status) target.status = ev.status;
    if (ev.estado && !target.estado) target.estado = ev.estado;
    if (
      Boolean(ev.is_cancelled) ||
      Boolean(ev.cancelled) ||
      isCancelledTrainingSession({
        status: ev.status,
        estado: ev.estado,
        is_cancelled: ev.is_cancelled,
        cancelled: ev.cancelled,
      })
    ) {
      target.isCancelled = true;
    }
  };

  for (const ev of teamEvents) {
    if (!ev?.id) continue;
    const c = ensureCandidate(ev.id);
    mergeEventMeta(c, ev);
  }

  for (const att of attendanceEntries) {
    const evId = att?.event_id || att?.event?.id;
    if (!evId) continue;
    const c = ensureCandidate(evId);
    mergeEventMeta(c, att.event);
    const cleanNotes =
      typeof att.notes === 'string' && att.notes.trim() !== '' ? att.notes.trim() : undefined;
    if (cleanNotes && !c.attendanceNotes) {
      c.attendanceNotes = cleanNotes;
    }
    if (att.status && att.status.trim() !== '') {
      const cleanStatus = att.status.trim();
      if (!c.attendanceStatuses.includes(cleanStatus)) {
        c.attendanceStatuses.push(cleanStatus);
      }
      // Priorizar estado válido de asistencia confirmada o decidida sobre estados vacíos o unmarked
      if (
        !c.attendanceStatus ||
        (!isConfirmedAttendanceStatus(c.attendanceStatus) && isConfirmedAttendanceStatus(cleanStatus)) ||
        (!hasRecordedAttendanceDecision(c.attendanceStatus) && hasRecordedAttendanceDecision(cleanStatus))
      ) {
        c.attendanceStatus = cleanStatus;
        if (cleanNotes) {
          c.attendanceNotes = cleanNotes;
        }
      }
    }
  }

  for (const metric of metricEntries) {
    const evId = metric?.event_id || metric?.event?.id;
    if (!evId) continue;
    const c = ensureCandidate(evId);
    mergeEventMeta(c, metric.event);

    const parsed = classifyMetricRecordField(metric);
    if (parsed.rpe !== undefined && parsed.rpe !== null) {
      if (c.rpe === null && !c.rpeConflict) {
        c.rpe = parsed.rpe;
      } else if (c.rpe !== null && c.rpe !== parsed.rpe) {
        c.rpe = null;
        c.rpeConflict = true;
      }
    }
    if (parsed.minutes !== undefined && parsed.minutes !== null) {
      if (c.minutes === null && !c.minutesConflict) {
        c.minutes = parsed.minutes;
      } else if (c.minutes !== null && c.minutes !== parsed.minutes) {
        c.minutes = null;
        c.minutesConflict = true;
      }
    }
  }

  const contextTeamHistory: ContextTeamTrainingHistoryItem[] = [];
  const multiTeamSessions: SessionWorkloadEntryInput[] = [];

  for (const c of candidates.values()) {
    // 1. Excluir temporada cerrada 25/26 explícitamente
    if (c.seasonId === CLOSED_SEASON_ID_25_26) continue;

    // 2. Exigir pertenencia a los equipos de la temporada activa del club
    if (!c.teamId || !allowedTeams.has(c.teamId)) continue;

    // 3. Filtrar por tipo de evento entrenamiento
    if (c.eventType && c.eventType !== 'Entrenamiento' && c.eventType.toLowerCase() !== 'training') {
      continue;
    }

    // 4. Exigir fecha válida y opcionalmente >= inicio de temporada activa
    if (!c.date) continue;
    const dateKey = /^\d{4}-\d{2}-\d{2}/.test(c.date.trim())
      ? c.date.trim().slice(0, 10)
      : getSpainReferenceDate(c.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) continue;
    if (minDateKey && dateKey < minDateKey) continue;

    const hasRealMetrics = c.rpe !== null || c.minutes !== null;

    // 5. Evaluar elegibilidad sobre el candidato ya fusionado (todas las fuentes combinadas)
    const eligible = isTrainingSessionEligible({
      eventDate: c.date,
      eventStartTime: c.startTime,
      event: {
        id: c.id,
        date: c.date,
        start_time: c.startTime,
        event_type: c.eventType || 'Entrenamiento',
        status: c.status,
        estado: c.estado,
        is_cancelled: c.isCancelled,
      },
      attendanceStatus: c.attendanceStatus,
      attendanceStatuses: c.attendanceStatuses,
      hasRealMetrics,
      now,
    });

    if (!eligible) continue;

    const attended =
      isConfirmedAttendanceStatus(c.attendanceStatus) ||
      c.attendanceStatuses.some(st => isConfirmedAttendanceStatus(st));

    const effectiveMinutes = c.minutes;
    const loadRes = calculateTrainingLoad(c.rpe, effectiveMinutes);

    // Todas las sesiones elegibles del club en la temporada activa alimentan el ACWR multi-equipo
    multiTeamSessions.push({
      eventId: c.id,
      teamId: c.teamId,
      date: c.date,
      start_time: c.startTime,
      startTime: c.startTime,
      event_type: c.eventType || 'Entrenamiento',
      status: c.status,
      estado: c.estado,
      is_cancelled: c.isCancelled,
      attendanceStatus: c.attendanceStatus,
      attendanceStatuses: c.attendanceStatuses,
      rpe: c.rpe,
      minutes: effectiveMinutes,
    });

    // Solo las sesiones del equipo principal/consultado entran en el historial y asistencia del equipo
    if (contextTeamId && c.teamId === contextTeamId) {
      contextTeamHistory.push({
        id: c.id,
        teamId: c.teamId,
        date: c.date,
        title: c.title || 'Entrenamiento',
        rpe: c.rpe,
        minutes: effectiveMinutes,
        load: loadRes.load,
        status: c.attendanceStatus || (hasRealMetrics ? 'Con Métricas' : 'Sin Registro'),
        rawAttendanceStatus: c.attendanceStatus,
        attendanceNotes: c.attendanceNotes,
        attended,
        hasRealMetrics,
      });
    }
  }

  contextTeamHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const workload = aggregatePlayerMultiTeamWorkload({
    sessions: multiTeamSessions,
    contextTeamId,
    now,
  });

  const totalTrainings = contextTeamHistory.length;
  const trainingsAttended = contextTeamHistory.filter(t => t.attended).length;
  const attendancePct =
    totalTrainings > 0 ? Math.round((trainingsAttended / totalTrainings) * 100) : 0;

  return {
    contextTeamHistory,
    multiTeamSessions,
    workload,
    contextAttendance: {
      totalTrainings,
      trainingsAttended,
      attendancePct,
    },
  };
}

export interface AuthorizedPlayerWorkloadSummary {
  playerId: string;
  acuteLoad: number;
  chronicLoad: number;
  acwr: number | null;
  acuteTotalLoad: number;
  chronicTotalLoad: number;
  contextTeamTrainingMinutes: number;
  totalClubTrainingMinutes: number;
  totalContextTrainings: number;
  contextTrainingsAttended: number;
  contextTrainingAttendancePct: number;
}

export interface AuthorizedSquadWorkloadsResult {
  authorized: boolean;
  error?: string;
  rejectedPlayerIds: string[];
  summaries: Record<string, AuthorizedPlayerWorkloadSummary>;
}

/**
 * 17. Calcula en servidor los agregados de carga y ACWR multi-equipo para la plantilla
 * autorizada de un equipo (`contextTeamId`), garantizando:
 * - Bloqueo inmediato si el usuario no está autorizado a gestionar `contextTeamId`.
 * - Rechazo de cualquier `playerId` solicitado que no pertenezca a la plantilla autorizada de `contextTeamId`.
 * - Inclusión de sesiones de otros equipos del mismo club y temporada activa en el ACWR
 *   sin exponer eventos ni métricas crudas de esos otros equipos.
 */
export function computeAuthorizedTeamSquadWorkloads(params: {
  isAuthorizedForTeam: boolean;
  contextTeamId: string;
  activeSeasonTeamIds: Iterable<string>;
  authorizedSquadPlayerIds: Iterable<string>;
  requestedPlayerIds?: string[] | null;
  seasonStartDate?: string | null;
  contextTeamEvents: RawTrainingEventSource[];
  attendanceEntries: RawTrainingAttendanceSource[];
  metricEntries: RawTrainingMetricSource[];
  now?: Date | string | number;
}): AuthorizedSquadWorkloadsResult {
  const {
    isAuthorizedForTeam,
    contextTeamId,
    activeSeasonTeamIds,
    authorizedSquadPlayerIds,
    requestedPlayerIds = null,
    seasonStartDate = null,
    contextTeamEvents,
    attendanceEntries,
    metricEntries,
    now = new Date(),
  } = params;

  if (!isAuthorizedForTeam) {
    return {
      authorized: false,
      error: 'No tienes permisos para consultar las métricas de rendimiento de este equipo.',
      rejectedPlayerIds: requestedPlayerIds ? [...requestedPlayerIds] : [],
      summaries: {},
    };
  }

  const squadSet = new Set<string>(authorizedSquadPlayerIds);
  const rejectedPlayerIds: string[] = [];
  let targetPlayerIds: string[] = [];

  if (requestedPlayerIds && requestedPlayerIds.length > 0) {
    for (const pid of requestedPlayerIds) {
      if (squadSet.has(pid)) {
        targetPlayerIds.push(pid);
      } else {
        rejectedPlayerIds.push(pid);
      }
    }
  } else {
    targetPlayerIds = Array.from(squadSet);
  }

  const attendanceByPlayer = new Map<string, RawTrainingAttendanceSource[]>();
  for (const att of attendanceEntries) {
    if (!att.player_id || !squadSet.has(att.player_id)) continue;
    const list = attendanceByPlayer.get(att.player_id) || [];
    list.push(att);
    attendanceByPlayer.set(att.player_id, list);
  }

  const metricsByPlayer = new Map<string, RawTrainingMetricSource[]>();
  for (const m of metricEntries) {
    if (!m.player_id || !squadSet.has(m.player_id)) continue;
    const list = metricsByPlayer.get(m.player_id) || [];
    list.push(m);
    metricsByPlayer.set(m.player_id, list);
  }

  const summaries: Record<string, AuthorizedPlayerWorkloadSummary> = {};

  for (const playerId of targetPlayerIds) {
    const reconciled = reconcilePlayerClubTrainingHistory({
      contextTeamId,
      activeSeasonTeamIds,
      seasonStartDate,
      teamEvents: contextTeamEvents,
      attendanceEntries: attendanceByPlayer.get(playerId) || [],
      metricEntries: metricsByPlayer.get(playerId) || [],
      now,
    });

    summaries[playerId] = {
      playerId,
      acuteLoad: reconciled.workload.acuteLoad,
      chronicLoad: reconciled.workload.chronicLoad,
      acwr: reconciled.workload.acwr,
      acuteTotalLoad: reconciled.workload.acuteTotalLoad,
      chronicTotalLoad: reconciled.workload.chronicTotalLoad,
      contextTeamTrainingMinutes: reconciled.workload.contextTeamTrainingMinutes,
      totalClubTrainingMinutes: reconciled.workload.totalClubTrainingMinutes,
      totalContextTrainings: reconciled.contextAttendance.totalTrainings,
      contextTrainingsAttended: reconciled.contextAttendance.trainingsAttended,
      contextTrainingAttendancePct: reconciled.contextAttendance.attendancePct,
    };
  }

  return {
    authorized: true,
    rejectedPlayerIds,
    summaries,
  };
}



