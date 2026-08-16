// ============================================================
// Tipos para el Módulo de Periodización y Microciclos
// ============================================================

export type MicrocycleDay =
  | 'MD_plus_1'
  | 'MD_minus_4'
  | 'MD_minus_3'
  | 'MD_minus_2'
  | 'MD_minus_1'
  | 'MD'
  | 'REST';

export type LoadLevel = 1 | 2 | 3 | 4 | 5;

export type FootballCategory =
  | 'querubin'
  | 'prebenjamin'
  | 'benjamin'
  | 'alevin'
  | 'infantil'
  | 'cadete'
  | 'juvenil'
  | 'senior';

export interface DayLoad {
  day: MicrocycleDay;
  label: string;
  date?: string; // ISO date
  intensityLoad: LoadLevel;
  sessionId?: string;
  sessionCount: number;
  dominantFocus: 'technical' | 'tactical' | 'physical' | 'recovery' | 'match' | 'rest';
}

export interface WeeklyPlan {
  weekStartDate: string; // ISO Monday
  teamId: string;
  teamName: string;
  ageCategory: FootballCategory;
  days: DayLoad[];
  totalMinutes: number;
  weeklyLoadIndex: number; // 1-100
}

export interface MicrocycleSummary {
  teamId: string;
  currentWeek: WeeklyPlan;
  nextMatchDate?: string;
  nextMatchOpponent?: string;
}

// Etiquetas legibles para los días de microciclo
export const MICROCYCLE_DAY_LABELS: Record<MicrocycleDay, string> = {
  MD_plus_1:  'MD+1 Recuperación',
  MD_minus_4: 'MD-4 Tensión',
  MD_minus_3: 'MD-3 Duración',
  MD_minus_2: 'MD-2 Velocidad',
  MD_minus_1: 'MD-1 Activación',
  MD:         'MD Partido',
  REST:       'Descanso',
};

// Carga típica por día según modelo de periodización táctica
export const DEFAULT_DAY_LOAD: Record<MicrocycleDay, LoadLevel> = {
  MD_plus_1:  1,
  MD_minus_4: 4,
  MD_minus_3: 5,
  MD_minus_2: 3,
  MD_minus_1: 2,
  MD:         3,
  REST:       1,
};

// Características pedagógicas por categoría
export const CATEGORY_PEDAGOGY: Record<FootballCategory, {
  label: string;
  ageRange: string;
  allowTactics: boolean;
  allowPeriodization: boolean;
  focus: string[];
}> = {
  querubin: {
    label: 'Querubín', ageRange: '4-5 años',
    allowTactics: false, allowPeriodization: false,
    focus: ['psicomotricidad', 'juego libre', 'coordinación motriz básica']
  },
  prebenjamin: {
    label: 'Prebenjamín', ageRange: '6-7 años',
    allowTactics: false, allowPeriodization: false,
    focus: ['juegos de persecución', 'habilidades motrices', 'mini-porterías', 'diversión']
  },
  benjamin: {
    label: 'Benjamín', ageRange: '8-9 años',
    allowTactics: false, allowPeriodization: false,
    focus: ['conducción', 'pase-control', 'duelos 1v1', 'juegos de posición simples']
  },
  alevin: {
    label: 'Alevín', ageRange: '10-11 años',
    allowTactics: true, allowPeriodization: false,
    focus: ['rondos 3v1/4v2', 'ocupación del espacio', 'técnica individual', 'colectiva básica']
  },
  infantil: {
    label: 'Infantil', ageRange: '12-13 años',
    allowTactics: true, allowPeriodization: true,
    focus: ['modelo de juego', 'salida ante presión', 'transiciones', 'principios tácticos']
  },
  cadete: {
    label: 'Cadete', ageRange: '14-15 años',
    allowTactics: true, allowPeriodization: true,
    focus: ['periodización táctica', 'automatismos colectivos', 'presión organizada', 'juego posicional']
  },
  juvenil: {
    label: 'Juvenil', ageRange: '16-17 años',
    allowTactics: true, allowPeriodization: true,
    focus: ['microciclo estructurado formal', 'alto rendimiento', 'preparación de partido']
  },
  senior: {
    label: 'Senior', ageRange: '+18 años',
    allowTactics: true, allowPeriodization: true,
    focus: ['microciclo estructurado', 'automatismos complejos', 'preparación táctica específica']
  },
};
