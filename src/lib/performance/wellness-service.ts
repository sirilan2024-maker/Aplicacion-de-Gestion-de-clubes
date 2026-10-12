/**
 * Sporting Saladar — Módulo de Rendimiento: Servicio Puro de Bienestar y Feedback
 * 
 * Este módulo contiene lógica determinista y pura:
 * 1. Validación de rangos en escalas Hooper (1-5) y Borg CR-10 (1-10).
 * 2. Manejo de dobles sesiones diarias y preservación del bienestar basal.
 * 3. Cálculo de alertas informativas no invasivas (sin alterar disponibilidad médica).
 * 4. Determinación de estados de carga (sRPE) y participación individual.
 */

export interface HooperRatings {
  sleepQuality: number; // 1 (Muy bueno) a 5 (Muy malo)
  fatigue: number;      // 1 (Muy baja) a 5 (Exhausto)
  soreness: number;     // 1 (Sin dolor) a 5 (Dolor muy intenso)
  stress: number;       // 1 (Muy relajado) a 5 (Muy estresado)
  mood: number;         // 1 (Excelente) a 5 (Muy desmotivado)
}

export interface DiscomfortDetails {
  hasDiscomfort: boolean;
  zone?: string | null;
  intensity?: number | null; // 1-10
  notes?: string | null;
}

export interface DailyWellnessInput extends HooperRatings, DiscomfortDetails {
  playerId: string;
  date: string; // YYYY-MM-DD
  sourceEventId?: string | null;
}

export interface SessionFeedbackInput extends DiscomfortDetails {
  eventId: string;
  playerId: string;
  rpe: number; // 1-10
  minutes?: number | null;
}

export interface WellnessValidationResult {
  isValid: boolean;
  errors: string[];
  cleanData?: {
    ratings: HooperRatings;
    discomfort: DiscomfortDetails;
    // Si la fórmula global de Hooper no está aprobada formalmente por el club,
    // se devuelve null para evitar inventar umbrales clínicos.
    rawScore: number | null;
  };
}

export interface SessionFeedbackValidationResult {
  isValid: boolean;
  errors: string[];
  cleanData?: {
    rpe: number;
    minutes: number | null;
    trainingLoad: number | null;
    loadStatus: 'calculated' | 'pending_minutes';
    discomfort: DiscomfortDetails;
  };
}

export interface InformationalAlert {
  type: 'fatigue_warning' | 'soreness_warning' | 'discomfort_reported' | 'high_exertion';
  level: 'info' | 'attention';
  message: string;
  zone?: string | null;
}

/**
 * Valida los datos del cuestionario de bienestar previo al entrenamiento.
 */
export function validateWellnessInput(input: any): WellnessValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { isValid: false, errors: ['Entrada inválida o vacía'] };
  }

  const { sleepQuality, fatigue, soreness, stress, mood, hasDiscomfort, zone, intensity, notes } = input;

  const checkRating = (val: any, fieldName: string) => {
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 5) {
      errors.push(`${fieldName} debe ser un número entero entre 1 y 5`);
    }
  };

  checkRating(sleepQuality, 'Calidad del sueño');
  checkRating(fatigue, 'Fatiga');
  checkRating(soreness, 'Dolor muscular');
  checkRating(stress, 'Estrés');
  checkRating(mood, 'Estado de ánimo');

  const cleanDiscomfort: DiscomfortDetails = {
    hasDiscomfort: Boolean(hasDiscomfort),
    zone: null,
    intensity: null,
    notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : null,
  };

  if (cleanDiscomfort.hasDiscomfort) {
    if (!zone || typeof zone !== 'string' || zone.trim() === '') {
      errors.push('Debe indicar la zona corporal afectada si reporta molestias');
    } else {
      cleanDiscomfort.zone = zone.trim().slice(0, 100);
    }

    if (typeof intensity !== 'number' || intensity < 1 || intensity > 10) {
      errors.push('La intensidad de la molestia debe ser un número entre 1 y 10');
    } else {
      cleanDiscomfort.intensity = Math.round(intensity);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    cleanData: {
      ratings: {
        sleepQuality,
        fatigue,
        soreness,
        stress,
        mood,
      },
      discomfort: cleanDiscomfort,
      // La suma simple Hooper se almacena solo como referencia bruta (rango 5 a 25)
      // sin imponer interpretaciones de aptitud médica.
      rawScore: sleepQuality + fatigue + soreness + stress + mood,
    },
  };
}

/**
 * Resuelve la lógica de doble sesión en un mismo día:
 * Si el jugador ya completó el bienestar por la mañana, en la sesión vespertina:
 * 1. Mantiene el bienestar basal original intacto.
 * 2. Permite adjuntar o actualizar si ha sobrevenido una nueva molestia entre sesiones.
 */
export function resolveDoubleSessionWellness(
  existingBaseline: DailyWellnessInput | null,
  incomingSessionData: {
    eventId: string;
    hasNewDiscomfort?: boolean;
    newDiscomfortZone?: string | null;
    newDiscomfortIntensity?: number | null;
    notes?: string | null;
  }
) {
  if (!existingBaseline) {
    return {
      action: 'require_baseline',
      message: 'No existe cuestionario matinal. Debe completarse el bienestar completo.',
    };
  }

  // Si existe línea base y no hay molestias sobrevenidas, la respuesta se reutiliza
  if (!incomingSessionData.hasNewDiscomfort) {
    return {
      action: 'reuse_existing',
      reusedFromEventId: existingBaseline.sourceEventId || null,
      wellnessData: existingBaseline,
      hasDiscomfortUpdate: false,
    };
  }

  // Si sobrevino una molestia en la segunda sesión, se genera un registro incremental
  // para ser persistido en player_session_discomfort_incidents sin alterar la línea base en player_daily_wellness
  const zone = incomingSessionData.newDiscomfortZone || existingBaseline.zone || 'No especificada';
  const intensity = incomingSessionData.newDiscomfortIntensity || existingBaseline.intensity || 5;
  const notes = incomingSessionData.notes || 'Molestia comunicada antes de la 2ª sesión';

  return {
    action: 'append_discomfort_update',
    reusedFromEventId: existingBaseline.sourceEventId || null,
    wellnessData: existingBaseline, // Se conserva 100% íntegra la respuesta basal original
    hasDiscomfortUpdate: true,
    incidentToPersist: {
      eventId: incomingSessionData.eventId,
      timing: 'pre_session' as const,
      zone,
      intensity,
      notes,
      source: 'wellness_flow' as const,
    },
    updatedDiscomfort: {
      hasDiscomfort: true,
      zone,
      intensity,
      notes,
    },
  };
}

/**
 * Valida el feedback de la sesión post-entrenamiento (RPE, minutos y molestias).
 */
export function validateSessionFeedbackInput(input: any): SessionFeedbackValidationResult {
  const errors: string[] = [];

  if (!input || typeof input !== 'object') {
    return { isValid: false, errors: ['Entrada inválida o vacía'] };
  }

  const { rpe, minutes, hasDiscomfort, zone, intensity, notes } = input;

  if (typeof rpe !== 'number' || rpe < 1 || rpe > 10) {
    errors.push('El RPE debe ser un valor numérico entre 1 y 10');
  }

  let cleanMinutes: number | null = null;
  if (minutes !== undefined && minutes !== null) {
    if (typeof minutes !== 'number' || isNaN(minutes) || minutes < 0 || minutes > 300) {
      errors.push('Los minutos de participación deben ser un número entre 0 y 300');
    } else {
      cleanMinutes = Math.round(minutes);
    }
  }

  const cleanDiscomfort: DiscomfortDetails = {
    hasDiscomfort: Boolean(hasDiscomfort),
    zone: null,
    intensity: null,
    notes: typeof notes === 'string' ? notes.trim().slice(0, 500) : null,
  };

  if (cleanDiscomfort.hasDiscomfort) {
    if (!zone || typeof zone !== 'string' || zone.trim() === '') {
      errors.push('Debe especificar la zona si reporta molestias tras la sesión');
    } else {
      cleanDiscomfort.zone = zone.trim().slice(0, 100);
    }

    if (typeof intensity !== 'number' || intensity < 1 || intensity > 10) {
      errors.push('La intensidad de la molestia debe ser entre 1 y 10');
    } else {
      cleanDiscomfort.intensity = Math.round(intensity);
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  const trainingLoad = cleanMinutes !== null && cleanMinutes > 0 ? rpe * cleanMinutes : null;

  return {
    isValid: true,
    errors: [],
    cleanData: {
      rpe,
      minutes: cleanMinutes,
      trainingLoad,
      loadStatus: cleanMinutes !== null ? 'calculated' : 'pending_minutes',
      discomfort: cleanDiscomfort,
    },
  };
}

/**
 * Genera alertas estrictamente informativas para el preparador físico.
 * REGLA: Nunca modifican la disponibilidad deportiva del jugador ni crean episodios clínicos.
 */
export function generateInformationalAlerts(
  ratings?: HooperRatings,
  discomfort?: DiscomfortDetails,
  rpeFeedback?: { rpe: number }
): InformationalAlert[] {
  const alerts: InformationalAlert[] = [];

  if (ratings) {
    if (ratings.fatigue >= 4) {
      alerts.push({
        type: 'fatigue_warning',
        level: 'attention',
        message: `Fatiga percibida elevada (${ratings.fatigue}/5) reportada antes del entrenamiento.`,
      });
    }

    if (ratings.soreness >= 4) {
      alerts.push({
        type: 'soreness_warning',
        level: 'attention',
        message: `Dolor muscular elevado (${ratings.soreness}/5) reportado antes del entrenamiento.`,
      });
    }
  }

  if (discomfort && discomfort.hasDiscomfort) {
    alerts.push({
      type: 'discomfort_reported',
      level: discomfort.intensity && discomfort.intensity >= 7 ? 'attention' : 'info',
      message: `Molestia comunicada en ${discomfort.zone || 'zona no indicada'} (Intensidad ${discomfort.intensity || 'N/A'}/10).`,
      zone: discomfort.zone,
    });
  }

  if (rpeFeedback && rpeFeedback.rpe >= 9) {
    alerts.push({
      type: 'high_exertion',
      level: 'info',
      message: `Esfuerzo máximo percibido (RPE ${rpeFeedback.rpe}/10) en la sesión.`,
    });
  }

  return alerts;
}

/**
 * Obtiene la fecha canónica YYYY-MM-DD en el huso horario oficial peninsular (Europe/Madrid).
 * Evita el desfase de toISOString().split('T')[0] neutro en UTC.
 */
export function getSpainDateString(dateInput: Date | string | number = new Date()): string {
  const d = typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)
    ? dateInput // Ya es una fecha limpia YYYY-MM-DD
    : new Date(dateInput);

  if (typeof d === 'string') return d;

  // Formato oficial español en Europe/Madrid
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(d); // Devuelve "YYYY-MM-DD"
}

