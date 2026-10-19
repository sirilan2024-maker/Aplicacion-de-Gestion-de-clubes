"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getAuthenticatedContext, ADMIN_ROLES, canUserAccessMatch, canUserAccessPlayer } from "@/lib/auth-helpers"
import { NotificationService } from "@/lib/notifications/notification-service"
import { getConvocationEmailHtml, getUnconvocationEmailHtml } from "@/lib/email-service"
import { isSeasonEditable, assertSeasonEditable } from "@/lib/season-utils"
import { detectLowerCategoryTarget } from "@/lib/matches/category-promotion"

export async function updateConvocatoria(matchId: string, playerId: string, status: "convocado" | "lesionado" | "duda" | "no_convocado" | null) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }

  const supabase = await createAdminClient();

  const matchAccess = await canUserAccessMatch(supabase, context, matchId);
  if (!matchAccess.allowed || !matchAccess.match) {
    return { success: false, error: matchAccess.reason || "No tienes acceso a este partido" };
  }

  if (matchAccess.match.season_id) {
    const editable = await isSeasonEditable(matchAccess.match.season_id, context.profile.club_id);
    if (!editable) {
      return { success: false, error: "No se pueden modificar datos de una temporada cerrada." };
    }
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

export async function updateConvocatoriaBatch(
  matchId: string, 
  updates: { playerId: string, status: "convocado" | "lesionado" | "duda" | "no_convocado" | "titular" | "suplente" | null }[],
  options?: { horaCitacion?: string | null }
) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }

  const supabase = await createAdminClient();

  const matchAccess = await canUserAccessMatch(supabase, context, matchId);
  if (!matchAccess.allowed || !matchAccess.match) {
    return { success: false, error: matchAccess.reason || "No tienes acceso a este partido" };
  }

  if (matchAccess.match.season_id) {
    const editable = await isSeasonEditable(matchAccess.match.season_id, context.profile.club_id);
    if (!editable) {
      return { success: false, error: "No se pueden modificar datos de una temporada cerrada." };
    }
  }

  // 1. Si se proporciona hora de citación, actualizarla en la tabla partidos
  if (options && options.horaCitacion !== undefined) {
    await supabase
      .from('partidos')
      .update({ hora_citacion: options.horaCitacion })
      .eq('id', matchId);
  }

  // 2. Consultar convocatorias previas para detectar jugadores que pasan a ser DESCONVOCADOS
  const { data: existingConvs } = await supabase
    .from('convocatorias')
    .select('player_id, status, asistencia_confirmada_familia')
    .eq('partido_id', matchId);

  const existingMap = new Map<string, { status: string | null, asistencia_confirmada_familia: boolean | null }>();
  existingConvs?.forEach(c => existingMap.set(c.player_id, { status: c.status, asistencia_confirmada_familia: c.asistencia_confirmada_familia }));

  const unconvokedPlayerIds: string[] = [];

  let hasError = false;
  let lastError = null;

  for (const update of updates) {
    const prev = existingMap.get(update.playerId);
    const wasConvoked = prev && (prev.status === 'convocado' || prev.status === 'titular' || prev.status === 'suplente');
    const isNowUnconvoked = update.status === 'no_convocado' || update.status === null;

    if (wasConvoked && isNowUnconvoked) {
      unconvokedPlayerIds.push(update.playerId);
    }

    if (update.status === null) {
      const { error } = await supabase
        .from("convocatorias")
        .delete()
        .eq("partido_id", matchId)
        .eq("player_id", update.playerId);
      if (error) { console.error("Error deleting:", error); hasError = true; lastError = error; }
    } else {
      const { data: existing } = await supabase
        .from("convocatorias")
        .select("id")
        .eq("partido_id", matchId)
        .eq("player_id", update.playerId)
        .single();

      const payload: Record<string, any> = { status: update.status };
      // Al desconvocar, resetear confirmación previa para que empiece de cero si se vuelve a convocar
      if (isNowUnconvoked) {
        payload.asistencia_confirmada_familia = false;
        payload.estado_asistencia = 'Pendiente';
      }

      if (existing) {
        const { error } = await supabase
          .from("convocatorias")
          .update(payload)
          .eq("id", existing.id);
        if (error) { console.error("Error updating:", error); hasError = true; lastError = error; }
      } else {
        const { error } = await supabase
          .from("convocatorias")
          .insert({ partido_id: matchId, player_id: update.playerId, ...payload });
        if (error) { console.error("Error inserting:", error); hasError = true; lastError = error; }
      }
    }
  }

  // 3. Notificar automáticamente a las familias de los jugadores desconvocados
  if (unconvokedPlayerIds.length > 0) {
    try {
      const match = matchAccess.match;
      const { data: matchTeam } = await supabase
        .from('teams')
        .select('name')
        .eq('id', match.equipo_id)
        .maybeSingle();

      const teamName = matchTeam?.name || 'Equipo';
      const rivalName = match.rival_nombre || 'Rival';
      const matchDate = match.fecha_hora ? new Date(match.fecha_hora).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Próximamente';
      const matchTime = match.fecha_hora ? new Date(match.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '';

      const { data: players } = await supabase
        .from('players')
        .select('id, first_name, last_name, tutor_id, user_auth_id, email, tutor_email, parent1_email, tutor:profiles!players_tutor_id_fkey(email)')
        .in('id', unconvokedPlayerIds);

      // Also query player_tutors to include linked guardians (crucial for players linked via player_tutors!)
      const { data: linkedTutors } = await supabase
        .from('player_tutors')
        .select('player_id, tutor_id, tutor:profiles(email)')
        .in('player_id', unconvokedPlayerIds);

      const linkedTutorsByPlayer = new Map<string, Array<{ tutorId: string, email?: string }>>();
      linkedTutors?.forEach((lt: any) => {
        if (lt.player_id && lt.tutor_id) {
          const arr = linkedTutorsByPlayer.get(lt.player_id) || [];
          arr.push({ tutorId: lt.tutor_id, email: lt.tutor?.email });
          linkedTutorsByPlayer.set(lt.player_id, arr);
        }
      });

      const unconvokeDispatches: any[] = [];
      for (const p of (players || [])) {
        const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
        const primaryTutorId = p.tutor_id || p.user_auth_id;
        const primaryEmail = (p.tutor as any)?.email || p.tutor_email || p.parent1_email || p.email;

        const emailHtml = getUnconvocationEmailHtml({
          playerName: fullName,
          teamName,
          rivalName,
          date: matchDate,
          time: matchTime ? `${matchTime} h` : undefined,
          viewUrl: `https://app.clubsportingsaladar.com/dashboard/family/e/${p.id}/partidos`,
        });

        const targets: Array<{ userId: string; email?: string }> = [];
        if (primaryTutorId) {
          targets.push({ userId: primaryTutorId, email: primaryEmail });
        }

        const extraTutors = linkedTutorsByPlayer.get(p.id) || [];
        for (const et of extraTutors) {
          if (et.tutorId && !targets.some(t => t.userId === et.tutorId)) {
            targets.push({ userId: et.tutorId, email: et.email });
          }
        }

        for (const target of targets) {
          unconvokeDispatches.push({
            userId: target.userId,
            userEmail: target.email,
            clubId: match.club_id,
            type: 'GENERAL_ALERT' as const,
            title: `⚽ Actualización de Convocatoria: ${teamName} vs ${rivalName}`,
            content: `${p.first_name} no está convocado/a finalmente para el partido vs ${rivalName}. No es necesario que acuda al encuentro.`,
            link: `/dashboard/family/e/${p.id}/partidos`,
            channels: ['IN_APP' as const, 'EMAIL' as const],
            idempotencyKey: `unconvoke:${matchId}:${p.id}:${target.userId}:${Date.now()}`,
            emailSubject: `Actualización Convocatoria: ${teamName} vs ${rivalName}`,
            emailHtml,
            metadata: { matchId, playerId: p.id, unconvoked: true },
          });
        }
      }

      if (unconvokeDispatches.length > 0) {
        try {
          const targetUserIds = unconvokeDispatches.map(d => d.userId).filter(Boolean);
          if (targetUserIds.length > 0) {
            await supabase
              .from('notifications')
              .update({ is_read: true })
              .in('user_id', targetUserIds)
              .ilike('content', `%${rivalName}%`)
              .ilike('content', '%ha sido convocado%');
          }
        } catch (markErr) {
          console.warn('[updateConvocatoriaBatch] Error marking previous convocation notifications read:', markErr);
        }
        await NotificationService.dispatchBatch({ notifications: unconvokeDispatches });
      }
    } catch (unconvErr) {
      console.error('[updateConvocatoriaBatch] Error notifying unconvoked players:', unconvErr);
    }
  }

  if (hasError) {
    return { success: false, error: lastError };
  }

  revalidatePath('/dashboard', 'layout');
  return { success: true };
}


export async function sendConvocatoriaAlerts(matchId: string, teamId: string, playerIds: string[]) {
  const adminSupabase = await createAdminClient()

  // 1. Obtener detalles del partido con su hora_citacion
  const { data: match } = await adminSupabase
    .from('partidos')
    .select('id, rival_nombre, fecha_hora, hora_citacion, lugar, notas, club_id, equipo:teams(name)')
    .eq('id', matchId)
    .single()

  const matchTitle = match ? `Partido vs ${match.rival_nombre}` : 'Nuevo Partido'
  const teamRel = match?.equipo as unknown
  const teamName = Array.isArray(teamRel) ? (teamRel[0] as { name?: string })?.name || 'Equipo' : (teamRel as { name?: string })?.name || 'Equipo'
  const matchDate = match?.fecha_hora ? new Date(match.fecha_hora).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Próximamente'
  const matchTime = match?.fecha_hora ? new Date(match.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Por confirmar'

  // Calcular hora de citación: hora_citacion explícita o defecto 60 min antes
  const citacionMs = match?.hora_citacion
    ? new Date(match.hora_citacion).getTime()
    : (match?.fecha_hora ? new Date(match.fecha_hora).getTime() - 60 * 60 * 1000 : null)
  const citacionTime = citacionMs
    ? new Date(citacionMs).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : null
  const citacionText = citacionTime ? `${citacionTime} h` : '60 min antes del partido'

  // 2. Obtener jugadores con tutor_id y correos de contacto
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

  // 3. Construir lista de notificaciones con ambas horas claramente destacadas
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
      time: matchTime ? `${matchTime} h` : undefined,
      meetingTime: citacionText,
      location: match?.lugar || 'Campo Oficial',
      notes: match?.notas || undefined,
      viewUrl: `https://app.clubsportingsaladar.com/dashboard/family/e/${p.id}/partidos`,
    })

    const notificationContent = `${p.first_name} ha sido convocado/a para el partido vs ${match?.rival_nombre || 'Rival'}.\n📍 Citación en el campo: ${citacionText} | ⏱️ Inicio: ${matchTime} h.`

    if (targetUserId) {
      dispatchItems.push({
        userId: targetUserId,
        userEmail: targetEmail,
        clubId: match?.club_id,
        type: 'NEW_CONVOCATION' as const,
        title: `⚽ Convocatoria: ${matchTitle}`,
        content: notificationContent,
        link: `/dashboard/family/e/${p.id}/partidos`,
        channels: ['IN_APP' as const, 'EMAIL' as const],
        idempotencyKey: `convocation:${matchId}:${p.id}:${targetUserId}:${Date.now()}`,
        emailSubject: `⚽ Convocatoria Oficial: ${teamName} vs ${match?.rival_nombre}`,
        emailHtml,
        metadata: { matchId, playerId: p.id, horaCitacion: citacionText },
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
          content: notificationContent,
          link: `/dashboard/family/e/${p.id}/partidos`,
          channels: ['IN_APP' as const, 'EMAIL' as const],
          idempotencyKey: `convocation:${matchId}:${p.id}:${et.tutorId}:${Date.now()}`,
          emailSubject: `⚽ Convocatoria Oficial: ${teamName} vs ${match?.rival_nombre}`,
          emailHtml,
          metadata: { matchId, playerId: p.id, horaCitacion: citacionText },
        })
      }
    }
  }

  if (dispatchItems.length > 0) {
    try {
      const allTargetUserIds = dispatchItems.map(d => d.userId).filter(Boolean);
      if (allTargetUserIds.length > 0) {
        await adminSupabase
          .from('notifications')
          .update({ is_read: true })
          .in('user_id', allTargetUserIds)
          .ilike('content', `%${match?.rival_nombre || ''}%`)
          .ilike('content', '%no está convocado%');
      }
    } catch (cleanErr) {
      console.warn('[sendConvocatoriaAlerts] Error cleaning unconvoke notifications:', cleanErr);
    }

    await NotificationService.dispatchBatch({ notifications: dispatchItems });
  }

  console.log(`[ALERTA CONVOCATORIA ENVIADA] Partido ${matchId}: ${dispatchItems.length} alertas despachadas.`)
  return { success: true, message: `Alertas enviadas a ${dispatchItems.length} destinatarios.` }
}

export async function getAvailableLowerCategoryPlayersAction(matchId: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado", players: [], targetCategory: null };
  }

  const supabase = await createAdminClient();
  const matchAccess = await canUserAccessMatch(supabase, context, matchId);
  if (!matchAccess.allowed || !matchAccess.match) {
    return { success: false, error: matchAccess.reason || "No tienes acceso a este partido", players: [], targetCategory: null };
  }

  const clubId = context.profile.club_id;

  // 1. Obtener la temporada y el equipo del partido
  const { data: matchData } = await supabase
    .from('partidos')
    .select('season_id, equipo_id, equipo:teams(id, name, category, season_id)')
    .eq('id', matchId)
    .single();

  const team = (Array.isArray(matchData?.equipo) ? matchData?.equipo[0] : matchData?.equipo) as { name?: string, category?: string, season_id?: string } | undefined;
  const teamName = team?.name || '';
  const teamCategory = team?.category || '';

  const config = detectLowerCategoryTarget(teamName, teamCategory);
  if (!config) {
    return { success: true, players: [], targetCategory: null };
  }

  let targetSeasonId = matchData?.season_id || team?.season_id;
  if (!targetSeasonId) {
    const { data: activeSeason } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .single();
    targetSeasonId = activeSeason?.id;
  }

  // 2. Obtener los equipos de la categoría inferior del club para esa temporada
  // Aislamiento estricto de temporadas: excluir temporada cerrada 25/26
  let teamsQuery = supabase
    .from('teams')
    .select('id, name, category, season_id')
    .eq('club_id', clubId)
    .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c');

  if (targetSeasonId) {
    teamsQuery = teamsQuery.eq('season_id', targetSeasonId);
  }

  if (config.target === 'Juvenil') {
    teamsQuery = teamsQuery.or('name.ilike.%juvenil%,category.ilike.%juvenil%');
  } else if (config.target === 'Cadete') {
    teamsQuery = teamsQuery.or('name.ilike.%cadete%,category.ilike.%cadet%');
  } else if (config.target === 'Infantil') {
    teamsQuery = teamsQuery.or('name.ilike.%infantil%,category.ilike.%infantil%');
  }

  const { data: targetTeams, error: teamsErr } = await teamsQuery;

  if (teamsErr || !targetTeams || targetTeams.length === 0) {
    return { success: true, players: [], targetCategory: config.target };
  }

  const targetTeamIds = targetTeams.map(t => t.id);

  // 3. Obtener jugadores activos de la plantilla inferior mediante player_season_history
  let playersList: any[] = [];

  const { data: historyData, error: hErr } = await supabase
    .from('player_season_history')
    .select(`
      status,
      team_id,
      players!inner (id, first_name, last_name, dorsal, status, medical_notes, posicion, posicion_principal, teams(name, category))
    `)
    .in('team_id', targetTeamIds)
    .neq('status', 'inactive');

  if (!hErr && historyData && historyData.length > 0) {
    playersList = historyData.map((h: any) => ({
      ...h.players,
      team_id: h.team_id,
      posicion: h.players?.posicion_principal || h.players?.posicion
    }));
  } else {
    // Fallback: consulta directa a players
    const { data: directPlayers } = await supabase
      .from('players')
      .select('id, first_name, last_name, dorsal, status, medical_notes, posicion, posicion_principal, team_id, teams(name, category)')
      .in('team_id', targetTeamIds)
      .neq('status', 'inactive')
      .order('first_name');

    playersList = directPlayers || [];
  }

  // Filtrar si alguno tiene rol de entrenador / cuerpo técnico o estado inactivo
  const validPlayers = (playersList || []).filter(p => {
    if (p.status === 'inactive') return false;
    const pos = (p.posicion_principal || p.posicion || '').toLowerCase();
    return !pos.includes('entrenador') && !pos.includes('delegado') && !pos.includes('cuerpo técnico');
  });

  // Deduplicar estrictamente por id Y por nombre normalizado
  const uniquePlayersMap = new Map<string, any>();
  const seenNormalizedNames = new Set<string>();

  validPlayers.forEach(p => {
    const normalizedName = `${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!uniquePlayersMap.has(p.id) && !seenNormalizedNames.has(normalizedName)) {
      uniquePlayersMap.set(p.id, p);
      seenNormalizedNames.add(normalizedName);
    }
  });

  const sortedPlayers = Array.from(uniquePlayersMap.values()).sort((a, b) => 
    (a.first_name || '').localeCompare(b.first_name || '')
  );

  return { success: true, players: sortedPlayers, targetCategory: config.target };
}

export async function getAvailableJuvenilePlayersAction(matchId: string) {
  return getAvailableLowerCategoryPlayersAction(matchId);
}

export async function updateMatchDetails(
  matchId: string, 
  teamId: string, 
  updates: { 
    fecha_hora?: string, 
    hora_citacion?: string | null,
    lugar?: string, 
    rival_nombre?: string, 
    resultado_propio?: number | null, 
    resultado_rival?: number | null, 
    estado?: string, 
    rsvp_reminder_time?: string | null, 
    tipo_partido?: string 
  }
) {
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

export async function saveMatchReport(
  matchId: string, 
  report: { 
    coach_rating?: number, 
    coach_summary?: string, 
    positive_aspects?: string, 
    improvement_aspects?: string, 
    attitude_notes?: string,
    coach_report?: any 
  }
) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }
  const adminSupabase = await createAdminClient();
  const access = await canUserAccessMatch(adminSupabase, context, matchId);
  if (!access.allowed || !access.match) {
    return { success: false, error: access.reason || "No tienes acceso a este partido" };
  }

  // Si se incluye coach_report, hacer merge con el existente si ya contiene campos (como la foto)
  const updatePayload: any = { ...report };
  if (report.coach_report) {
    const { data: currentMatch } = await adminSupabase
      .from('partidos')
      .select('coach_report')
      .eq('id', matchId)
      .single();
    const existingReport = (typeof currentMatch?.coach_report === 'object' && currentMatch?.coach_report) ? currentMatch.coach_report : {};
    updatePayload.coach_report = {
      ...existingReport,
      ...report.coach_report
    };
  }

  await adminSupabase.from('partidos').update(updatePayload).eq('id', matchId);
  revalidatePath(`/dashboard/e/[teamId]/partidos/${matchId}`, 'page');
  return { success: true };
}

export async function uploadTeamPhotoAction(matchId: string, formData: FormData) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }
  const adminSupabase = await createAdminClient();
  const access = await canUserAccessMatch(adminSupabase, context, matchId);
  if (!access.allowed || !access.match) {
    return { success: false, error: access.reason || "No tienes acceso a este partido" };
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "No se seleccionó ningún archivo" };
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const filePath = `partidos/${matchId}/team_photo_${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await adminSupabase.storage
    .from("avatars")
    .upload(filePath, buffer, {
      contentType: file.type || 'image/jpeg',
      upsert: true
    });

  if (uploadError) {
    return { success: false, error: uploadError.message };
  }

  const { data: publicUrlData } = adminSupabase.storage
    .from("avatars")
    .getPublicUrl(filePath);

  const teamPhotoUrl = publicUrlData.publicUrl;

  // Obtener el coach_report existente y guardar la URL
  const { data: currentMatch } = await adminSupabase
    .from('partidos')
    .select('coach_report')
    .eq('id', matchId)
    .single();

  const existingReport = (typeof currentMatch?.coach_report === 'object' && currentMatch?.coach_report) ? currentMatch.coach_report : {};
  const updatedReport = {
    ...existingReport,
    team_photo_url: teamPhotoUrl
  };

  await adminSupabase
    .from('partidos')
    .update({ coach_report: updatedReport })
    .eq('id', matchId);

  revalidatePath(`/dashboard`, 'layout');
  return { success: true, teamPhotoUrl };
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
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || "No autenticado" };
    }

    if (!ADMIN_ROLES.includes(context.profile.role)) {
      return { success: false, error: "Solo los administradores pueden eliminar partidos" };
    }

    const adminClient = await createAdminClient();
    const matchAccess = await canUserAccessMatch(adminClient, context, matchId);
    if (!matchAccess.allowed) {
      return { success: false, error: matchAccess.reason || "No tienes permisos sobre este partido" };
    }
    
    const { error } = await adminClient
      .from("partidos")
      .delete()
      .eq("id", matchId)
      .eq("club_id", context.profile.club_id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/dashboard/matches`);
    if (teamId) {
      revalidatePath(`/dashboard/equipos/${teamId}/partidos`);
    }
    revalidatePath(`/live`);
    return { success: true };
  } catch (err: any) {
    console.error("deleteMatchAction exception:", err);
    return { success: false, error: err.message || "Error inesperado al eliminar el partido" };
  }
}


export async function createPartidoAction(teamId: string, data: { fecha_hora: string, hora_citacion?: string | null, lugar?: string, rival_nombre?: string, season_id?: string, tipo_partido?: string, estado?: string, resultado_propio?: number | null, resultado_rival?: number | null, rsvp_reminder_time?: string | null }) {
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

  let finalHoraCitacion = data.hora_citacion;
  if (!finalHoraCitacion && data.fecha_hora) {
    const ms = new Date(data.fecha_hora).getTime();
    if (!isNaN(ms)) {
      finalHoraCitacion = new Date(ms - 60 * 60 * 1000).toISOString();
    }
  }
  
  const { data: newMatch, error } = await supabase
    .from("partidos")
    .insert({
      club_id: profile.club_id,
      equipo_id: teamId,
      fecha_hora: data.fecha_hora,
      hora_citacion: finalHoraCitacion,
      lugar: data.lugar,
      rival_nombre: data.rival_nombre,
      estado: data.estado || 'Programado',
      resultado_propio: data.resultado_propio ?? null,
      resultado_rival: data.resultado_rival ?? null,
      tipo_partido: data.tipo_partido || 'liga',
      season_id: finalSeasonId,
      rsvp_reminder_time: data.rsvp_reminder_time || null
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
        goles: stat.goals,
        assists: stat.assists,
        asistencias: stat.assists,
        yellow_cards: stat.yellows,
        tarjetas_amarillas: stat.yellows,
        red_cards: stat.reds,
        tarjetas_rojas: stat.reds,
        minutes_played: stat.minutes,
        minutos_jugados: stat.minutes
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
      goles: report.goals,
      assists: report.assists,
      asistencias: report.assists,
      yellow_cards: report.yellows,
      tarjetas_amarillas: report.yellows,
      red_cards: report.reds,
      tarjetas_rojas: report.reds,
      minutes_played: report.minutes,
      minutos_jugados: report.minutes
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

    // 1. Intentar el procedimiento almacenado
    let rpcSuccess = false;
    try {
      const { data, error } = await supabase.rpc('reconcile_match_and_close', {
        p_partido_id: matchId,
        p_stats: stats,
        p_new_status: 'Finalizado'
      });
      if (!error && (data as any)?.success !== false) {
        rpcSuccess = true;
      }
    } catch (rpcErr) {
      console.warn("[reconcileMatchStatsAction] RPC failed, falling back to direct updates:", rpcErr);
    }

    // 2. Si el RPC falló (o violó restricciones de check), aplicar actualización directa robusta
    if (!rpcSuccess) {
      for (const st of (stats || [])) {
        if (!st.player_id) continue;
        const yellow = Number(st.yellow_cards || 0);
        const red = Number(st.red_cards || 0);
        const goals = Number(st.goals || 0);
        const assists = Number(st.assists || 0);
        const minutes = Number(st.minutes_played || 0);

        // Actualizar convocatoria existente por partido_id y player_id
        const { error: updErr } = await supabase
          .from('convocatorias')
          .update({
            yellow_cards: yellow,
            tarjetas_amarillas: yellow,
            red_cards: red,
            tarjetas_rojas: red,
            goals: goals,
            goles: goals,
            assists: assists,
            asistencias: assists,
            minutes_played: minutes,
            minutos_jugados: minutes
          })
          .eq('partido_id', matchId)
          .eq('player_id', st.player_id);

        if (updErr) {
          console.error(`[reconcileMatchStatsAction] Error updating conv for ${st.player_id}:`, updErr.message);
        }
      }

      // Marcar el partido como Finalizado
      await supabase
        .from('partidos')
        .update({ estado: 'Finalizado', updated_at: new Date().toISOString() })
        .eq('id', matchId);
    }

    revalidatePath('/dashboard', 'layout');
    revalidatePath('/dashboard/matches');
    return { success: true };
  } catch (err: any) {
    console.error("[reconcileMatchStatsAction] Exception:", err);
    return { success: false, error: err.message || "Error interno" };
  }
}


