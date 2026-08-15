"use server";

import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';
import { 
  EvaluationModule, 
  PlayerEvaluation, 
  UpsertEvaluationDTO, 
  PlayerProgressReport, 
  ModuleProgressSummary 
} from '@/types/formative-evaluation';

/**
 * Obtener todos los módulos maestros con sus conceptos y rúbricas descriptivas 1-5
 */
export async function getEvaluationModulesWithRubrics(): Promise<EvaluationModule[]> {
  const supabase = createAdminClient();
  
  const { data: modules, error } = await supabase
    .from('evaluation_modules')
    .select(`
      id,
      code,
      name,
      display_order,
      is_active,
      concepts:evaluation_concepts (
        id,
        module_id,
        code,
        name,
        category_target,
        display_order,
        rubrics:concept_rubrics (
          id,
          concept_id,
          score_level,
          short_label,
          criteria_description
        )
      )
    `)
    .eq('is_active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error("Error al obtener módulos formativos:", error);
    return [];
  }

  // Ordenar conceptos y rúbricas internamente
  return (modules || []).map((m: any) => ({
    ...m,
    concepts: (m.concepts || [])
      .sort((a: any, b: any) => a.display_order - b.display_order)
      .map((c: any) => ({
        ...c,
        rubrics: (c.rubrics || []).sort((r1: any, r2: any) => r1.score_level - r2.score_level)
      }))
  }));
}

/**
 * Obtener la última evaluación o evaluación por evento de un jugador
 */
export async function getPlayerEvaluation(playerId: string, eventId?: string | null): Promise<PlayerEvaluation | null> {
  const supabase = createAdminClient();
  
  let query = supabase
    .from('player_evaluations')
    .select(`
      id,
      player_id,
      evaluator_id,
      event_id,
      evaluation_date,
      evaluation_period,
      general_feedback,
      strengths,
      areas_for_improvement,
      created_at,
      items:evaluation_items (
        id,
        evaluation_id,
        concept_id,
        score,
        coach_notes,
        concept:evaluation_concepts (
          id,
          module_id,
          code,
          name,
          category_target,
          display_order
        )
      )
    `)
    .eq('player_id', playerId);

  if (eventId) {
    query = query.eq('event_id', eventId);
  }

  const { data, error } = await query.order('evaluation_date', { ascending: false }).limit(1).maybeSingle();

  if (error) {
    console.error("Error al obtener evaluación de jugador:", error);
    return null;
  }

  return data as PlayerEvaluation | null;
}

/**
 * Registrar o actualizar una evaluación formativa completa de forma atómica
 */
export async function upsertEvaluationAction(dto: UpsertEvaluationDTO): Promise<{ success: boolean; evaluationId?: string; error?: string }> {
  try {
    const supabase = createAdminClient();

    // 1. Cabecera de evaluación
    let evalId = dto.id;
    
    if (evalId) {
      const { error: headerErr } = await supabase
        .from('player_evaluations')
        .update({
          evaluation_date: dto.evaluation_date,
          evaluation_period: dto.evaluation_period,
          general_feedback: dto.general_feedback,
          strengths: dto.strengths,
          areas_for_improvement: dto.areas_for_improvement,
          updated_at: new Date().toISOString()
        })
        .eq('id', evalId);

      if (headerErr) throw headerErr;
    } else {
      const { data: newEval, error: insertErr } = await supabase
        .from('player_evaluations')
        .insert({
          player_id: dto.player_id,
          evaluator_id: dto.evaluator_id,
          event_id: dto.event_id,
          evaluation_date: dto.evaluation_date,
          evaluation_period: dto.evaluation_period,
          general_feedback: dto.general_feedback,
          strengths: dto.strengths,
          areas_for_improvement: dto.areas_for_improvement
        })
        .select('id')
        .single();

      if (insertErr) throw insertErr;
      evalId = newEval.id;
    }

    if (!evalId) throw new Error("No se pudo generar el identificador de evaluación");

    // 2. Items / Puntuaciones por concepto
    if (dto.items && dto.items.length > 0) {
      const itemsPayload = dto.items.map(it => ({
        evaluation_id: evalId,
        concept_id: it.concept_id,
        score: Math.min(5, Math.max(1, it.score)),
        coach_notes: it.coach_notes || null
      }));

      const { error: itemsErr } = await supabase
        .from('evaluation_items')
        .upsert(itemsPayload, { onConflict: 'evaluation_id,concept_id' });

      if (itemsErr) throw itemsErr;
    }

    return { success: true, evaluationId: evalId };
  } catch (err: any) {
    console.error("Error en upsertEvaluationAction:", err);
    return { success: false, error: err.message || "Error al guardar la evaluación formativa" };
  }
}

/**
 * Consulta agregada para el informe y evolución del aprendizaje del jugador
 */
export async function getPlayerProgressReport(playerId: string): Promise<PlayerProgressReport | null> {
  try {
    const supabase = createAdminClient();

    // 1. Módulos y conceptos maestros
    const modules = await getEvaluationModulesWithRubrics();
    const conceptMap = new Map<string, { concept_name: string; module_name: string; module_code: string; module_id: string }>();

    modules.forEach(m => {
      m.concepts?.forEach(c => {
        conceptMap.set(c.id, {
          concept_name: c.name,
          module_name: m.name,
          module_code: m.code,
          module_id: m.id
        });
      });
    });

    // 2. Historial de todas las evaluaciones del jugador
    const { data: allEvals, error: evalErr } = await supabase
      .from('player_evaluations')
      .select(`
        id,
        player_id,
        evaluation_date,
        evaluation_period,
        general_feedback,
        strengths,
        areas_for_improvement,
        created_at,
        items:evaluation_items (
          id,
          concept_id,
          score,
          coach_notes
        )
      `)
      .eq('player_id', playerId)
      .order('evaluation_date', { ascending: true });

    if (evalErr || !allEvals || allEvals.length === 0) {
      return null;
    }

    const latestEval = allEvals[allEvals.length - 1];

    // 3. Resumen por módulos de la última evaluación
    const moduleScoresAccumulator: Record<string, { total: number; count: number; name: string; code: string }> = {};
    modules.forEach(m => {
      moduleScoresAccumulator[m.id] = { total: 0, count: 0, name: m.name, code: m.code };
    });

    const radarData: { concept_name: string; module_name: string; score: number; full_mark: number }[] = [];

    (latestEval.items || []).forEach((item: any) => {
      const meta = conceptMap.get(item.concept_id);
      if (meta) {
        if (moduleScoresAccumulator[meta.module_id]) {
          moduleScoresAccumulator[meta.module_id].total += item.score;
          moduleScoresAccumulator[meta.module_id].count += 1;
        }
        radarData.push({
          concept_name: meta.concept_name,
          module_name: meta.module_name,
          score: item.score,
          full_mark: 5
        });
      }
    });

    const module_summaries: ModuleProgressSummary[] = Object.entries(moduleScoresAccumulator).map(([modId, val]) => {
      const mod = modules.find(m => m.id === modId);
      return {
        module_id: modId,
        module_code: val.code,
        module_name: val.name,
        average_score: val.count > 0 ? Number((val.total / val.count).toFixed(2)) : 0,
        total_concepts: mod?.concepts?.length || 0,
        evaluated_concepts: val.count
      };
    });

    // 4. Evolución temporal histórica
    const historical_evolution = allEvals.map((ev: any) => {
      const modScores: Record<string, { total: number; count: number }> = {};
      let totalScores = 0;
      let totalCount = 0;

      (ev.items || []).forEach((it: any) => {
        const meta = conceptMap.get(it.concept_id);
        if (meta) {
          if (!modScores[meta.module_code]) modScores[meta.module_code] = { total: 0, count: 0 };
          modScores[meta.module_code].total += it.score;
          modScores[meta.module_code].count += 1;

          totalScores += it.score;
          totalCount += 1;
        }
      });

      const formattedModScores: Record<string, number> = {};
      Object.entries(modScores).forEach(([code, scoreObj]) => {
        formattedModScores[code] = scoreObj.count > 0 ? Number((scoreObj.total / scoreObj.count).toFixed(2)) : 0;
      });

      return {
        evaluation_date: ev.evaluation_date,
        evaluation_period: ev.evaluation_period,
        module_scores: formattedModScores,
        overall_average: totalCount > 0 ? Number((totalScores / totalCount).toFixed(2)) : 0
      };
    });

    return {
      player_id: playerId,
      latest_evaluation: latestEval as PlayerEvaluation,
      module_summaries,
      historical_evolution,
      radar_data: radarData
    };
  } catch (err) {
    console.error("Error al calcular informe de progreso:", err);
    return null;
  }
}

export interface TeamPlayerFormativeSummary {
  playerId: string;
  playerName: string;
  dorsal: number | null;
  avatarUrl: string | null;
  overallAverage: number;
  evaluationsCount: number;
  latestPeriod: string | null;
  latestDate: string | null;
  moduleAverages: {
    tecnico: number;
    tactico: number;
    fisico: number;
    socio: number;
  };
}

/**
 * Obtener visión global formativa de todo el equipo
 */
export async function getTeamFormativeOverview(teamId: string): Promise<TeamPlayerFormativeSummary[]> {
  try {
    const supabase = createAdminClient();

    // 1. Obtener jugadores del equipo
    const { data: players, error: pErr } = await supabase
      .from('players')
      .select('id, first_name, last_name, dorsal, avatar_url, posicion')
      .eq('team_id', teamId);

    if (pErr || !players) return [];

    const validPlayers = players.filter(p => {
      const pos = (p.posicion || '').toLowerCase();
      return !pos.includes('entrenador') && !pos.includes('delegado') && !pos.includes('técnico');
    });

    const playerIds = validPlayers.map(p => p.id);
    if (playerIds.length === 0) return [];

    // 2. Módulos y conceptos
    const { data: concepts } = await supabase
      .from('evaluation_concepts')
      .select('id, code, module:evaluation_modules(code)');

    const conceptModuleMap = new Map<string, string>();
    concepts?.forEach((c: any) => {
      conceptModuleMap.set(c.id, c.module?.code || '');
    });

    // 3. Evaluaciones de los jugadores
    const { data: evals } = await supabase
      .from('player_evaluations')
      .select(`
        id,
        player_id,
        evaluation_date,
        evaluation_period,
        items:evaluation_items (
          concept_id,
          score
        )
      `)
      .in('player_id', playerIds)
      .order('evaluation_date', { ascending: false });

    // 4. Mapear por jugador
    const summaryList: TeamPlayerFormativeSummary[] = validPlayers.map(p => {
      const pEvals = (evals || []).filter(e => e.player_id === p.id);
      const latest = pEvals.length > 0 ? pEvals[0] : null;

      let tecSum = 0, tecCount = 0;
      let tacSum = 0, tacCount = 0;
      let fisSum = 0, fisCount = 0;
      let socSum = 0, socCount = 0;
      let allSum = 0, allCount = 0;

      if (latest && latest.items) {
        latest.items.forEach((it: any) => {
          const modCode = conceptModuleMap.get(it.concept_id);
          allSum += it.score;
          allCount += 1;

          if (modCode === 'tecnico_analitico') { tecSum += it.score; tecCount++; }
          else if (modCode === 'tactico_global') { tacSum += it.score; tacCount++; }
          else if (modCode === 'fisico_coordinativo') { fisSum += it.score; fisCount++; }
          else if (modCode === 'socio_afectivo') { socSum += it.score; socCount++; }
        });
      }

      return {
        playerId: p.id,
        playerName: `${p.first_name} ${p.last_name}`,
        dorsal: p.dorsal,
        avatarUrl: p.avatar_url,
        overallAverage: allCount > 0 ? Number((allSum / allCount).toFixed(2)) : 0,
        evaluationsCount: pEvals.length,
        latestPeriod: latest?.evaluation_period || null,
        latestDate: latest?.evaluation_date || null,
        moduleAverages: {
          tecnico: tecCount > 0 ? Number((tecSum / tecCount).toFixed(2)) : 0,
          tactico: tacCount > 0 ? Number((tacSum / tacCount).toFixed(2)) : 0,
          fisico: fisCount > 0 ? Number((fisSum / fisCount).toFixed(2)) : 0,
          socio: socCount > 0 ? Number((socSum / socCount).toFixed(2)) : 0,
        }
      };
    });

    return summaryList.sort((a, b) => b.overallAverage - a.overallAverage);
  } catch (err) {
    console.error("Error al obtener overview formativo de equipo:", err);
    return [];
  }
}

