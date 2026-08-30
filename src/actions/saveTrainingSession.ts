'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SaveTrainingSessionSchema, type SaveTrainingSessionInput } from '@/lib/schemas/sessionSchema';
import type { FootballCategory, MicrocycleDay } from '@/types/microcycle';
import { generateDrillEmbedding } from '@/services/drillSearchService';

export type SaveSessionResult =
  | { success: true; sessionId: string }
  | { success: false; error: string };

export async function saveTrainingSessionAction(
  input: SaveTrainingSessionInput
): Promise<SaveSessionResult> {
  try {
    // 1. Validar con Zod autosanable
    const parsed = SaveTrainingSessionSchema.safeParse(input);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      return { success: false, error: `Validación: ${firstError.path.join('.')} — ${firstError.message}` };
    }

    const data = parsed.data;
    const adminClient = createAdminClient();

    // Obtener club_id del equipo o fallback al club principal
    const { data: teamData } = await adminClient
      .from('teams')
      .select('club_id')
      .eq('id', data.teamId)
      .single();

    let clubId = teamData?.club_id;
    if (!clubId) {
      const { data: defaultClub } = await adminClient
        .from('clubs')
        .select('id')
        .ilike('name', '%SPORTING SALADAR%')
        .limit(1)
        .single();
      clubId = defaultClub?.id;
    }
    if (!clubId) {
      const { data: firstClub } = await adminClient.from('clubs').select('id').limit(1).single();
      clubId = firstClub?.id;
    }

    if (!clubId) {
      return { success: false, error: 'No se encontró club registrado para esta sesión' };
    }

    // Formatear fecha y hora
    const dateObj = new Date(data.date);
    const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    const timeStr = '18:30:00';

    // 2. Insertar cabecera de sesión en training_sessions
    const { data: session, error: sessionError } = await adminClient
      .from('training_sessions')
      .insert({
        club_id: clubId,
        team_id: data.teamId,
        title: data.title,
        date: dateStr,
        start_time: timeStr,
        status: 'scheduled',
        age_category: data.ageCategory,
        microcycle_day: data.microcycleDay,
        intensity_load: data.intensityLoad,
        coach_notes: data.coachNotes || null,
      })
      .select('id')
      .single();

    if (sessionError || !session) {
      console.error('[SaveSession] Error insertando sesión:', sessionError);
      return { success: false, error: sessionError?.message || 'Error al crear la sesión' };
    }

    const sessionId = session.id;

    // 3. Procesar cada ejercicio
    for (let i = 0; i < data.drills.length; i++) {
      const drill = data.drills[i];
      let drillId = drill.existing_drill_id;

      // Si es una tarea nueva generada por la IA, insertarla en banco_ejercicios
      if (!drillId) {
        const { data: newDrill, error: drillError } = await adminClient
          .from('banco_ejercicios')
          .insert({
            club_id: clubId,
            nombre: drill.nombre,
            tipo: 'ia_generado',
            descripcion: drill.descripcion,
            age_category: data.ageCategory,
            microcycle_day: data.microcycleDay,
            min_players: drill.players,
            max_players: drill.players + 4,
            intensity_level: drill.intensity,
            duracion_recomendada: drill.duration_min,
            tactical_board_data: drill.tactical_board_data,
            objetivo_tecnico: drill.objetivos,
            objetivo_tactico: [],
            material: drill.material,
            variantes: drill.variantes || [],
            tags: [data.ageCategory, data.microcycleDay, 'ia_generado'],
            dificultad: drill.intensity,
            categoria_edad: [data.ageCategory],
          })
          .select('id')
          .single();

        if (!drillError && newDrill) {
          drillId = newDrill.id;

          // Generar embedding en background
          const embeddingText = `${drill.nombre} ${drill.descripcion} ${drill.objetivos.join(' ')}`;
          generateDrillEmbedding(embeddingText).then(async (embedding) => {
            if (embedding) {
              await adminClient
                .from('banco_ejercicios')
                .update({ embedding: JSON.stringify(embedding) })
                .eq('id', drillId!);
            }
          }).catch(() => {});
        }
      }

      if (!drillId) continue;

      // 4. Vincular el ejercicio con la sesión en session_drills
      await adminClient.from('session_drills').insert({
        session_id: sessionId,
        drill_id: drillId,
        phase: drill.phase,
        order_index: i + 1,
        duration_min: drill.duration_min,
        sets: drill.sets,
        notes: drill.objetivos.join(', '),
      });

      // 5. También insertar en sesiones_ejercicios (compatibilidad con tabla legacy)
      void adminClient.from('sesiones_ejercicios').insert({
        session_id: sessionId,
        ejercicio_id: drillId,
        orden: i + 1,
        duracion_bloque: drill.duration_min,
      });
    }

    // 6. Revalidar cachés
    revalidatePath('/dashboard/training');
    revalidatePath(`/dashboard/equipos/${data.teamId}/banco-tareas`);
    revalidatePath(`/dashboard/equipos/${data.teamId}/entrenamientos`);

    return { success: true, sessionId };
  } catch (err: any) {
    console.error('[SaveSession] Excepción:', err);
    return { success: false, error: err.message || 'Error interno al guardar la sesión' };
  }
}

/**
 * Obtiene las sesiones de un equipo con todos sus drills
 */
export async function getTeamSessionsAction(teamId: string) {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('training_sessions')
      .select(`
        id, club_id, team_id, title, date, start_time,
        age_category, microcycle_day, intensity_load, coach_notes,
        session_drills (
          id, phase, order_index, duration_min, sets, notes,
          drill:banco_ejercicios (
            id, nombre, tipo, descripcion, age_category, intensity_level,
            tactical_board_data, tags, objetivo_tecnico
          )
        )
      `)
      .eq('team_id', teamId)
      .order('date', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

function inferCategoryFromTeamName(name: string): FootballCategory {
  const n = (name || '').toLowerCase();
  if (n.includes('querubin') || n.includes('querubín') || n.includes('u-6') || n.includes('u6')) return 'querubin';
  if (n.includes('prebenjamin') || n.includes('prebenjamín') || n.includes('u-8') || n.includes('u8')) return 'prebenjamin';
  if (n.includes('benjamin') || n.includes('benjamín') || n.includes('u-10') || n.includes('u10')) return 'benjamin';
  if (n.includes('alevin') || n.includes('alevín') || n.includes('u-12') || n.includes('u12')) return 'alevin';
  if (n.includes('infantil') || n.includes('u-14') || n.includes('u14')) return 'infantil';
  if (n.includes('cadete') || n.includes('u-16') || n.includes('u16')) return 'cadete';
  if (n.includes('juvenil') || n.includes('u-19') || n.includes('u18')) return 'juvenil';
  if (n.includes('senior') || n.includes('primer equipo') || n.includes('amateur') || n.includes('filial')) return 'senior';
  return 'senior';
}

/**
 * Obtiene todos los equipos del club
 */
export async function getClubTeamsAction() {
  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from('teams')
      .select('id, name, category, color, club_id')
      .order('name');

    if (error) throw error;

    const formattedTeams = (data || []).map((t) => ({
      id: t.id,
      name: t.name,
      age_category: inferCategoryFromTeamName(t.name),
      color: t.color || '#3b82f6',
      club_id: t.club_id,
    }));

    return { success: true, data: formattedTeams };
  } catch (err: any) {
    console.error('[getClubTeamsAction] Error:', err);
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Obtiene todas las sesiones del club con filtro opcional por equipo
 */
export async function getAllClubSessionsAction(clubId: string, teamId?: string) {
  try {
    const adminClient = createAdminClient();
    let q = adminClient
      .from('training_sessions')
      .select(`
        id, club_id, team_id, title, date, start_time,
        age_category, microcycle_day, intensity_load,
        team:teams!inner (id, name, club_id)
      `)
      .eq('teams.club_id', clubId)
      .order('date', { ascending: false })
      .limit(50);

    if (teamId) q = q.eq('team_id', teamId);

    const { data, error } = await q;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Obtiene todos los ejercicios del banco del club
 */
export async function getClubDrillsAction(clubId?: string) {
  try {
    const adminClient = createAdminClient();
    let query = adminClient
      .from('banco_ejercicios')
      .select('*')
      .order('created_at', { ascending: false });

    if (clubId) {
      query = query.eq('club_id', clubId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, data: [], error: err.message };
  }
}

/**
 * Siembra tareas por defecto para el club
 */
export async function seedClubDrillsAction() {
  try {
    const adminClient = createAdminClient();
    const { data: club } = await adminClient
      .from('clubs')
      .select('id')
      .ilike('name', '%SPORTING SALADAR%')
      .limit(1)
      .single();

    const clubId = club?.id;
    if (!clubId) return { success: false, error: 'Club no encontrado' };

    const archetypeDrills = [
      {
        club_id: clubId,
        nombre: 'Rondo 4v2 con Tercer Hombre y Perfilación',
        tipo: 'rondo',
        descripcion: 'Espacio de 15x15m. 4 jugadores exteriores mantienen la posesión a 2 toques ante 2 defensores interiores.',
        age_category: 'infantil',
        microcycle_day: 'MD_minus_3',
        drill_structure: 'rondo',
        min_players: 6,
        max_players: 8,
        intensity_level: 3,
        duracion_recomendada: 15,
        objetivo_tecnico: ['pase orientado', 'perfilación corporal'],
        objetivo_tactico: ['tercer hombre', 'líneas de pase'],
        material: ['conos naranjas', 'petos', 'balones'],
        variantes: ['Máximo 1 toque'],
        tags: ['infantil', 'MD_minus_3', 'arquetipo'],
        dificultad: 3,
        categoria_edad: ['infantil'],
        tactical_board_data: {
          pitchType: 'half',
          cones: [
            { id: 'c1', x: 20, y: 15, color: 'orange' },
            { id: 'c2', x: 60, y: 15, color: 'orange' },
            { id: 'c3', x: 20, y: 55, color: 'orange' },
            { id: 'c4', x: 60, y: 55, color: 'orange' },
          ],
          players: [
            { id: 'p1', x: 20, y: 35, team: 'blue', label: '1' },
            { id: 'p2', x: 60, y: 35, team: 'blue', label: '2' },
            { id: 'p3', x: 40, y: 15, team: 'blue', label: '3' },
            { id: 'p4', x: 40, y: 55, team: 'blue', label: '4' },
            { id: 'p5', x: 35, y: 33, team: 'red', label: 'D1' },
            { id: 'p6', x: 45, y: 37, team: 'red', label: 'D2' },
          ],
          balls: [{ id: 'b1', x: 22, y: 35 }],
          arrows: [{ id: 'a1', fromX: 22, fromY: 35, toX: 40, toY: 15, type: 'pass' }],
        },
      },
    ];

    const { data: inserted, error } = await adminClient
      .from('banco_ejercicios')
      .insert(archetypeDrills)
      .select('id');

    if (error) throw error;

    revalidatePath('/dashboard/exercises');
    return { success: true, inserted: inserted?.length || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
