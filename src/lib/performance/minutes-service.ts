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
  'asiste'
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
  event: {
    id?: string;
    date?: string | null;
    start_time?: string | null;
    event_type?: string | null;
    status?: string | null;
    estado?: string | null;
    is_cancelled?: boolean | null;
    cancelled?: boolean | null;
  };
  /** Instante o fecha de referencia (por defecto, ahora en Europe/Madrid) */
  now?: Date | string | number;
  /** Estados de asistencia registrados para esta sesión (del jugador o del equipo) */
  attendanceStatuses?: Array<string | null | undefined>;
  /** Si existen datos reales de carga (RPE o minutos) ya registrados en la sesión */
  hasRecordedMetrics?: boolean;
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
  const { event, now = new Date(), attendanceStatuses = [], hasRecordedMetrics = false } = params;
  if (!event || !event.date) return false;

  if (event.event_type && event.event_type !== 'Entrenamiento' && event.event_type.toLowerCase() !== 'training') {
    return false;
  }

  if (isCancelledTrainingSession(event)) {
    return false;
  }

  const diffDays = calculateCalendarDaysDiff(now, event.date);
  if (diffDays === null || diffDays < 0) {
    // Sesión de fecha futura: excluida
    return false;
  }

  if (diffDays > 0) {
    // Sesión de fecha pasada: elegible
    return true;
  }

  // Sesión del día actual (diffDays === 0):
  // Condición A: ¿Se ha pasado lista (estado distinto de unmarked/pending) o hay métricas reales registradas?
  const hasAttendancePassed = attendanceStatuses.some(st => hasRecordedAttendanceDecision(st));
  if (hasAttendancePassed || hasRecordedMetrics) {
    return true;
  }

  // Condición B: ¿Ha comenzado ya la sesión según su start_time y la hora actual en Europe/Madrid?
  // Nota: Solo se evalúa la hora si `now` incluye información horaria (Date, timestamp o ISO con 'T'),
  // no si se pasó únicamente una cadena de fecha 'YYYY-MM-DD' sin hora.
  const hasTimeComponent =
    now instanceof Date ||
    typeof now === 'number' ||
    (typeof now === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(now.trim()));

  if (hasTimeComponent && event.start_time) {
    const startMins = parseTimeStringToMinutes(event.start_time);
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
  event_type?: string | null;
  status?: string | null;
  estado?: string | null;
  is_cancelled?: boolean | null;
  cancelled?: boolean | null;
  attendanceStatuses?: Array<string | null | undefined>;
}

export interface RollingWorkloadResult {
  referenceDate: string;
  /** Suma total de UA en la ventana aguda de 7 días naturales [ref - 6d, ref] */
  acuteTotalLoad: number;
  /** Suma total de UA en la ventana crónica de 28 días naturales [ref - 27d, ref] */
  chronicTotalLoad: number;
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
 * - Deduplica sesiones por `eventId` para evitar doble conteo en agregaciones multi-equipo.
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
  const seenEventIds = new Set<string>();
  const dailyLoads: Record<string, number> = {};
  const evaluatedSessions: RollingWorkloadResult['evaluatedSessions'] = [];

  for (const s of sessions) {
    if (!s || !s.eventId) continue;
    // Evitar duplicar una misma sesión o evento compartido entre equipos
    if (seenEventIds.has(s.eventId)) continue;
    seenEventIds.add(s.eventId);

    const hasValidRpe = typeof s.rpe === 'number' && !isNaN(s.rpe) && s.rpe >= 0 && s.rpe <= 10;
    const hasValidMin = typeof s.minutes === 'number' && !isNaN(s.minutes) && s.minutes >= 0 && s.minutes <= 300;
    const cleanRpe = hasValidRpe ? s.rpe! : null;
    const cleanMin = hasValidMin ? s.minutes! : null;

    const eligible = isTrainingSessionEligible({
      event: {
        id: s.eventId,
        date: s.date,
        start_time: s.start_time,
        event_type: s.event_type ?? 'Entrenamiento',
        status: s.status,
        estado: s.estado,
        is_cancelled: s.is_cancelled,
        cancelled: s.cancelled
      },
      now,
      attendanceStatuses: s.attendanceStatuses,
      hasRecordedMetrics: cleanRpe !== null || cleanMin !== null
    });

    if (!eligible) {
      evaluatedSessions.push({
        eventId: s.eventId,
        date: getSpainReferenceDate(s.date),
        teamId: s.teamId,
        rpe: cleanRpe,
        minutes: cleanMin,
        load: null,
        status: 'ineligible'
      });
      continue;
    }

    const loadRes = calculateTrainingLoad(cleanRpe, cleanMin);
    const dateKey = getSpainReferenceDate(s.date);

    evaluatedSessions.push({
      eventId: s.eventId,
      date: dateKey,
      teamId: s.teamId,
      rpe: cleanRpe,
      minutes: cleanMin,
      load: loadRes.load,
      status: loadRes.status
    });

    if (loadRes.status === 'confirmed' && loadRes.load !== null && dateKey) {
      dailyLoads[dateKey] = (dailyLoads[dateKey] || 0) + loadRes.load;
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
    chronicTotalLoad,
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
} {
  const { sessions, contextTeamId, now = new Date() } = params;
  const workload = calculateRollingWorkloadMetrics({ sessions, now });

  let contextTeamTrainingMinutes = 0;
  let totalClubTrainingMinutes = 0;

  for (const ev of workload.evaluatedSessions) {
    if (ev.status === 'ineligible' || ev.minutes === null) continue;
    totalClubTrainingMinutes += ev.minutes;
    if (!contextTeamId || ev.teamId === contextTeamId) {
      contextTeamTrainingMinutes += ev.minutes;
    }
  }

  return {
    ...workload,
    contextTeamTrainingMinutes,
    totalClubTrainingMinutes
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
  minutosJugados?: number | string | null;
  minutesPlayed?: number | string | null;
  isStarter?: boolean | null;
}): number | null {
  const isFinished = (params.matchStatus || '').toLowerCase().trim() === 'finalizado';
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

