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
