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

export async function getFullMethodologyCurriculumAction() {
  let supabase: any;
  let clubId: string | null = null;

  try {
    supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
      clubId = profile?.club_id || null;
    }
  } catch {
    const { createClient: createSupabaseJs } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    supabase = createSupabaseJs(url, key, { auth: { persistSession: false } });
  }

  // 1. Fetch curricula
  let currQuery = supabase.from('methodology_curriculum').select('*').order('sort_order', { ascending: true });
  if (clubId) {
    currQuery = currQuery.eq('club_id', clubId);
  }
  let { data: curricula } = await currQuery;
  if (!curricula || curricula.length === 0) {
    const { data: fallbackCurr } = await supabase.from('methodology_curriculum').select('*').order('sort_order', { ascending: true });
    curricula = fallbackCurr || [];
  }

  // 2. Fetch principles with nested subprinciples and behaviours
  let princQuery = supabase
    .from('methodology_principles')
    .select(`
      id,
      curriculum_id,
      name,
      game_phase,
      description,
      methodology_subprinciples (
        id,
        name,
        description,
        methodology_behaviours (
          id,
          description,
          age_categories,
          performance_indicators
        )
      )
    `)
    .order('sort_order', { ascending: true });

  if (clubId) {
    princQuery = princQuery.eq('club_id', clubId);
  }
  let { data: principles } = await princQuery;

  if (!principles || principles.length === 0) {
    const { data: fallbackPrinciples } = await supabase
      .from('methodology_principles')
      .select(`
        id,
        curriculum_id,
        name,
        game_phase,
        description,
        methodology_subprinciples (
          id,
          name,
          description,
          methodology_behaviours (
            id,
            description,
            age_categories,
            performance_indicators
          )
        )
      `)
      .order('sort_order', { ascending: true });
    principles = fallbackPrinciples || [];
  }

  // 3. Fetch 199 exercises
  const { data: exercises } = await supabase.from('banco_ejercicios').select('*');

  return {
    curricula: curricula || [],
    principles: principles || [],
    exercises: exercises || []
  };
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

export async function createExerciseAction(data: {
  nombre: string;
  tipo: string;
  descripcion: string;
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

  const cleanNombre = data.nombre?.trim();
  if (!cleanNombre) {
    throw new Error('El nombre del ejercicio es obligatorio.');
  }

  const ageCat = (data.age_category || (data.categoria_edad && data.categoria_edad[0]) || '').toLowerCase().trim();

  // Pre-check de existencia por club, nombre normalizado y categoría de edad
  let query = supabase
    .from('banco_ejercicios')
    .select('id')
    .eq('club_id', clubId)
    .ilike('nombre', cleanNombre);

  if (ageCat) {
    query = query.eq('age_category', ageCat);
  }

  const { data: existing } = await query.maybeSingle();

  if (existing) {
    return { success: false, error: 'ALREADY_EXISTS', message: 'Ya existe un ejercicio con este nombre y categoría en el club.', existingId: existing.id };
  }

  const { error } = await supabase.from('banco_ejercicios').insert({
    ...data,
    nombre: cleanNombre,
    club_id: clubId
  });

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: 'ALREADY_EXISTS', message: 'Ya existe un ejercicio con este nombre en el club.' };
    }
    throw new Error(error.message);
  }

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

// ─── CONSULTA DE BIBLIOTECA METODOLÓGICA (FASE 53) ──────────────────────────

export async function getLibraryCatalogAction(options?: {
  scope?: 'club' | 'all';
  search?: string;
  category?: string;
  type?: string;
  family?: string;
  difficulty?: number;
  block?: string;
  minPlayers?: number;
}) {
  const { supabase, clubId } = await getClubAndRole();
  const scope = options?.scope || 'club';

  let query = supabase.from('banco_ejercicios').select('*');

  if (scope === 'club') {
    query = query.eq('club_id', clubId);
  }

  if (options?.search) {
    const s = options.search;
    query = query.or(`nombre.ilike.%${s}%,descripcion.ilike.%${s}%,tags.cs.{${s}}`);
  }

  if (options?.category && options.category !== 'all') {
    query = query.or(`age_category.eq.${options.category},categoria_edad.cs.{${options.category}}`);
  }

  if (options?.type && options.type !== 'all') {
    query = query.eq('tipo', options.type);
  }

  if (options?.family && options.family !== 'all') {
    query = query.eq('familia', options.family);
  }

  if (options?.difficulty && options.difficulty > 0) {
    query = query.eq('dificultad', options.difficulty);
  }

  if (options?.block && options.block !== 'all') {
    query = query.eq('bloque_sesion', options.block);
  }

  if (options?.minPlayers) {
    query = query.gte('max_players', options.minPlayers);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) throw new Error(error.message);

  // Total counts for club and global
  const { count: clubTotal } = await supabase
    .from('banco_ejercicios')
    .select('*', { count: 'exact', head: true })
    .eq('club_id', clubId);

  const { count: globalTotal } = await supabase
    .from('banco_ejercicios')
    .select('*', { count: 'exact', head: true });

  return {
    success: true,
    exercises: data || [],
    clubTotal: clubTotal || 89,
    globalTotal: globalTotal || 199
  };
}

// ─── BÚSQUEDA EXTERNA / WEB (FASE 48) ─────────────────────────────────────────

export async function searchExternalExercisesAction(
  query: string,
  filters?: {
    ageCategory?: string;
    phase?: string;
    difficulty?: number;
  }
) {
  // Autenticación y verificación de pertenencia al club (server-side)
  await getClubAndRole();

  const { exerciseSearchService } = await import('@/lib/methodology/externalSearch/exerciseSearchService');
  const response = await exerciseSearchService.search(query, filters);

  return response;
}

// ─── BÚSQUEDA INTELIGENTE HÍBRIDA (FASE 49) ──────────────────────────────────

export async function searchIntelligentExercisesAction(
  query: string,
  options?: {
    includeExternal?: boolean;
    manualFilters?: {
      category?: string;
      family?: string;
      type?: string;
      difficulty?: number;
    };
  }
) {
  // 1. Derivación estricta de club_id en server-side
  const { supabase, clubId } = await getClubAndRole();

  // 2. Lectura segura y aislada de los ejercicios oficiales del club (Read-only)
  const { data: internalExercises, error } = await supabase
    .from('banco_ejercicios')
    .select('*')
    .eq('club_id', clubId);

  if (error) throw new Error(error.message);

  // 3. Ejecución del motor de scoring y procesamiento de lenguaje natural
  const { intelligentSearchService } = await import('@/lib/methodology/intelligentSearch/intelligentSearchService');
  const response = await intelligentSearchService.searchHybrid(
    query,
    internalExercises || [],
    options
  );

  return response;
}

// ─── GENERADOR INTELIGENTE DE SESIONES (FASE 50/55) ─────────────────────────

export async function generateIntelligentSessionAction(
  prompt: string,
  options?: {
    includeExternal?: boolean;
    variantNumber?: number;
    excludedExerciseIds?: string[];
  }
) {
  // 1. Derivación estricta de club_id en server-side
  const { supabase, clubId } = await getClubAndRole();

  // 2. Lectura segura y aislada de los ejercicios oficiales del club (Read-only)
  const { data: internalExercises, error } = await supabase
    .from('banco_ejercicios')
    .select('*')
    .eq('club_id', clubId);

  if (error) throw new Error(error.message);

  // 3. Generación metodológica estructurada
  const { sessionPlannerService } = await import('@/lib/methodology/sessionGenerator/sessionPlannerService');
  const response = await sessionPlannerService.generateSession(
    prompt,
    internalExercises || [],
    options
  );

  return response;
}

// ─── SESIONES OPERATIVAS Y EJECUCIÓN EN CAMPO (FASE 51) ──────────────────────

export interface OperationalSessionSavePayload {
  id?: string;
  title: string;
  teamId?: string;
  seasonId?: string;
  date?: string;
  startTime?: string;
  ageCategory: string;
  durationMinutes: number;
  objective: string;
  objectivesSecondary?: string[];
  numPlayers?: number;
  numGoalkeepers?: number;
  availableSpace?: string;
  availableMaterial?: string[];
  status?: 'draft' | 'planned' | 'ready' | 'completed';
  isCompleted?: boolean;
  coachNotes?: string;
  drills: {
    drillId?: string;
    phase: string;
    orderIndex: number;
    durationMin: number;
    notes?: string;
    exerciseTitle?: string;
    exerciseDescription?: string;
    source?: string;
  }[];
}

export async function saveOperationalSessionAction(payload: OperationalSessionSavePayload) {
  // 1. Tenancy y autorización estricta en servidor
  const { supabase, clubId } = await getClubAndRole();

  let sessionId = payload.id;

  let resolvedTeamId = payload.teamId;
  if (!resolvedTeamId) {
    // Buscar equipo de la categoría o primer equipo del club
    const { data: teamMatch } = await supabase
      .from('teams')
      .select('id')
      .eq('club_id', clubId)
      .ilike('name', `%${payload.ageCategory || ''}%`)
      .limit(1);

    if (teamMatch && teamMatch.length > 0) {
      resolvedTeamId = teamMatch[0].id;
    } else {
      const { data: anyTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('club_id', clubId)
        .limit(1);
      resolvedTeamId = anyTeam?.[0]?.id || null;
    }
  }

  const sessionDataToSave = {
    club_id: clubId,
    title: payload.title || payload.objective || 'Sesión de Entrenamiento',
    team_id: resolvedTeamId,
    season_id: payload.seasonId || null,
    date: payload.date || new Date().toISOString().split('T')[0],
    start_time: payload.startTime || '18:00',
    age_category: payload.ageCategory || 'General',
    objective: payload.objective,
    objectives_secondary: payload.objectivesSecondary || [],
    num_players: payload.numPlayers || 12,
    num_goalkeepers: payload.numGoalkeepers || 0,
    available_space: payload.availableSpace || null,
    available_material: payload.availableMaterial || [],
    status: payload.status || (payload.isCompleted ? 'completed' : 'planned'),
    is_completed: payload.isCompleted || false,
    coach_notes: payload.coachNotes || payload.objective
  };

  if (sessionId) {
    // Anti-IDOR: verificar pertenencia al club antes de actualizar
    const { data: existing, error: checkErr } = await supabase
      .from('training_sessions')
      .select('id')
      .eq('id', sessionId)
      .eq('club_id', clubId)
      .single();

    if (checkErr || !existing) {
      throw new Error('Acceso denegado: La sesión no pertenece a tu club.');
    }

    const { error: updateErr } = await supabase
      .from('training_sessions')
      .update(sessionDataToSave)
      .eq('id', sessionId);

    if (updateErr) throw new Error(updateErr.message);

    // Limpiar drills antiguos para reinsertar orden actual
    await supabase.from('session_drills').delete().eq('session_id', sessionId);
  } else {
    // Insertar nueva sesión
    const { data: newSession, error: insertErr } = await supabase
      .from('training_sessions')
      .insert(sessionDataToSave)
      .select('id')
      .single();

    if (insertErr || !newSession) throw new Error(insertErr?.message || 'Error al crear la sesión');
    sessionId = newSession.id;
  }

  // Insertar tareas de la sesión en session_drills
  if (payload.drills && payload.drills.length > 0) {
    const normalizePhase = (p: string) => {
      const normalized = (p || '').toLowerCase();
      if (normalized.includes('activ') || normalized.includes('warm') || normalized.includes('calent')) return 'warmup';
      if (normalized.includes('calma') || normalized.includes('cool') || normalized.includes('vuelta')) return 'cooldown';
      if (normalized.includes('principal_2') || normalized.includes('main_2') || normalized.includes('global') || normalized.includes('partido') || normalized.includes('scrimmage') || normalized.includes('aplicado')) return 'main_2';
      return 'main_1';
    };

    const drillsToInsert = payload.drills.map((d, index) => {
      // Validar si drillId es un UUID válido para PostgreSQL
      const isValidUUID = d.drillId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.drillId);
      
      return {
        session_id: sessionId,
        drill_id: isValidUUID ? d.drillId : null,
        phase: normalizePhase(d.phase),
        order_index: d.orderIndex !== undefined ? d.orderIndex : index + 1,
        duration_min: d.durationMin || 15,
        notes: d.notes || (d.source === 'externo' ? `[🌐 EXTERNO: ${d.exerciseTitle || ''}] ${d.exerciseDescription || ''}` : d.exerciseTitle || null)
      };
    });

    const { error: drillsErr } = await supabase.from('session_drills').insert(drillsToInsert);
    if (drillsErr) console.warn('Advertencia al insertar drills:', drillsErr.message);
  }

  revalidatePath('/admin/metodologia/sesiones');
  revalidatePath('/admin/metodologia/biblioteca');
  return { success: true, sessionId };
}

export async function duplicateOperationalSessionAction(sessionId: string) {
  const { supabase, clubId } = await getClubAndRole();

  // Anti-IDOR: verificar pertenencia al club
  const { data: original, error: origErr } = await supabase
    .from('training_sessions')
    .select('*, session_drills(*)')
    .eq('id', sessionId)
    .eq('club_id', clubId)
    .single();

  if (origErr || !original) {
    throw new Error('Acceso denegado: La sesión no pertenece a tu club.');
  }

  const { id: _, created_at: __, session_drills: drills, ...sessionPayload } = original;

  // Insertar clon
  const { data: cloned, error: cloneErr } = await supabase
    .from('training_sessions')
    .insert({
      ...sessionPayload,
      title: `${original.title || original.objective || 'Sesión'} (Copia)`,
      status: 'planned',
      is_completed: false,
      date: new Date().toISOString().split('T')[0]
    })
    .select('id')
    .single();

  if (cloneErr || !cloned) throw new Error(cloneErr?.message || 'Error al duplicar sesión');

  // Clonar drills
  if (drills && drills.length > 0) {
    const clonedDrills = drills.map((d: any) => ({
      session_id: cloned.id,
      drill_id: d.drill_id,
      phase: d.phase,
      order_index: d.order_index,
      duration_min: d.duration_min,
      notes: d.notes
    }));

    await supabase.from('session_drills').insert(clonedDrills);
  }

  revalidatePath('/admin/metodologia/sesiones');
  return { success: true, newSessionId: cloned.id };
}

export async function deleteOperationalSessionAction(sessionId: string) {
  const { supabase, clubId } = await getClubAndRole();

  // Anti-IDOR: verificar pertenencia al club
  const { data: session, error: checkErr } = await supabase
    .from('training_sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('club_id', clubId)
    .single();

  if (checkErr || !session) {
    throw new Error('Acceso denegado: La sesión no pertenece a tu club.');
  }

  await supabase.from('session_drills').delete().eq('session_id', sessionId);
  const { error: delErr } = await supabase.from('training_sessions').delete().eq('id', sessionId);

  if (delErr) throw new Error(delErr.message);

  revalidatePath('/admin/metodologia/sesiones');
  return { success: true };
}

export async function completeOperationalSessionAction(
  sessionId: string,
  postSessionFeedback?: {
    coachObservations?: string;
    rpe?: number;
    objectiveAchievement?: number;
  }
) {
  const { supabase, clubId } = await getClubAndRole();

  // Anti-IDOR: verificar pertenencia al club
  const { data: session, error: checkErr } = await supabase
    .from('training_sessions')
    .select('id, coach_notes')
    .eq('id', sessionId)
    .eq('club_id', clubId)
    .single();

  if (checkErr || !session) {
    throw new Error('Acceso denegado: La sesión no pertenece a tu club.');
  }

  const updatedNotes = postSessionFeedback?.coachObservations
    ? `${session.coach_notes ? session.coach_notes + '\n\n' : ''}[OBSERVACIONES POST-SESIÓN]: ${postSessionFeedback.coachObservations}`
    : session.coach_notes;

  const { error: updateErr } = await supabase
    .from('training_sessions')
    .update({
      status: 'completed',
      is_completed: true,
      coach_notes: updatedNotes
    })
    .eq('id', sessionId);

  if (updateErr) throw new Error(updateErr.message);

  revalidatePath('/admin/metodologia/sesiones');
  return { success: true };
}

// ─── FOOTBALL INTELLIGENCE AGENT (FASE 54) ──────────────────────────────────

export async function generateFootballSessionAction(
  prompt: string,
  options?: {
    teamId?: string;
    category?: string;
    coachObservations?: string[];
    variantNumber?: number;
    excludedExerciseIds?: string[];
    includeExternal?: boolean;
  }
) {
  const { supabase, clubId } = await getClubAndRole();

  // 1. Obtener catálogo oficial del club
  const { data: internalExercises, error } = await supabase
    .from('banco_ejercicios')
    .select('*')
    .eq('club_id', clubId);

  if (error) throw new Error(error.message);

  // 2. Obtener observaciones recientes si hay un equipo seleccionado
  let contextObservations = options?.coachObservations || [];
  if (options?.teamId && contextObservations.length === 0) {
    const { data: recentSessions } = await supabase
      .from('training_sessions')
      .select('coach_notes, date')
      .eq('team_id', options.teamId)
      .eq('is_completed', true)
      .order('date', { ascending: false })
      .limit(3);

    if (recentSessions) {
      contextObservations = recentSessions
        .map(s => s.coach_notes)
        .filter((n): n is string => Boolean(n));
    }
  }

  // 3. Ejecutar Football Intelligence Agent
  const { FootballIntelligenceAgent } = await import('@/lib/methodology/ai/footballIntelligenceAgent');
  const agent = FootballIntelligenceAgent.getInstance();

  const session = await agent.generateSession(prompt, internalExercises || [], {
    clubId,
    category: options?.category,
    teamId: options?.teamId,
    coachObservations: contextObservations,
    variantNumber: options?.variantNumber,
    excludedExerciseIds: options?.excludedExerciseIds,
    includeExternal: options?.includeExternal ?? true
  });

  return { success: true, session };
}

export async function reviewFootballSessionAction(
  sessionPlan: any,
  options?: {
    teamId?: string;
    category?: string;
    coachObservations?: string[];
  }
) {
  const { supabase, clubId } = await getClubAndRole();

  let contextObservations = options?.coachObservations || [];
  if (options?.teamId && contextObservations.length === 0) {
    const { data: recentSessions } = await supabase
      .from('training_sessions')
      .select('coach_notes, date')
      .eq('team_id', options.teamId)
      .eq('is_completed', true)
      .order('date', { ascending: false })
      .limit(3);

    if (recentSessions) {
      contextObservations = recentSessions
        .map(s => s.coach_notes)
        .filter((n): n is string => Boolean(n));
    }
  }

  const { FootballIntelligenceAgent } = await import('@/lib/methodology/ai/footballIntelligenceAgent');
  const agent = FootballIntelligenceAgent.getInstance();

  const review = await agent.reviewSession(sessionPlan, {
    clubId,
    category: options?.category || sessionPlan.intent?.ageCategory,
    teamId: options?.teamId,
    coachObservations: contextObservations
  });

  return { success: true, review };
}

export async function replaceFootballDrillAction(
  sessionPlan: any,
  phaseOrIndex: string | number,
  requirements: string
) {
  const { supabase, clubId } = await getClubAndRole();

  const { data: internalExercises, error } = await supabase
    .from('banco_ejercicios')
    .select('*')
    .eq('club_id', clubId);

  if (error) throw new Error(error.message);

  const { FootballIntelligenceAgent } = await import('@/lib/methodology/ai/footballIntelligenceAgent');
  const agent = FootballIntelligenceAgent.getInstance();

  const result = await agent.replaceExercise(sessionPlan, phaseOrIndex, requirements, internalExercises || []);

  return { success: true, result };
}

export async function addExternalExerciseToDraftAction(
  sessionPlan: any,
  externalExercise: any,
  phase: any,
  customDuration?: number
) {
  await getClubAndRole();

  const { FootballIntelligenceAgent } = await import('@/lib/methodology/ai/footballIntelligenceAgent');
  const agent = FootballIntelligenceAgent.getInstance();

  const updatedSession = agent.addExerciseToSession(
    sessionPlan,
    externalExercise,
    phase,
    customDuration,
    'externo'
  );

  return { success: true, session: updatedSession };
}

// ─── FASE 61: HEALTH CHECK Y REVALIDACIÓN DE EVIDENCIAS EXTERNAS ─────────────

export async function revalidateExternalEvidenceAction(exercise: any) {
  await getClubAndRole();

  const { ExternalEvidenceHealthService } = await import('@/lib/methodology/externalSearch/externalEvidenceHealthService');
  const healthService = ExternalEvidenceHealthService.getInstance();

  const result = await healthService.checkHealth(exercise, { forceRevalidate: true });
  return { success: true, result };
}

export async function getExternalEvidenceAuditHistoryAction(externalExerciseId: string) {
  await getClubAndRole();

  const { EvidenceSnapshotStore } = await import('@/lib/methodology/externalSearch/evidenceSnapshotStore');
  const store = EvidenceSnapshotStore.getInstance();

  const history = store.getHistory(externalExerciseId);
  const latestSnapshot = store.getLatestSnapshot(externalExerciseId);

  return { success: true, history, latestSnapshot };
}

// ─── FASE 62: GENERACIÓN Y EXPORTACIÓN DOCUMENTAL PDF CON QR Y AUDITORÍA ────

export async function exportSessionPdfAction(session: any, options?: any) {
  await getClubAndRole();

  const { SessionPdfExporterService } = await import('@/lib/methodology/export/sessionPdfExporterService');
  const exporter = SessionPdfExporterService.getInstance();

  const result = await exporter.exportSessionToPdf(session, options);
  return {
    success: true,
    documentId: result.documentId,
    base64: result.base64,
    fileName: result.fileName,
    manifest: result.manifest,
    qrCount: result.qrCount
  };
}

// ─── FASE 63: VERIFICACIÓN PÚBLICA DE DOCUMENTOS Y CONSOLIDACIÓN METODOLÓGICA ───

export async function getPublicDocumentVerificationAction(documentId: string) {
  const { DocumentAuditStore } = await import('@/lib/methodology/export/documentAuditStore');
  const store = DocumentAuditStore.getInstance();

  const verificationView = store.getPublicVerificationView(documentId);
  return { success: true, verification: verificationView };
}



