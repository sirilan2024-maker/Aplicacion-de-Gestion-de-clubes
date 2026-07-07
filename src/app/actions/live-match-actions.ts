"use server"

import { createClient } from "@/lib/supabase/server"

export async function toggleMatchTimer(matchId: string, isRunning: boolean, elapsedSeconds: number) {
  const supabase = await createClient()
  
  const startedAt = isRunning ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("partidos")
    .update({
      live_timer_started_at: startedAt,
      live_timer_elapsed_seconds: elapsedSeconds
    })
    .eq("id", matchId)

  if (error) {
    console.error("Error toggling timer:", error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function addLiveEvent(matchId: string, eventData: any) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from("match_events")
    .insert([
      {
        partido_id: matchId,
        player_id: eventData.player_id || null,
        tipo_evento: eventData.tipo,
        minuto: eventData.minuto,
        notas: eventData.descripcion
      }
    ])
    .select()
    .single()

  if (error) {
    console.error("Error adding live event:", error)
    return { success: false, error: error.message }
  }

  if (eventData.tipo === "Gol" || eventData.tipo === "Gol en propia puerta") {
    await recalculateScore(matchId, supabase);
  }

  return { success: true, data }
}

export async function deleteLiveEvent(eventId: string, matchId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("match_events")
    .delete()
    .eq("id", eventId)

  if (error) {
    return { success: false, error: error.message }
  }

  await recalculateScore(matchId, supabase);

  return { success: true }
}

async function recalculateScore(matchId: string, supabase: any) {
  const { data: events } = await supabase
    .from("match_events")
    .select("*")
    .eq("partido_id", matchId)
    .in("tipo_evento", ["Gol", "Gol en propia puerta"])

  if (!events) return;

  let localGoals = 0;
  let awayGoals = 0;

  events.forEach((e: any) => {
    if (e.tipo_evento === "Gol") {
      if (e.player_id) localGoals++;
      else awayGoals++;
    } else if (e.tipo_evento === "Gol en propia puerta") {
      if (e.player_id) awayGoals++;
      else localGoals++;
    }
  });

  await supabase
    .from("partidos")
    .update({
      resultado_propio: localGoals,
      resultado_rival: awayGoals
    })
    .eq("id", matchId)
}

export async function updateMatchState(matchId: string, estado: string, updates: any = {}) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("partidos")
    .update({
      estado,
      ...updates
    })
    .eq("id", matchId)

  if (error) {
    console.error("Error updating match state:", error)
    return { success: false, error: error.message }
  }

  // Si finaliza el partido, sincronizamos automáticamente los eventos en vivo a la convocatoria
  if (estado === "Finalizado") {
    await syncMatchEventsToConvocatorias(matchId, supabase);
  }

  return { success: true }
}

async function syncMatchEventsToConvocatorias(matchId: string, supabase: any) {
  // 1. Obtener todos los eventos del partido
  const { data: events } = await supabase
    .from("match_events")
    .select("*")
    .eq("partido_id", matchId);

  if (!events || events.length === 0) return;

  // Agrupar eventos por jugador
  const playerStats: Record<string, { goals: number, yellow_cards: number, red_cards: number }> = {};
  
  events.forEach((e: any) => {
    if (!e.player_id) return;
    
    if (!playerStats[e.player_id]) {
      playerStats[e.player_id] = { goals: 0, yellow_cards: 0, red_cards: 0 };
    }
    
    if (e.tipo_evento === "Gol") {
      playerStats[e.player_id].goals++;
    } else if (e.tipo_evento === "Tarjeta Amarilla") {
      playerStats[e.player_id].yellow_cards++;
    } else if (e.tipo_evento === "Tarjeta Roja") {
      playerStats[e.player_id].red_cards++;
    }
  });

  // 2. Obtener convocatorias actuales
  const { data: convocatorias } = await supabase
    .from("convocatorias")
    .select("id, player_id")
    .eq("partido_id", matchId);

  if (!convocatorias) return;

  // 3. Actualizar cada convocatoria con los datos agregados
  for (const conv of convocatorias) {
    const stats = playerStats[conv.player_id];
    if (stats) {
      await supabase
        .from("convocatorias")
        .update({
          goals: stats.goals,
          goles: stats.goals, // Actualizar ambos por compatibilidad
          yellow_cards: stats.yellow_cards,
          tarjetas_amarillas: stats.yellow_cards,
          red_cards: stats.red_cards,
          tarjetas_rojas: stats.red_cards
        })
        .eq("id", conv.id);
    }
  }
}
