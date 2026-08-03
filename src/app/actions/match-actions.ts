"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateConvocatoria(matchId: string, playerId: string, status: "convocado" | "lesionado" | "duda" | "no_convocado" | null) {
  const supabase = await createAdminClient()

  if (status === null) {
    await supabase
      .from("convocatorias")
      .delete()
      .eq("partido_id", matchId)
      .eq("player_id", playerId)
  } else {
    // Check if exists
    const { data: existing } = await supabase
      .from("convocatorias")
      .select("id")
      .eq("partido_id", matchId)
      .eq("player_id", playerId)
      .single()

    if (existing) {
      await supabase
        .from("convocatorias")
        .update({ status })
        .eq("id", existing.id)
    } else {
      await supabase
        .from("convocatorias")
        .insert({ partido_id: matchId, player_id: playerId, status })
    }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function updateConvocatoriaBatch(matchId: string, updates: { playerId: string, status: "convocado" | "lesionado" | "duda" | "no_convocado" | "titular" | "suplente" | null }[]) {
  const supabase = await createAdminClient()

  let hasError = false;
  let lastError = null;

  for (const update of updates) {
    if (update.status === null) {
      const { error } = await supabase
        .from("convocatorias")
        .delete()
        .eq("partido_id", matchId)
        .eq("player_id", update.playerId)
      if (error) { console.error("Error deleting:", error); hasError = true; lastError = error; }
    } else {
      const { data: existing, error: selectError } = await supabase
        .from("convocatorias")
        .select("id")
        .eq("partido_id", matchId)
        .eq("player_id", update.playerId)
        .single()

      if (existing) {
        const { error } = await supabase
          .from("convocatorias")
          .update({ status: update.status })
          .eq("id", existing.id)
        if (error) { console.error("Error updating:", error); hasError = true; lastError = error; }
      } else {
        const { error } = await supabase
          .from("convocatorias")
          .insert({ partido_id: matchId, player_id: update.playerId, status: update.status })
        if (error) { console.error("Error inserting:", error); hasError = true; lastError = error; }
      }
    }
  }

  if (hasError) {
    return { success: false, error: lastError }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function sendConvocatoriaAlerts(matchId: string, teamId: string, playerIds: string[]) {
  const supabase = await createClient()

  // 1. Get tutor_ids for the players
  const { data: players } = await supabase
    .from('players')
    .select('id, first_name, last_name, tutor_id')
    .in('id', playerIds)
    .not('tutor_id', 'is', null)

  if (!players || players.length === 0) {
    return { success: true, message: 'No se encontraron tutores para enviar alertas.' }
  }

  // 2. Get match details
  const { data: match } = await supabase
    .from('partidos')
    .select('rival_nombre, fecha_hora')
    .eq('id', matchId)
    .single()

  const matchTitle = match ? `Partido vs ${match.rival_nombre}` : 'Nuevo Partido'

  // 3. Create notifications for each tutor
  const notificationsToInsert = players.map(p => ({
    profile_id: p.tutor_id,
    title: `Convocatoria: ${matchTitle}`,
    content: `${p.first_name} ha sido convocado para el próximo partido. Por favor, confirma su asistencia.`,
    read: false,
    match_id: matchId,
    // Add player_id if needed in the notification payload for the frontend to know who it is for
    // payload: { player_id: p.id } -> Assuming schema allows JSON payloads, otherwise we just use match_id
  }))

  const { error } = await supabase
    .from('notifications')
    .insert(notificationsToInsert)

  if (error) {
    console.error('[sendConvocatoriaAlerts] Error inserting notifications:', error)
    return { success: false, message: 'Error enviando alertas.' }
  }

  console.log(`[ALERTA ENVIADA] Partido ${matchId}: Se ha notificado a ${playerIds.length} jugadores.`)
  
  return { success: true, message: `Alertas enviadas a ${notificationsToInsert.length} familias.` }
}

export async function updateMatchDetails(matchId: string, teamId: string, updates: { fecha_hora?: string, lugar?: string, rival_nombre?: string, resultado_propio?: number | null, resultado_rival?: number | null, estado?: string, rsvp_reminder_time?: string | null }) {
  const supabase = await createClient()
  await supabase.from('partidos').update(updates).eq('id', matchId)
  revalidatePath(`/dashboard/e/${teamId}/partidos`, 'page')
  return { success: true }
}

export async function saveMatchReport(matchId: string, report: { coach_rating: number, coach_summary: string, positive_aspects: string, improvement_aspects: string, attitude_notes: string }) {
  const supabase = await createClient()
  await supabase.from('partidos').update(report).eq('id', matchId)
  revalidatePath(`/dashboard/e/[teamId]/partidos/${matchId}`, 'page')
  return { success: true }
}

export async function deleteMatchAction(matchId: string, teamId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("partidos")
    .delete()
    .eq("id", matchId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/dashboard/matches`)
  revalidatePath(`/dashboard/equipos/${teamId}/partidos`)
  return { success: true }
}

export async function createPartidoAction(teamId: string, data: { fecha_hora: string, lugar?: string, rival_nombre?: string, season_id?: string }) {
  const supabase = await createClient()

  // Obtener el club_id del usuario autenticado
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error("No autenticado")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("club_id, role")
    .eq("id", user.id)
    .single()

  if (profileError || !profile?.club_id) {
    throw new Error("No se pudo obtener el club del usuario")
  }

  let finalSeasonId = data.season_id;

  // Fase 1 Caja Fuerte & Llave Maestra: Validación estricta del season_id
  if (finalSeasonId) {
    const { data: targetSeason } = await supabase.from('seasons').select('is_active, name').eq('id', finalSeasonId).single();
    const isOverride = targetSeason && targetSeason.name.includes('🔓') && profile.role === 'admin';
    if (!targetSeason || (!targetSeason.is_active && !isOverride)) {
      throw new Error("No se pueden crear datos en una temporada cerrada.");
    }
  } else {
    // Si no lo pasan, buscar la temporada activa
    const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', profile.club_id).eq('is_active', true).single();
    if (!activeSeason) throw new Error("No hay una temporada activa para guardar el partido");
    finalSeasonId = activeSeason.id;
  }
  
  const { data: newMatch, error } = await supabase
    .from("partidos")
    .insert({
      club_id: profile.club_id,
      equipo_id: teamId,
      fecha_hora: data.fecha_hora,
      lugar: data.lugar,
      rival_nombre: data.rival_nombre,
      estado: 'Programado',
      season_id: finalSeasonId,
      rsvp_reminder_time: (data as any).rsvp_reminder_time || null
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/dashboard/matches`)
  revalidatePath(`/dashboard/equipos/${teamId}/partidos`)
  return { success: true, match: newMatch }
}

export async function updatePlayerRatingsBatch(matchId: string, ratings: { playerId: string, rating: number }[]) {
  const supabase = await createClient();
  
  // We have to update one by one or use upsert if we know the convocatorias ID.
  // Since we only know player_id and partido_id, we can do sequential updates.
  for (const { playerId, rating } of ratings) {
    await supabase
      .from('convocatorias')
      .update({ coach_rating: rating })
      .eq('partido_id', matchId)
      .eq('player_id', playerId);
  }
  
  // Also revalidate the path so the UI updates
  // Need team_id to revalidate correctly, but we don't have it directly here.
  // We can revalidate a general path or everything
  revalidatePath(`/dashboard`, 'layout');
  return { success: true };
}

export async function saveLineup(matchId: string, assignedPlayers: {playerId: string, x: number, y: number}[], tactic: string) {
  const supabase = await createClient();
  
  // Reset all to not titular and clear coordinates
  await supabase
    .from('convocatorias')
    .update({ titular: false, tactical_x: null, tactical_y: null })
    .eq('partido_id', matchId);

  // Set selected players as titular with their coordinates
  if (assignedPlayers.length > 0) {
    for (const player of assignedPlayers) {
      const { data: existing } = await supabase
        .from('convocatorias')
        .select('id')
        .eq('partido_id', matchId)
        .eq('player_id', player.playerId)
        .single();

      if (existing) {
        await supabase
          .from('convocatorias')
          .update({ titular: true, tactical_x: player.x, tactical_y: player.y })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('convocatorias')
          .insert({ 
            partido_id: matchId, 
            player_id: player.playerId, 
            status: 'convocado', 
            titular: true, 
            tactical_x: player.x, 
            tactical_y: player.y 
          });
      }
    }
  }

  revalidatePath(`/dashboard`, 'layout');
  return { success: true };
}

export async function updateMatchAttendanceBatch(
  matchId: string, 
  teamId: string, 
  matchDate: string | null, 
  records: { playerId: string, status: string }[]
) {
  const supabase = await createClient();
  const dateStr = matchDate ? matchDate.split('T')[0] : new Date().toISOString().split('T')[0];
  
  // 1. Ensure a team_events record exists for this match
  let eventId = null;
  const { data: existingEvent } = await supabase
    .from('team_events')
    .select('id')
    .eq('team_id', teamId)
    .eq('event_type', 'Partido')
    .eq('date', dateStr)
    .limit(1)
    .single();

  if (existingEvent) {
    eventId = existingEvent.id;
  } else {
    const { data: newEvent } = await supabase
      .from('team_events')
      .insert({
        team_id: teamId,
        title: 'Partido (Autogenerado por Asistencia)',
        date: dateStr,
        event_type: 'Partido'
      })
      .select()
      .single();
    if (newEvent) {
      eventId = newEvent.id;
    }
  }

  // 2. Insert/Update attendance records
  for (const record of records) {
    // Check if exists
    const { data: existingAtt } = await supabase
      .from('attendance')
      .select('id')
      .eq('player_id', record.playerId)
      .eq('date', dateStr)
      .limit(1)
      .single();

    if (existingAtt) {
      await supabase
        .from('attendance')
        .update({ status: record.status, event_id: eventId })
        .eq('id', existingAtt.id);
    } else {
      await supabase
        .from('attendance')
        .insert({
          team_id: teamId,
          player_id: record.playerId,
          event_id: eventId,
          date: dateStr,
          status: record.status
        });
    }
  }

  revalidatePath(`/dashboard`, 'layout');
  return { success: true };
}

export async function updateMatchStatsBatch(matchId: string, stats: { playerId: string, goals: number, assists: number, yellows: number, reds: number, minutes: number }[]) {
  const supabase = await createClient();

  for (const stat of stats) {
    await supabase
      .from('convocatorias')
      .update({
        goals: stat.goals,
        assists: stat.assists,
        yellow_cards: stat.yellows,
        red_cards: stat.reds,
        minutes_played: stat.minutes
      })
      .eq('partido_id', matchId)
      .eq('player_id', stat.playerId);
  }

  revalidatePath(`/dashboard`, 'layout');
  return { success: true };
}

export async function updateMatchFullReportBatch(
  matchId: string,
  teamId: string,
  matchDate: string | null,
  reports: {
    playerId: string;
    status: string;
    rating: number;
    actitud: number;
    goals: number;
    assists: number;
    yellows: number;
    reds: number;
    minutes: number;
  }[]
) {
  try {
    const supabase = await createClient();

  // 1. Update attendance in team_events / attendance table
  const attendanceRecords = reports.map(r => ({ playerId: r.playerId, status: r.status }));
  await updateMatchAttendanceBatch(matchId, teamId, matchDate, attendanceRecords);

  // 2. Update convocatorias with all stats, ratings, and attendance
  for (const report of reports) {
    const { data: existing } = await supabase
      .from('convocatorias')
      .select('id')
      .eq('partido_id', matchId)
      .eq('player_id', report.playerId)
      .single();

    const payload = {
      estado_asistencia: report.status,
      coach_rating: report.rating,
      actitud: report.actitud,
      goals: report.goals,
      assists: report.assists,
      yellow_cards: report.yellows,
      red_cards: report.reds,
      minutes_played: report.minutes
    };

    if (existing) {
      await supabase
        .from('convocatorias')
        .update(payload)
        .eq('id', existing.id);
    } else {
      await supabase
        .from('convocatorias')
        .insert({
          partido_id: matchId,
          player_id: report.playerId,
          ...payload
        });
    }
  }

  revalidatePath(`/dashboard`, 'layout');
  return { success: true };
  } catch (err: any) {
    console.error("Error in updateMatchFullReportBatch:", err);
    return { success: false, error: err.message || "Unknown error" };
  }
}

export async function updatePlayerCardsInMatch(matchId: string, playerId: string, yellows: number, reds: number) {
  console.log(`[updatePlayerCardsInMatch] Start: match=${matchId}, player=${playerId}, yellows=${yellows}, reds=${reds}`);
  const supabase = await createAdminClient();
  const { data: existing, error: findError } = await supabase
    .from('convocatorias')
    .select('id')
    .eq('partido_id', matchId)
    .eq('player_id', playerId)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    console.error("[updatePlayerCardsInMatch] Error finding row:", findError);
  }

  if (existing) {
    console.log(`[updatePlayerCardsInMatch] Row exists (${existing.id}), updating...`);
    const { error } = await supabase.from('convocatorias').update({ yellow_cards: yellows, red_cards: reds }).eq('id', existing.id);
    if (error) console.error("[updatePlayerCardsInMatch] Error updating cards:", error);
    else console.log(`[updatePlayerCardsInMatch] Update SUCCESS!`);
  } else {
    console.log(`[updatePlayerCardsInMatch] Row does not exist, inserting...`);
    const { error } = await supabase.from('convocatorias').insert({
      partido_id: matchId,
      player_id: playerId,
      yellow_cards: yellows,
      red_cards: reds,
      estado_asistencia: 'Pendiente',
      status: 'convocado'
    });
    if (error) console.error("[updatePlayerCardsInMatch] Error inserting cards:", error);
    else console.log(`[updatePlayerCardsInMatch] Insert SUCCESS!`);
  }
  revalidatePath(`/dashboard`, 'layout');
  console.log(`[updatePlayerCardsInMatch] Done.`);
  return { success: true };
}

export async function getPublicMatchEvents(matchId: string) {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('match_events')
    .select(`
      *,
      player:players(first_name, last_name, dorsal)
    `)
    .eq('partido_id', matchId)
    .order('minuto', { ascending: true })

  if (error) {
    console.error("Error fetching match events:", error)
    return []
  }
  return data || []
}

export async function getPublicMatches() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('partidos')
    .select('id, estado, resultado_propio, resultado_rival, live_timer_started_at, live_timer_elapsed_seconds')
    .eq('estado', 'Programado')
    .or('live_timer_started_at.not.is.null,live_timer_elapsed_seconds.gt.0');
    
  if (error) {
    console.error("Error fetching public matches:", error);
    return [];
  }
  return data || [];
}
