/**
 * Sporting Saladar — Configuración Centralizada de Bienestar y Feedback
 * Archivo: src/lib/performance/wellness-config.ts
 * 
 * VALIDADO POR JOAQUÍN (PREPARADOR FÍSICO):
 * - Escalas, preguntas y umbrales aprobados.
 * - Orientación explícita por pregunta:
 *   - Sueño y Ánimo: higher_is_better (1 Peor -> 5 Óptimo/Excelente).
 *   - Fatiga, Dolor muscular y Estrés: higher_is_worse (1 Mínimo/Óptimo -> 5 Máximo/Peor).
 */

export interface WellnessScaleEndpoint {
  value: number;
  label: string;
  description: string;
}

export interface WellnessQuestionConfig {
  id: 'sleepQuality' | 'fatigue' | 'soreness' | 'stress' | 'mood';
  field: string;
  title: string;
  category: 'sueno' | 'fatiga' | 'muscular' | 'estres' | 'animo';
  min: number;
  max: number;
  step: number;
  endpoints: {
    min: WellnessScaleEndpoint;
    max: WellnessScaleEndpoint;
  };
  labels: Record<number, string>;
  /**
   * Orientación:
   * 'higher_is_better': 1 es negativo (rojo), 5 es positivo (verde) -> p.ej. Sueño, Ánimo
   * 'higher_is_worse': 1 es positivo (verde), 5 es negativo (rojo) -> p.ej. Fatiga, Dolor, Estrés
   */
  orientation: 'higher_is_worse' | 'higher_is_better';
}

export interface WellnessModuleConfig {
  /** Confirmación de validación por Joaquín */
  isPendingValidationByJoaquin: boolean;
  version: string;
  timeZone: string; // 'Europe/Madrid'
  
  questions: WellnessQuestionConfig[];

  discomfortQuestion: {
    title: string;
    description: string;
    intensityScale: {
      min: number;
      max: number;
      minLabel: string;
      maxLabel: string;
    };
    anatomicalZones: string[];
  };

  /**
   * Umbrales orientativos e informativos validados:
   * No alteran la convocatoria ni el estado médico (player_injuries).
   */
  alertThresholds: {
    fatigueAttentionThreshold: number;
    sorenessAttentionThreshold: number;
    discomfortSevereIntensityThreshold: number;
    highRpeThreshold: number;
  };
}

export const WELLNESS_CONFIG: WellnessModuleConfig = {
  isPendingValidationByJoaquin: false,
  version: '2026.10-approved-by-joaquin',
  timeZone: 'Europe/Madrid',

  questions: [
    {
      id: 'sleepQuality',
      field: 'sleep_quality',
      title: 'Calidad del sueño',
      category: 'sueno',
      min: 1,
      max: 5,
      step: 1,
      orientation: 'higher_is_better', // Propuesta habitual para jugadores jóvenes: 1 Muy mal, 5 Excelente
      endpoints: {
        min: { value: 1, label: 'Muy mal', description: 'Insomnio o sueño muy interrumpido' },
        max: { value: 5, label: 'Excelente', description: 'Sueño profundo y reparador' },
      },
      labels: {
        1: 'Muy mal',
        2: 'Mal',
        3: 'Regular',
        4: 'Bien',
        5: 'Excelente',
      },
    },
    {
      id: 'fatigue',
      field: 'fatigue',
      title: 'Nivel de fatiga o cansancio',
      category: 'fatiga',
      min: 1,
      max: 5,
      step: 1,
      orientation: 'higher_is_worse', // 1 Fresco, 5 Agotado
      endpoints: {
        min: { value: 1, label: 'Fresco', description: 'Totalmente descansado y con energía' },
        max: { value: 5, label: 'Agotado', description: 'Extenuado / agotamiento físico alto' },
      },
      labels: {
        1: 'Muy fresco',
        2: 'Fresco',
        3: 'Normal',
        4: 'Cansado',
        5: 'Agotado',
      },
    },
    {
      id: 'soreness',
      field: 'soreness',
      title: 'Agujetas o dolor muscular',
      category: 'muscular',
      min: 1,
      max: 5,
      step: 1,
      orientation: 'higher_is_worse', // 1 Ninguno, 5 Muy dolorido
      endpoints: {
        min: { value: 1, label: 'Ninguno', description: 'Músculos relajados sin tirantez' },
        max: { value: 5, label: 'Muy dolorido', description: 'Dolor o rigidez muscular severa' },
      },
      labels: {
        1: 'Ninguno',
        2: 'Leve',
        3: 'Moderado',
        4: 'Intenso',
        5: 'Muy intenso',
      },
    },
    {
      id: 'stress',
      field: 'stress',
      title: 'Nivel de estrés o agobio',
      category: 'estres',
      min: 1,
      max: 5,
      step: 1,
      orientation: 'higher_is_worse', // 1 Tranquilo, 5 Muy estresado
      endpoints: {
        min: { value: 1, label: 'Relajado', description: 'Tranquilo y sin preocupaciones' },
        max: { value: 5, label: 'Muy estresado', description: 'Nivel de agobio elevado (estudios/personal)' },
      },
      labels: {
        1: 'Muy tranquilo',
        2: 'Relajado',
        3: 'Normal',
        4: 'Estresado',
        5: 'Muy agobiado',
      },
    },
    {
      id: 'mood',
      field: 'mood',
      title: 'Estado de ánimo / Motivación',
      category: 'animo',
      min: 1,
      max: 5,
      step: 1,
      orientation: 'higher_is_better', // 1 Desmotivado, 5 Excelente
      endpoints: {
        min: { value: 1, label: 'Muy bajo', description: 'Desmotivado o triste' },
        max: { value: 5, label: 'Excelente', description: 'Muy positivo con ganas de entrenar' },
      },
      labels: {
        1: 'Muy desmotivado',
        2: 'Bajo',
        3: 'Normal',
        4: 'Positivo',
        5: 'Muy motivado',
      },
    },
  ],

  discomfortQuestion: {
    title: '¿Tienes alguna molestia o dolor físico hoy?',
    description: 'Comunica cualquier sobrecarga, golpe o tirantez antes de iniciar la sesión.',
    intensityScale: {
      min: 1,
      max: 10,
      minLabel: 'Leve (apenas perceptible)',
      maxLabel: 'Inhabilitante (no puedo correr/golpear)',
    },
    anatomicalZones: [
      'Isquiotibial',
      'Cuádriceps',
      'Aductor / Ingle',
      'Gemelo / Sóleo',
      'Tendón de Aquiles',
      'Tobillo',
      'Rodilla',
      'Espalda / Lumbar',
      'Cadera',
      'Hombro / Brazo',
      'Otro',
    ],
  },

  alertThresholds: {
    fatigueAttentionThreshold: 4,
    sorenessAttentionThreshold: 4,
    discomfortSevereIntensityThreshold: 7,
    highRpeThreshold: 9,
  },
};
