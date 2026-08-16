import type { FootballCategory, MicrocycleDay } from './microcycle';

export type CategoriaEdad = 'prebenjamin' | 'benjamin' | 'alevin' | 'infantil' | 'cadete' | 'juvenil' | 'senior';

export type GamePhase =
  | 'attacking_build_up'
  | 'attacking_progression'
  | 'attacking_finishing'
  | 'defending_high_press'
  | 'defending_mid_block'
  | 'defending_low_block'
  | 'transition_atk_to_def'
  | 'transition_def_to_atk'
  | 'set_pieces'
  | 'motor_coordination';

export type DrillStructure =
  | 'ludic_motor_circuit'
  | 'rondo'
  | 'positional_game'
  | 'possession'
  | 'wave_attack'
  | 'conditioned_game'
  | 'passing_pattern'
  | 'individual_technical';

// ── Pizarra Táctica SVG ──────────────────────────────────────
export type TeamColor = 'blue' | 'red' | 'yellow' | 'white' | 'green' | 'orange';

export interface TacticalPlayer {
  id: string;
  x: number;       // 0–100
  y: number;       // 0–70
  team: TeamColor;
  label?: string;  // dorsal o nombre
  shape?: 'circle' | 'square';
}

export interface TacticalCone {
  id: string;
  x: number;
  y: number;
  color?: 'yellow' | 'red' | 'orange' | 'blue';
}

export interface TacticalPike {
  id: string;
  x: number;
  y: number;
}

export interface TacticalBall {
  id: string;
  x: number;
  y: number;
}

export interface TacticalMiniGoal {
  id: string;
  x: number;
  y: number;
  rotation?: number; // grados
}

export interface TacticalArrow {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  type: 'pass' | 'movement' | 'dribble';
  curved?: boolean;
}

export interface TacticalZone {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  opacity?: number;
  label?: string;
}

export interface TacticalBoardData {
  pitchType: 'full' | 'half' | 'third';
  players?: TacticalPlayer[];
  cones?: TacticalCone[];
  pikes?: TacticalPike[];
  balls?: TacticalBall[];
  miniGoals?: TacticalMiniGoal[];
  arrows?: TacticalArrow[];
  zones?: TacticalZone[];
  description?: string;
}

// ── Ejercicio Extendido ────────────────────────────────────
export interface Ejercicio {
  id: string;
  club_id: string;
  nombre: string;
  tipo: string;
  objetivo_tecnico: string[];
  objetivo_tactico: string[];
  categoria_edad: CategoriaEdad[];
  age_category?: FootballCategory;
  microcycle_day?: MicrocycleDay;
  game_phase?: GamePhase;
  drill_structure?: DrillStructure;
  min_players?: number;
  max_players?: number;
  intensity_level?: number;
  tactical_board_data?: TacticalBoardData;
  duracion_recomendada: number | null;
  material: string[];
  descripcion: string | null;
  variantes: string[];
  puntos_entrenamiento: string | null;
  imagen_url: string | null;
  video_url: string | null;
  tags: string[];
  dificultad: number;
  created_at: string;
}

export interface DrillSearchResult extends Ejercicio {
  similarity?: number;
}

export interface SesionEjercicio {
  id: string;
  session_id: string;
  ejercicio_id: string;
  orden: number;
  duracion_bloque: number | null;
  created_at: string;
  ejercicio?: Ejercicio;
}

export interface SessionDrill {
  id: string;
  session_id: string;
  drill_id: string;
  phase: 'warmup' | 'main_1' | 'main_2' | 'cooldown';
  order_index: number;
  duration_min: number;
  sets: number;
  notes?: string;
  created_at: string;
  drill?: Ejercicio;
}

export interface GeneratedTrainingSession {
  title: string;
  ageCategory: FootballCategory;
  microcycleDay: MicrocycleDay;
  totalDuration: number;
  intensityLoad: 1 | 2 | 3 | 4 | 5;
  teamId?: string;
  coachNotes?: string;
  objectives: string[];
  drills: GeneratedDrill[];
}

export interface GeneratedDrill {
  nombre: string;
  descripcion: string;
  phase: 'warmup' | 'main_1' | 'main_2' | 'cooldown';
  duration_min: number;
  sets: number;
  players: number;
  intensity: number;
  material: string[];
  tactical_board_data: TacticalBoardData;
  objetivos: string[];
  variantes?: string[];
  existing_drill_id?: string;
}
