"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"

export async function toggleMatchTimer(matchId: string, isRunning: boolean, elapsedSeconds: number) {
  const supabase = await createAdminClient()
  
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
  const supabase = await createAdminClient()
  
  // Usar el tipo de evento directamente sin transformar "Ocasión Peligrosa" en "Tiro al larguero"
  let dbTipo = eventData.tipo;
  let dbNotas = eventData.descripcion;

  const { data, error } = await supabase
    .from("match_events")
    .insert([
      {
        partido_id: matchId,
        player_id: eventData.player_id || null,
        tipo_evento: dbTipo,
        minuto: eventData.minuto,
        notas: dbNotas
      }
    ])
    .select()
    .single()

  if (error) {
    // Si falla por tipo_evento check constraint, intentamos insertar con fallback 'Comentario' o 'Descanso'
    console.warn("Fallo insercion directa tipo_evento:", error.message, "Intentando fallback...");
    const { data: fbData, error: fbError } = await supabase
      .from("match_events")
      .insert([
        {
          partido_id: matchId,
          player_id: eventData.player_id || null,
          tipo_evento: "Descanso",
          minuto: eventData.minuto,
          notas: `[${eventData.tipo}] ${dbNotas || ''}`
        }
      ])
      .select()
      .single()

    if (fbError) {
      console.error("Error adding live event (fallback failed):", fbError);
      return { success: false, error: fbError.message };
    }
    return { success: true, data: { ...fbData, tipo_evento: eventData.tipo } };
  }

  // Restore original tipo for UI consumer
  const resultData = { ...data, tipo_evento: eventData.tipo };

  if (eventData.tipo === "Gol" || eventData.tipo === "Gol en propia puerta") {
    await recalculateScore(matchId, supabase);
  }

  return { success: true, data: resultData }
}

export async function deleteLiveEvent(eventId: string, matchId: string) {
  const supabase = await createAdminClient()
  
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
  const supabase = await createAdminClient()
  
  // Normalizar estado según la restricción 'partidos_estado_check' de la BD
  let dbEstado = estado;
  if (estado === "En Curso" || estado === "En curso" || estado === "EN_CURSO") {
    dbEstado = "En curso";
  } else if (estado === "Descanso" || estado === "DESCANSO") {
    dbEstado = "Descanso";
  } else if (estado === "Finalizado" || estado === "FINALIZADO") {
    dbEstado = "Finalizado";
  } else if (estado === "Programado" || estado === "PROGRAMADO") {
    dbEstado = "Programado";
  }

  const finalUpdates = {
    estado: dbEstado,
    ...updates,
    ...(dbEstado === "Descanso" ? { live_timer_started_at: null } : {})
  }

  const { error } = await supabase
    .from("partidos")
    .update(finalUpdates)
    .eq("id", matchId)

  if (error) {
    console.error("Error updating match state:", error)
    return { success: false, error: error.message }
  }

  // Si finaliza el partido, sincronizamos automáticamente los eventos en vivo a la convocatoria
  if (dbEstado === "Finalizado") {
    await syncMatchEventsToConvocatorias(matchId, supabase);
  }

  return { success: true }
}

async function syncMatchEventsToConvocatorias(matchId: string, supabase: any) {
  // 1. Obtener información del partido para saber la duración total
  const { data: partido } = await supabase
    .from("partidos")
    .select("live_timer_elapsed_seconds, equipo:teams(category)")
    .eq("id", matchId)
    .single();

  let totalMatchMinutes = 90;
  if (partido?.live_timer_elapsed_seconds) {
    totalMatchMinutes = Math.max(1, Math.round(partido.live_timer_elapsed_seconds / 60));
  } else if (partido?.equipo?.category) {
    const cat = partido.equipo.category.toLowerCase();
    if (cat.includes("benjamín") || cat.includes("prebenjamín")) totalMatchMinutes = 50;
    else if (cat.includes("alevín")) totalMatchMinutes = 60;
    else if (cat.includes("infantil")) totalMatchMinutes = 70;
    else if (cat.includes("cadete")) totalMatchMinutes = 80;
  }

  // 2. Obtener todos los eventos del partido
  const { data: events } = await supabase
    .from("match_events")
    .select("*")
    .eq("partido_id", matchId)
    .order("minuto", { ascending: true });

  // 3. Obtener convocatorias actuales con titulares
  const { data: convocatorias } = await supabase
    .from("convocatorias")
    .select("id, player_id, titular")
    .eq("partido_id", matchId);

  if (!convocatorias || convocatorias.length === 0) return;

  const playerStats: Record<string, { 
    goals: number; 
    yellow_cards: number; 
    red_cards: number; 
    minutes_played: number;
    inMinute: number | null;
  }> = {};

  convocatorias.forEach((c: any) => {
    playerStats[c.player_id] = {
      goals: 0,
      yellow_cards: 0,
      red_cards: 0,
      minutes_played: 0,
      inMinute: c.titular ? 0 : null // Los titulares empiezan en el minuto 0
    };
  });

  // Procesar los eventos cronológicamente
  (events || []).forEach((e: any) => {
    const eventMin = Math.min(totalMatchMinutes, Math.max(0, e.minuto || 0));

    if (e.player_id && playerStats[e.player_id]) {
      if (e.tipo_evento === "Gol") {
        playerStats[e.player_id].goals++;
      } else if (e.tipo_evento === "Tarjeta Amarilla" || e.tipo_evento === "Amarilla") {
        playerStats[e.player_id].yellow_cards++;
      } else if (e.tipo_evento === "Tarjeta Roja") {
        playerStats[e.player_id].red_cards++;
        // Si le sacan tarjeta roja, sale del campo en ese minuto
        if (playerStats[e.player_id].inMinute !== null) {
          const played = Math.max(0, eventMin - playerStats[e.player_id].inMinute!);
          playerStats[e.player_id].minutes_played += played;
          playerStats[e.player_id].inMinute = null;
        }
      }
    }

    // Procesar cambios
    if (e.tipo_evento === "Cambio") {
      // Si en las notas del cambio viene "Entra [Nombre] por [Sale]" o si hay player_id
      if (e.player_id && playerStats[e.player_id]) {
        // Jugador que entra
        if (playerStats[e.player_id].inMinute === null) {
          playerStats[e.player_id].inMinute = eventMin;
        }
      }
    }
  });

  // Para cada jugador, calcular los minutos finales al pitar el final del partido
  for (const conv of convocatorias) {
    const stats = playerStats[conv.player_id];
    if (stats) {
      if (stats.inMinute !== null) {
        const played = Math.max(0, totalMatchMinutes - stats.inMinute);
        stats.minutes_played += played;
      }

      await supabase
        .from("convocatorias")
        .update({
          goals: stats.goals,
          goles: stats.goals,
          yellow_cards: stats.yellow_cards,
          tarjetas_amarillas: stats.yellow_cards,
          red_cards: stats.red_cards,
          tarjetas_rojas: stats.red_cards,
          minutes_played: stats.minutes_played,
          minutos_jugados: stats.minutes_played
        })
        .eq("id", conv.id);
    }
  }
}

export async function resetMatchAction(matchId: string) {
  const supabase = await createAdminClient();
  
  // Borramos todos los eventos de este partido
  await supabase.from("match_events").delete().eq("partido_id", matchId);
  
  // Reseteamos el estado y cronómetro del partido
  await supabase.from("partidos").update({
    estado: 'Programado',
    resultado_propio: null,
    resultado_rival: null,
    live_timer_started_at: null,
    live_timer_elapsed_seconds: 0,
    first_half_duration_seconds: null,
    second_half_duration_seconds: null
  }).eq("id", matchId);

  return { success: true };
}
