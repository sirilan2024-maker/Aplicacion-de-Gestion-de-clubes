import { z } from 'zod';

const clampX = z.union([z.number(), z.string()]).transform((v) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return 50;
  return Math.max(0, Math.min(100, n));
});

const clampY = z.union([z.number(), z.string()]).transform((v) => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (isNaN(n)) return 35;
  if (n > 70) return Math.min(68, (n * 70) / 100);
  return Math.max(0, Math.min(70, n));
});

export const TacticalPlayerSchema = z.object({
  id: z.string().optional().default(() => Math.random().toString(36).slice(2, 7)),
  x: clampX,
  y: clampY,
  team: z.enum(['blue', 'red', 'yellow', 'white', 'green', 'orange']).catch('blue'),
  label: z.string().optional(),
  shape: z.enum(['circle', 'square']).optional(),
});

export const TacticalArrowSchema = z.object({
  id: z.string().optional().default(() => Math.random().toString(36).slice(2, 7)),
  fromX: clampX,
  fromY: clampY,
  toX: clampX,
  toY: clampY,
  type: z.enum(['pass', 'movement', 'dribble']).catch('pass'),
  curved: z.boolean().optional(),
});

export const TacticalBoardDataSchema = z.object({
  pitchType: z.enum(['full', 'half', 'third']).catch('half').default('half'),
  players: z.array(TacticalPlayerSchema).optional().default([]),
  cones: z.array(z.object({
    id: z.string().optional().default(() => Math.random().toString(36).slice(2, 7)),
    x: clampX,
    y: clampY,
    color: z.string().optional().default('orange')
  })).optional().default([]),
  pikes: z.array(z.object({
    id: z.string().optional().default(() => Math.random().toString(36).slice(2, 7)),
    x: clampX,
    y: clampY
  })).optional().default([]),
  balls: z.array(z.object({
    id: z.string().optional().default(() => Math.random().toString(36).slice(2, 7)),
    x: clampX,
    y: clampY
  })).optional().default([]),
  miniGoals: z.array(z.object({
    id: z.string().optional().default(() => Math.random().toString(36).slice(2, 7)),
    x: clampX,
    y: clampY,
    rotation: z.number().optional().default(0)
  })).optional().default([]),
  arrows: z.array(TacticalArrowSchema).optional().default([]),
  zones: z.array(z.object({
    id: z.string().optional().default(() => Math.random().toString(36).slice(2, 7)),
    x: clampX,
    y: clampY,
    width: z.number().optional().default(30),
    height: z.number().optional().default(30),
    color: z.string().optional().default('#3b82f6'),
    opacity: z.number().optional().default(0.12),
    label: z.string().optional(),
  })).optional().default([]),
  description: z.string().optional(),
});

export const GeneratedDrillSchema = z.object({
  nombre: z.string().min(1).catch('Tarea de Entrenamiento'),
  descripcion: z.string().catch(''),
  phase: z.enum(['warmup', 'main_1', 'main_2', 'cooldown']).catch('main_1'),
  duration_min: z.number().min(1).max(120).catch(15),
  sets: z.number().min(1).max(20).catch(3),
  players: z.number().min(1).max(40).catch(14),
  intensity: z.number().min(1).max(5).catch(3),
  material: z.array(z.string()).optional().default([]),
  tactical_board_data: TacticalBoardDataSchema.optional(),
  objetivos: z.array(z.string()).optional().default([]),
  variantes: z.array(z.string()).optional().default([]),
  existing_drill_id: z.string().uuid().optional(),
});

export const SaveTrainingSessionSchema = z.object({
  teamId: z.string().min(1, 'ID de equipo requerido'),
  title: z.string().min(1, 'El título es obligatorio'),
  date: z.string().catch(() => new Date().toISOString()),
  ageCategory: z.enum(['querubin', 'prebenjamin', 'benjamin', 'alevin', 'infantil', 'cadete', 'juvenil', 'senior']).catch('senior'),
  microcycleDay: z.enum(['MD_plus_1', 'MD_minus_4', 'MD_minus_3', 'MD_minus_2', 'MD_minus_1', 'MD', 'REST']).catch('MD_minus_3'),
  totalDuration: z.number().min(10).max(240).catch(75),
  intensityLoad: z.number().min(1).max(5).catch(3),
  coachNotes: z.string().optional(),
  objectives: z.array(z.string()).optional().default([]),
  drills: z.array(GeneratedDrillSchema).min(1, 'La sesión debe tener al menos un ejercicio'),
});

export type SaveTrainingSessionInput = z.infer<typeof SaveTrainingSessionSchema>;
