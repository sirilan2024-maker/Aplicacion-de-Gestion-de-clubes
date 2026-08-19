'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ─── HELPERS ────────────────────────────────────────────────────────────────

async function getClubAndRole() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');
  const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single();
  if (!profile?.club_id) throw new Error('Sin club asignado');
  return { supabase, user, profile, clubId: profile.club_id };
}

function requireMethodologyRole(role: string) {
  const allowed = ['admin', 'metodologo', 'coordinador'];
  if (!allowed.includes(role)) throw new Error('Sin permisos para esta acción');
}

// ─── CURRÍCULO ───────────────────────────────────────────────────────────────

export async function getCurriculum(categoryCode?: string) {
  const { supabase, clubId } = await getClubAndRole();
  let query = supabase
    .from('methodology_curriculum')
    .select('*')
    .eq('club_id', clubId)
    .order('sort_order');
  if (categoryCode) query = query.eq('category_code', categoryCode);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertCurriculum(data: {
  category_code: string;
  category_label: string;
  age_min?: number;
  age_max?: number;
  philosophy_text?: string;
  objectives?: string[];
  priority_families?: string[];
  color?: string;
  sort_order?: number;
}) {
  const { supabase, profile, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);
  
  const { error } = await supabase
    .from('methodology_curriculum')
    .upsert({ ...data, club_id: clubId }, { onConflict: 'club_id,category_code' });
  
  if (error) throw new Error(error.message);
  revalidatePath('/admin/metodologia/curriculo');
  return { success: true };
}

// ─── PRINCIPIOS ──────────────────────────────────────────────────────────────

export async function getPrinciples(curriculumId: string) {
  const { supabase } = await getClubAndRole();
  const { data, error } = await supabase
    .from('methodology_principles')
    .select(`
      *,
      methodology_subprinciples (
        *,
        methodology_behaviours (*)
      )
    `)
    .eq('curriculum_id', curriculumId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createPrinciple(data: {
  curriculum_id: string;
  name: string;
  game_phase: string;
  description?: string;
  sort_order?: number;
}) {
  const { supabase, profile, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);
  const { error } = await supabase.from('methodology_principles').insert({ ...data, club_id: clubId });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/metodologia/principios');
  return { success: true };
}

export async function createSubprinciple(data: {
  principle_id: string;
  name: string;
  description?: string;
  sort_order?: number;
}) {
  const { supabase, profile, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);
  const { error } = await supabase.from('methodology_subprinciples').insert({ ...data, club_id: clubId });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/metodologia/principios');
  return { success: true };
}

export async function createBehaviour(data: {
  subprinciple_id: string;
  description: string;
  age_categories?: string[];
  performance_indicators?: string[];
}) {
  const { supabase, profile, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);
  const { error } = await supabase.from('methodology_behaviours').insert({ ...data, club_id: clubId });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/metodologia/principios');
  return { success: true };
}

// ─── MACROCICLOS ─────────────────────────────────────────────────────────────

export async function getMacrocycles(teamId?: string) {
  const { supabase, clubId } = await getClubAndRole();
  let query = supabase
    .from('macrocycles')
    .select('*, seasons(id, name), teams(id, name, category)')
    .eq('club_id', clubId)
    .order('start_date', { ascending: false });
  if (teamId) query = query.eq('team_id', teamId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createMacrocycle(data: {
  name: string;
  phase_type: string;
  start_date: string;
  end_date: string;
  season_id?: string;
  team_id?: string;
  objectives?: string[];
  notes?: string;
}) {
  const { supabase, profile, user, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);
  const { error } = await supabase.from('macrocycles').insert({
    ...data,
    club_id: clubId,
    created_by: user.id
  });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/metodologia/planificacion');
  return { success: true };
}

// ─── MESOCICLOS ──────────────────────────────────────────────────────────────

export async function getMesocycles(macrocycleId: string) {
  const { supabase } = await getClubAndRole();
  const { data, error } = await supabase
    .from('mesocycles')
    .select('*')
    .eq('macrocycle_id', macrocycleId)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createMesocycle(data: {
  macrocycle_id: string;
  name: string;
  focus_phase: string;
  start_date: string;
  end_date: string;
  weekly_load_target?: number;
  objectives?: string[];
  sort_order?: number;
}) {
  const { supabase, profile, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);
  const { error } = await supabase.from('mesocycles').insert({ ...data, club_id: clubId });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/metodologia/planificacion');
  return { success: true };
}

// ─── MICROCICLOS ─────────────────────────────────────────────────────────────

export async function getMicrocycles(mesocycleId: string) {
  const { supabase } = await getClubAndRole();
  const { data, error } = await supabase
    .from('microcycles')
    .select('*, training_sessions(id, date_time, duration_minutes, objective, intensity_load)')
    .eq('mesocycle_id', mesocycleId)
    .order('week_start_date');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createMicrocycle(data: {
  mesocycle_id?: string;
  team_id: string;
  week_start_date: string;
  match_day_date?: string;
  match_opponent?: string;
  weekly_load_index?: number;
  objective?: string;
  notes?: string;
}) {
  const { supabase, profile, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);
  const { data: inserted, error } = await supabase
    .from('microcycles')
    .insert({ ...data, club_id: clubId })
    .select()
    .single();
  if (error) throw new Error(error.message);
  revalidatePath('/admin/metodologia/planificacion');
  return inserted;
}

// ─── SESIONES ────────────────────────────────────────────────────────────────

export async function getSessions(filters?: { teamId?: string; from?: string; to?: string }) {
  const { supabase, clubId } = await getClubAndRole();
  let query = supabase
    .from('training_sessions')
    .select(`
      *,
      teams(id, name, category),
      session_drills(id)
    `)
    .eq('club_id', clubId)
    .order('date_time', { ascending: false });
  
  if (filters?.teamId) query = query.eq('team_id', filters.teamId);
  if (filters?.from) query = query.gte('date_time', filters.from);
  if (filters?.to) query = query.lte('date_time', filters.to);
  
  const { data, error } = await query.limit(50);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createSession(data: {
  team_id: string;
  date_time: string;
  duration_minutes: number;
  location?: string;
  age_category?: string;
  microcycle_day?: string;
  intensity_load?: number;
  objective?: string;
  objectives_secondary?: string[];
  num_players?: number;
  num_goalkeepers?: number;
  available_space?: string;
  available_material?: string[];
  coach_notes?: string;
  microcycle_id?: string;
  season_id?: string;
  drills?: Array<{
    drill_id: string;
    phase: string;
    order_index: number;
    duration_min: number;
    sets?: number;
    notes?: string;
  }>;
}) {
  const { supabase, profile } = await getClubAndRole();
  requireMethodologyRole(profile.role);
  
  const { drills, ...sessionData } = data;
  
  const { data: session, error: sessionError } = await supabase
    .from('training_sessions')
    .insert(sessionData)
    .select()
    .single();
  
  if (sessionError) throw new Error(sessionError.message);
  
  if (drills && drills.length > 0) {
    const drillInserts = drills.map(d => ({ ...d, session_id: session.id }));
    const { error: drillError } = await supabase.from('session_drills').insert(drillInserts);
    if (drillError) throw new Error(drillError.message);
  }
  
  revalidatePath('/admin/metodologia/sesiones');
  return session;
}

// ─── EJERCICIOS ──────────────────────────────────────────────────────────────

export async function getExercises(filters?: {
  category?: string;
  tipo?: string;
  gamePhase?: string;
  dificultad?: number;
  search?: string;
  bloqueSession?: string;
  minPlayers?: number;
  maxPlayers?: number;
}) {
  const { supabase, clubId } = await getClubAndRole();
  
  let query = supabase
    .from('banco_ejercicios')
    .select('*')
    .eq('club_id', clubId)
    .order('nombre');
  
  if (filters?.category) query = query.or(`age_category.eq.${filters.category},categoria_edad.cs.{${filters.category}}`);
  if (filters?.tipo) query = query.eq('tipo', filters.tipo);
  if (filters?.gamePhase) query = query.eq('game_phase', filters.gamePhase);
  if (filters?.dificultad) query = query.eq('dificultad', filters.dificultad);
  if (filters?.bloqueSession) query = query.eq('bloque_sesion', filters.bloqueSession);
  if (filters?.search) query = query.or(`nombre.ilike.%${filters.search}%,descripcion.ilike.%${filters.search}%`);
  
  const { data, error } = await query.limit(100);
  if (error) throw new Error(error.message);
  return data || [];
}

export async function createExercise(data: {
  nombre: string;
  tipo: string;
  descripcion?: string;
  correcciones?: string;
  objetivo_tecnico?: string[];
  objetivo_tactico?: string[];
  categoria_edad?: string[];
  age_category?: string;
  dificultad?: number;
  duracion_recomendada?: number;
  min_players?: number;
  max_players?: number;
  material?: string[];
  variantes?: string[];
  tags?: string[];
  bloque_sesion?: string;
  carga_fisica?: number;
  carga_cognitiva?: number;
  oposicion?: number;
  representatividad?: number;
  intensity_level?: number;
  game_phase?: string;
  espacio?: string;
  criterios_exito?: string[];
}) {
  const { supabase, profile, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);
  const { error } = await supabase.from('banco_ejercicios').insert({ ...data, club_id: clubId });
  if (error) throw new Error(error.message);
  revalidatePath('/admin/metodologia/biblioteca');
  return { success: true };
}

// ─── EVALUACIÓN ──────────────────────────────────────────────────────────────

export async function getEvaluationModules() {
  const { supabase } = await getClubAndRole();
  const { data, error } = await supabase
    .from('evaluation_modules')
    .select('*, evaluation_concepts(*)')
    .eq('is_active', true)
    .order('display_order');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function getPlayerEvaluations(playerId: string) {
  const { supabase } = await getClubAndRole();
  const { data, error } = await supabase
    .from('player_evaluations')
    .select(`
      *,
      evaluation_items (*, evaluation_concepts(name, module_id))
    `)
    .eq('player_id', playerId)
    .order('evaluation_date', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function savePlayerEvaluation(data: {
  player_id: string;
  evaluation_period: string;
  general_feedback?: string;
  strengths?: string;
  areas_for_improvement?: string;
  items: Array<{ concept_id: string; score: number; coach_notes?: string }>;
}) {
  const { supabase, user, profile } = await getClubAndRole();
  requireMethodologyRole(profile.role);
  const { items, ...evalData } = data;
  
  const { data: evaluation, error: evalError } = await supabase
    .from('player_evaluations')
    .insert({ ...evalData, evaluator_id: user.id, evaluation_date: new Date().toISOString().split('T')[0] })
    .select()
    .single();
  
  if (evalError) throw new Error(evalError.message);
  
  if (items.length > 0) {
    const itemInserts = items.map(i => ({ ...i, evaluation_id: evaluation.id }));
    const { error: itemError } = await supabase.from('evaluation_items').insert(itemInserts);
    if (itemError) throw new Error(itemError.message);
  }
  
  revalidatePath('/admin/metodologia/evaluacion');
  return evaluation;
}

// ─── OBJETIVOS ───────────────────────────────────────────────────────────────

export async function getPlayerObjectives(playerId: string, seasonId?: string) {
  const { supabase } = await getClubAndRole();
  let query = supabase
    .from('player_objectives')
    .select('*')
    .eq('player_id', playerId)
    .order('created_at', { ascending: false });
  if (seasonId) query = query.eq('season_id', seasonId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertPlayerObjective(data: {
  id?: string;
  player_id: string;
  season_id?: string;
  objective_type: string;
  description: string;
  target_date?: string;
  status?: string;
  progress_notes?: string;
}) {
  const { supabase, user, profile, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);
  const { id, ...rest } = data;
  
  if (id) {
    const { error } = await supabase
      .from('player_objectives')
      .update({ ...rest, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('player_objectives')
      .insert({ ...rest, club_id: clubId, coach_id: user.id });
    if (error) throw new Error(error.message);
  }
  
  revalidatePath('/admin/metodologia/jugadores');
  return { success: true };
}

export async function getTeamObjectives(teamId: string) {
  const { supabase } = await getClubAndRole();
  const { data, error } = await supabase
    .from('team_objectives')
    .select('*')
    .eq('team_id', teamId)
    .order('priority');
  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertTeamObjective(data: {
  id?: string;
  team_id: string;
  season_id?: string;
  objective_type: string;
  description: string;
  status?: string;
  priority?: number;
}) {
  const { supabase, profile, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);
  const { id, ...rest } = data;
  
  if (id) {
    const { error } = await supabase.from('team_objectives').update(rest).eq('id', id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from('team_objectives').insert({ ...rest, club_id: clubId });
    if (error) throw new Error(error.message);
  }
  
  revalidatePath('/admin/metodologia');
  return { success: true };
}

// ─── BANCO DE EJERCICIOS & IMPORTACIÓN ──────────────────────────────────────────

export async function importExerciseBatchAction(items: any[]) {
  const { supabase, profile, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);

  // Consultar ejercicios existentes para detección de duplicados
  const { data: existing } = await supabase
    .from('banco_ejercicios')
    .select('id, nombre')
    .eq('club_id', clubId);

  // Validación estricta mediante el motor
  const { validateExerciseBatch } = await import('@/lib/methodology/exerciseValidationEngine');
  const validation = validateExerciseBatch(items, existing || []);

  if (validation.validCount === 0 && validation.invalidCount > 0) {
    throw new Error(`Ningún ejercicio superó la validación. Errores detectados: ${validation.errors.map(e => `${e.name}: ${e.errors.join(', ')}`).join(' | ')}`);
  }

  // Preparar inserción con club_id y estado is_verified=false por defecto para candidatos
  const toInsert = validation.validExercises.map(ex => ({
    ...ex,
    club_id: clubId,
    is_verified: ex.is_verified ?? false
  }));

  const { data: inserted, error } = await supabase
    .from('banco_ejercicios')
    .insert(toInsert)
    .select('id, nombre, is_verified');

  if (error) throw new Error(error.message);

  revalidatePath('/admin/metodologia/biblioteca');
  return {
    success: true,
    insertedCount: inserted?.length || 0,
    invalidCount: validation.invalidCount,
    errors: validation.errors,
    duplicateWarnings: validation.duplicateWarnings
  };
}

export async function verifyExerciseAction(exerciseId: string, isVerified: boolean = true) {
  const { supabase, profile, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);

  const { error } = await supabase
    .from('banco_ejercicios')
    .update({ is_verified: isVerified })
    .eq('id', exerciseId)
    .eq('club_id', clubId);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/metodologia/biblioteca');
  return { success: true };
}

export async function deleteExerciseAction(exerciseId: string) {
  const { supabase, profile, clubId } = await getClubAndRole();
  requireMethodologyRole(profile.role);

  const { error } = await supabase
    .from('banco_ejercicios')
    .delete()
    .eq('id', exerciseId)
    .eq('club_id', clubId);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/metodologia/biblioteca');
  return { success: true };
}

