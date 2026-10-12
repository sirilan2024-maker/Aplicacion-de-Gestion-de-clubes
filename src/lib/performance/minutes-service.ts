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
 * 2. Valida los valores numéricos de RPE y minutos para entrenamiento.
 * Permite participaciones parciales legítimas (ej. 15, 30 minutos).
 */
export function validateTrainingFeedbackInputs(
  rpe: unknown,
  minutes: unknown
): { isValid: boolean; error?: string; cleanRpe?: number; cleanMinutes?: number | null } {
  if (typeof rpe !== 'number' || isNaN(rpe) || rpe < 1 || rpe > 10) {
    return { isValid: false, error: 'El RPE debe ser un valor numérico entre 1 y 10.' };
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
 * 3. Calcula la carga de entrenamiento:
 * Carga confirmada = RPE * Minutos reales.
 * Si los minutos son nulos o pendientes, la carga queda como pendiente.
 */
export function calculateTrainingLoad(
  rpe: number,
  minutes: number | null
): { load: number | null; status: 'confirmed' | 'pending' } {
  if (minutes === null || minutes === undefined || minutes <= 0) {
    return { load: null, status: 'pending' };
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
