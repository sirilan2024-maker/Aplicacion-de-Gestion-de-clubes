"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getAuthenticatedContext, ADMIN_ROLES, canUserAccessMatch, canUserAccessPlayer } from "@/lib/auth-helpers"
import { NotificationService } from "@/lib/notifications/notification-service"
import { getConvocationEmailHtml } from "@/lib/email-service"

export async function updateConvocatoria(matchId: string, playerId: string, status: "convocado" | "lesionado" | "duda" | "no_convocado" | null) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }

  const supabase = await createAdminClient();

  const matchAccess = await canUserAccessMatch(supabase, context, matchId);
  if (!matchAccess.allowed) {
    return { success: false, error: matchAccess.reason || "No tienes acceso a este partido" };
  }

  const playerAccess = await canUserAccessPlayer(supabase, context, playerId);
  if (!playerAccess.allowed) {
    return { success: false, error: playerAccess.reason || "No tienes acceso a este jugador" };
  }

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
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }

  const supabase = await createAdminClient();

  const matchAccess = await canUserAccessMatch(supabase, context, matchId);
  if (!matchAccess.allowed) {
    return { success: false, error: matchAccess.reason || "No tienes acceso a este partido" };
  }

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
  const adminSupabase = await createAdminClient()

  // 1. Get match details
  const { data: match } = await adminSupabase
    .from('partidos')
    .select('id, rival_nombre, fecha_hora, lugar, notas, club_id, equipo:teams(name)')
    .eq('id', matchId)
    .single()

  const matchTitle = match ? `Partido vs ${match.rival_nombre}` : 'Nuevo Partido'
  const teamRel = match?.equipo as unknown
  const teamName = Array.isArray(teamRel) ? (teamRel[0] as { name?: string })?.name || 'Equipo' : (teamRel as { name?: string })?.name || 'Equipo'
  const matchDate = match?.fecha_hora ? new Date(match.fecha_hora).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Próximamente'
  const matchTime = match?.fecha_hora ? new Date(match.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Por confirmar'

  // 2. Get players with tutor_id and contact emails
  const { data: players } = await adminSupabase
    .from('players')
    .select('id, first_name, last_name, tutor_id, user_auth_id, email, tutor_email, parent1_email, parent2_email, tutor:profiles!players_tutor_id_fkey(email)')
    .in('id', playerIds)

  if (!players || players.length === 0) {
    return { success: true, message: 'No se encontraron tutores para enviar alertas.' }
  }

  // Also query player_tutors to include linked guardians
  const { data: linkedTutors } = await adminSupabase
    .from('player_tutors')
    .select('player_id, tutor_id, tutor:profiles(email)')
    .in('player_id', playerIds)

  const linkedTutorsByPlayer = new Map<string, Array<{ tutorId: string, email?: string }>>()
  linkedTutors?.forEach((lt: any) => {
    if (lt.player_id && lt.tutor_id) {
      const arr = linkedTutorsByPlayer.get(lt.player_id) || []
      arr.push({ tutorId: lt.tutor_id, email: lt.tutor?.email })
      linkedTutorsByPlayer.set(lt.player_id, arr)
    }
  })

  // 3. Build notification dispatch list
  const dispatchItems: any[] = []

  for (const p of players) {
    const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim()
    const targetUserId = p.tutor_id || p.user_auth_id
    const targetEmail = (p.tutor as any)?.email || p.tutor_email || p.parent1_email || p.email

    const emailHtml = getConvocationEmailHtml({
      playerName: fullName,
      teamName,
      rivalName: match?.rival_nombre || 'Rival',
      date: matchDate,
      time: matchTime,
      location: match?.lugar || 'Campo Oficial',
      notes: match?.notas || undefined,
      viewUrl: `https://app-gestiondeclubes.vercel.app/dashboard/family/e/${p.id}/partidos`,
    })

    if (targetUserId) {
      dispatchItems.push({
        userId: targetUserId,
        userEmail: targetEmail,
        clubId: match?.club_id,
        type: 'NEW_CONVOCATION' as const,
        title: `⚽ Convocatoria: ${matchTitle}`,
        content: `${p.first_name} ha sido convocado/a para el partido vs ${match?.rival_nombre || 'Rival'} el ${matchDate} a las ${matchTime}.`,
        link: `/dashboard/family/e/${p.id}/partidos`,
        channels: ['IN_APP' as const, 'EMAIL' as const],
        idempotencyKey: `convocation:${matchId}:${p.id}:${targetUserId}:published`,
        emailSubject: `⚽ Convocatoria Oficial: ${teamName} vs ${match?.rival_nombre}`,
        emailHtml,
        metadata: { matchId, playerId: p.id },
      })
    }

    // Also dispatch to linked tutors if distinct
    const extraTutors = linkedTutorsByPlayer.get(p.id) || []
    for (const et of extraTutors) {
      if (et.tutorId && et.tutorId !== targetUserId) {
        dispatchItems.push({
          userId: et.tutorId,
          userEmail: et.email,
          clubId: match?.club_id,
          type: 'NEW_CONVOCATION' as const,
          title: `⚽ Convocatoria: ${matchTitle}`,
          content: `${p.first_name} ha sido convocado/a para el partido vs ${match?.rival_nombre || 'Rival'}.`,
          link: `/dashboard/family/e/${p.id}/partidos`,
          channels: ['IN_APP' as const, 'EMAIL' as const],
          idempotencyKey: `convocation:${matchId}:${p.id}:${et.tutorId}:published`,
          emailSubject: `⚽ Convocatoria Oficial: ${teamName} vs ${match?.rival_nombre}`,
          emailHtml,
          metadata: { matchId, playerId: p.id },
        })
      }
    }
  }

  if (dispatchItems.length > 0) {
    await NotificationService.dispatchBatch({ notifications: dispatchItems })
  }

  console.log(`[ALERTA CONVOCATORIA ENVIADA] Partido ${matchId}: ${dispatchItems.length} alertas despachadas.`)
  return { success: true, message: `Alertas enviadas a ${dispatchItems.length} destinatarios.` }
}

export async function updateMatchDetails(matchId: string, teamId: string, updates: { fecha_hora?: string, lugar?: string, rival_nombre?: string, resultado_propio?: number | null, resultado_rival?: number | null, estado?: string, rsvp_reminder_time?: string | null }) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }
  const adminSupabase = await createAdminClient();
  const access = await canUserAccessMatch(adminSupabase, context, matchId);
  if (!access.allowed || !access.match) {
    return { success: false, error: access.reason || "No tienes acceso a este partido" };
  }
  await adminSupabase.from('partidos').update(updates).eq('id', matchId);
  revalidatePath(`/dashboard/e/${teamId}/partidos`, 'page');
  return { success: true };
}

export async function saveMatchReport(matchId: string, report: { coach_rating: number, coach_summary: string, positive_aspects: string, improvement_aspects: string, attitude_notes: string }) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }
  const adminSupabase = await createAdminClient();
  const access = await canUserAccessMatch(adminSupabase, context, matchId);
  if (!access.allowed || !access.match) {
    return { success: false, error: access.reason || "No tienes acceso a este partido" };
  }
  await adminSupabase.from('partidos').update(report).eq('id', matchId);
  revalidatePath(`/dashboard/e/[teamId]/partidos/${matchId}`, 'page');
  return { success: true };
}


export async function sendMatchSummaryToCoordinatorsAction(matchId: string, summaryText: string) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Usuario no autenticado" }

    const adminSupabase = await createAdminClient()

    // 1. Obtener datos del partido y equipo
    const { data: partido } = await adminSupabase
      .from('partidos')
      .select('id, rival_nombre, resultado_propio, resultado_rival, club_id, equipo:teams(name)')
      .eq('id', matchId)
      .single()

    if (!partido) return { success: false, error: "Partido no encontrado" }

    // 2. Obtener el perfil del emisor (entrenador)
    const { data: coachProfile } = await adminSupabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', user.id)
      .single()

    const coachName = coachProfile ? `${coachProfile.first_name || ''} ${coachProfile.last_name || ''}`.trim() : 'Entrenador'
    const teamRel = partido.equipo as unknown
    const teamName = Array.isArray(teamRel) ? (teamRel[0] as { name?: string })?.name || 'Equipo' : (teamRel as { name?: string })?.name || 'Equipo'
    const matchScore = (partido.resultado_propio !== null && partido.resultado_rival !== null) 
      ? `(${partido.resultado_propio} - ${partido.resultado_rival})` 
      : ''

    // 3. Buscar coordinadores y administradores del club
    const { data: coordinators } = await adminSupabase
      .from('profiles')
      .select('id, email, phone')
      .eq('club_id', partido.club_id)
      .or('role.eq.coordinador,role.eq.admin,role.eq.superadmin')

    if (!coordinators || coordinators.length === 0) {
      return { success: false, error: "No se encontraron coordinadores o administradores en el club." }
    }

    // 4. Despachar notificaciones centralizadas para los coordinadores
    const title = `📋 Valoración del Partido: ${teamName} vs ${partido.rival_nombre} ${matchScore}`
    const fullMessage = `El entrenador ${coachName} ha enviado la valoración general del partido ${teamName} vs ${partido.rival_nombre}:\n\n"${summaryText}"`

    const dispatchList = coordinators.map(coord => ({
      userId: coord.id,
      userEmail: coord.email,
      clubId: partido.club_id,
      type: 'GENERAL_ALERT' as const,
      title: title,
      content: fullMessage,
      link: `/dashboard/matches/${matchId}`,
      channels: ['IN_APP' as const],
      idempotencyKey: `match_summary:${matchId}:${coord.id}`,
      metadata: { matchId },
    }))

    await NotificationService.dispatchBatch({ notifications: dispatchList })

    // Obtener teléfonos de los coordinadores para la opción de WhatsApp
    const coordinatorPhones = coordinators
      .map(c => c.phone)
      .filter(p => p && p.trim().length > 0)

    return { 
      success: true, 
      count: coordinators.length,
      phones: coordinatorPhones,
      message: `Valoración enviada correctamente a ${coordinators.length} coordinador(es) por mensajería interna.`
    }
  } catch (err: any) {
    console.error("Error enviando valoración a coordinadores:", err)
    return { success: false, error: err.message || "Error al enviar la valoración." }
  }
}

export async function deleteMatchAction(matchId: string, teamId: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || "No autenticado");
  }

  if (!ADMIN_ROLES.includes(context.profile.role)) {
    throw new Error("Solo los administradores pueden eliminar partidos");
  }

  const adminClient = await createAdminClient();
  const matchAccess = await canUserAccessMatch(adminClient, context, matchId);
  if (!matchAccess.allowed) {
    throw new Error(matchAccess.reason || "No tienes permisos sobre este partido");
  }
  
  const { error } = await adminClient
    .from("partidos")
    .delete()
    .eq("id", matchId)
    .eq("club_id", context.profile.club_id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/matches`);
  revalidatePath(`/dashboard/equipos/${teamId}/partidos`);
  return { success: true };
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
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }
  const adminSupabase = await createAdminClient();
  const access = await canUserAccessMatch(adminSupabase, context, matchId);
  if (!access.allowed || !access.match) {
    return { success: false, error: access.reason || "No tienes acceso a este partido" };
  }

  for (const { playerId, rating } of ratings) {
    await adminSupabase
      .from('convocatorias')
      .update({ coach_rating: rating })
      .eq('partido_id', matchId)
      .eq('player_id', playerId);
  }
  
  revalidatePath(`/dashboard`, 'layout');
  return { success: true };
}

export async function saveLineup(matchId: string, assignedPlayers: {playerId: string, x: number, y: number}[], tactic: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }
  const adminSupabase = await createAdminClient();
  const access = await canUserAccessMatch(adminSupabase, context, matchId);
  if (!access.allowed || !access.match) {
    return { success: false, error: access.reason || "No tienes acceso a este partido" };
  }

  // Reset all to not titular and clear coordinates
  await adminSupabase
    .from('convocatorias')
    .update({ titular: false, tactical_x: null, tactical_y: null })
    .eq('partido_id', matchId);

  // Set selected players as titular with their coordinates
  if (assignedPlayers.length > 0) {
    for (const player of assignedPlayers) {
      const { data: existing } = await adminSupabase
        .from('convocatorias')
        .select('id')
        .eq('partido_id', matchId)
        .eq('player_id', player.playerId)
        .single();

      if (existing) {
        await adminSupabase
          .from('convocatorias')
          .update({ titular: true, tactical_x: player.x, tactical_y: player.y })
          .eq('id', existing.id);
      } else {
        await adminSupabase
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
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }

  const supabase = await createAdminClient();

  const matchAccess = await canUserAccessMatch(supabase, context, matchId);
  if (!matchAccess.allowed) {
    return { success: false, error: matchAccess.reason || "No tienes permisos sobre este partido" };
  }

  const playerAccess = await canUserAccessPlayer(supabase, context, playerId);
  if (!playerAccess.allowed) {
    return { success: false, error: playerAccess.reason || "No tienes permisos sobre este jugador" };
  }

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
    const { error } = await supabase.from('convocatorias').update({ yellow_cards: yellows, red_cards: reds }).eq('id', existing.id);
    if (error) console.error("[updatePlayerCardsInMatch] Error updating cards:", error);
  } else {
    const { error } = await supabase.from('convocatorias').insert({
      partido_id: matchId,
      player_id: playerId,
      yellow_cards: yellows,
      red_cards: reds,
      estado_asistencia: 'Pendiente',
      status: 'convocado'
    });
    if (error) console.error("[updatePlayerCardsInMatch] Error inserting cards:", error);
  }
  revalidatePath(`/dashboard`, 'layout');
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
  try {
    const supabase = await createAdminClient()
    const { data, error } = await supabase
      .from('partidos')
      .select('id, estado, resultado_propio, resultado_rival, live_timer_started_at, live_timer_elapsed_seconds, first_half_duration_seconds')
      .neq('estado', 'Finalizado')

    if (error) {
      console.error("Error fetching public matches:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    console.error("getPublicMatches exception:", e);
    return [];
  }
}

export async function reconcileMatchStatsAction(matchId: string, stats: any[]) {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || "No autenticado" };
    }

    const supabase = await createAdminClient();
    const access = await canUserAccessMatch(supabase, context, matchId);
    if (!access.allowed || !access.match) {
      return { success: false, error: access.reason || "No tienes acceso a este partido" };
    }

    if (!ADMIN_ROLES.includes(context.profile.role) && context.profile.role !== 'entrenador' && context.profile.role !== 'coach' && context.profile.role !== 'coordinador') {
      return { success: false, error: "No tienes permisos deportivos para reconciliar estadísticas" };
    }

    const { data, error } = await supabase.rpc('reconcile_match_and_close', {
      p_partido_id: matchId,
      p_stats: stats,
      p_new_status: 'Finalizado'
    });

    if (error) {
      console.error("[reconcileMatchStatsAction] Error running RPC:", error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard', 'layout');
    return { success: true, data };
  } catch (err: any) {
    console.error("[reconcileMatchStatsAction] Exception:", err);
    return { success: false, error: err.message || "Error interno" };
  }
}


