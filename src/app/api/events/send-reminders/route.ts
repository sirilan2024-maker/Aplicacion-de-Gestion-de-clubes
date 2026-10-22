import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NotificationService } from '@/lib/notifications/notification-service'
import { getEventReminderEmailHtml, getConvocationEmailHtml } from '@/lib/email-service'

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronAuthorized) {
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const authSupabase = await createClient();
        const { data: { user } } = await authSupabase.auth.getUser();
        if (!user) {
          return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }
        const { data: profile } = await authSupabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (!profile || !['admin', 'superadmin', 'coordinador', 'directivo'].includes(profile.role)) {
          return NextResponse.json({ error: 'Rol insuficiente para ejecutar recordatorios' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    const supabase = await createAdminClient()
    const nowISO = new Date().toISOString()

    // 1. Encontrar eventos de equipo programados para recordar AHORA o en el PASADO y que NO se hayan enviado
    const { data: events } = await supabase
      .from('team_events')
      .select('id, title, date, start_time, location, event_type, team_id, teams(name, club_id)')
      .lte('rsvp_reminder_time', nowISO)
      .eq('rsvp_reminder_sent', false)

    // 2. Encontrar partidos programados para recordar AHORA o en el PASADO y que NO se hayan enviado
    const { data: partidos } = await supabase
      .from('partidos')
      .select('id, rival_nombre, fecha_hora, lugar, notas, equipo_id, equipos:equipo_id(name, club_id)')
      .lte('rsvp_reminder_time', nowISO)
      .eq('rsvp_reminder_sent', false)

    let totalProcessed = 0
    let totalSent = 0
    let totalFailed = 0
    let totalSkipped = 0

    // PROCESAR RECORDATORIOS DE EVENTOS / ENTRENAMIENTOS
    if (events && events.length > 0) {
      for (const ev of events) {
        totalProcessed++
        const clubId = (ev.teams as any)?.club_id
        const teamName = (ev.teams as any)?.name || 'Equipo'
        const isTraining = ev.event_type === 'Entrenamiento' || ev.event_type === 'training'
        const eventTitle = ev.title || (isTraining ? 'Entrenamiento' : 'Evento de Equipo')
        const formattedDate = new Date(ev.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
        const formattedTime = ev.start_time ? ev.start_time.slice(0, 5) : 'Por confirmar'

        const { data: players } = await supabase
          .from('players')
          .select('id, first_name, last_name, tutor_id, user_auth_id, email, tutor_email, parent1_email, tutor:profiles!players_tutor_id_fkey(email)')
          .eq('team_id', ev.team_id)

        if (players && players.length > 0) {
          const dispatchList = players.map(p => {
            const targetUserId = p.tutor_id || p.user_auth_id
            const targetEmail = (p.tutor as any)?.email || p.tutor_email || p.parent1_email || p.email
            const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim()

            return {
              userId: targetUserId,
              userEmail: targetEmail,
              clubId: clubId,
              type: (isTraining ? 'TRAINING_REMINDER' : 'EVENT_REMINDER') as any,
              title: `⏰ Recordatorio: ${eventTitle} (${teamName})`,
              content: `Recordatorio de cita para ${p.first_name}: ${eventTitle} el ${formattedDate} a las ${formattedTime}.`,
              link: `/dashboard/family/e/${p.id}/eventos`,
              channels: ['IN_APP' as const, 'EMAIL' as const, 'PUSH' as const],
              idempotencyKey: `reminder:event:${ev.id}:${p.id}:${targetUserId}`,
              emailSubject: `⏰ Recordatorio (Próximas 24h): ${eventTitle} - ${teamName}`,
              emailHtml: getEventReminderEmailHtml({
                playerName: fullName,
                title: eventTitle,
                eventType: isTraining ? 'Entrenamiento' : 'Evento',
                date: formattedDate,
                time: formattedTime,
                location: ev.location || 'Instalaciones del Club',
                viewUrl: `https://app-gestiondeclubes.vercel.app/dashboard/family/e/${p.id}/eventos`,
              }),
            }
          }).filter(item => Boolean(item.userId))

          if (dispatchList.length > 0) {
            const res = await NotificationService.dispatchBatch({ notifications: dispatchList })
            totalSent += res.successful
            totalFailed += res.failed
            totalSkipped += res.skipped
          }
        }

        // Marcar como enviado una vez procesado el lote
        await supabase
          .from('team_events')
          .update({ rsvp_reminder_sent: true })
          .eq('id', ev.id)
      }
    }

    // PROCESAR RECORDATORIOS DE PARTIDOS
    if (partidos && partidos.length > 0) {
      for (const p of partidos) {
        totalProcessed++
        const clubId = (p as any).equipos?.club_id
        const teamName = (p as any).equipos?.name || 'Equipo'
        const matchDate = p.fecha_hora ? new Date(p.fecha_hora).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Próximamente'
        const matchTime = p.fecha_hora ? new Date(p.fecha_hora).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : 'Por confirmar'

        const { data: convocatorias } = await supabase
          .from('convocatorias')
          .select('player_id, players(id, first_name, last_name, tutor_id, user_auth_id, email, tutor_email, parent1_email, tutor:profiles!players_tutor_id_fkey(email))')
          .eq('partido_id', p.id)
          .eq('status', 'convocado')

        if (convocatorias && convocatorias.length > 0) {
          const dispatchList = convocatorias.map(c => {
            const pl = c.players as any
            if (!pl) return null
            const targetUserId = pl.tutor_id || pl.user_auth_id
            const targetEmail = (pl.tutor as any)?.email || pl.tutor_email || pl.parent1_email || pl.email
            const fullName = `${pl.first_name || ''} ${pl.last_name || ''}`.trim()

            return {
              userId: targetUserId,
              userEmail: targetEmail,
              clubId: clubId,
              type: 'MATCH_REMINDER' as const,
              title: `⚽ Recordatorio de Partido: ${teamName} vs ${p.rival_nombre || 'Rival'}`,
              content: `Recordatorio de partido para ${pl.first_name}: ${teamName} vs ${p.rival_nombre || 'Rival'} el ${matchDate} a las ${matchTime}.`,
              link: `/dashboard/family/e/${pl.id}/partidos`,
              channels: ['IN_APP' as const, 'EMAIL' as const, 'PUSH' as const],
              idempotencyKey: `reminder:match:${p.id}:${pl.id}:${targetUserId}`,
              emailSubject: `⚽ Recordatorio de Partido: ${teamName} vs ${p.rival_nombre}`,
              emailHtml: getConvocationEmailHtml({
                playerName: fullName,
                teamName,
                rivalName: p.rival_nombre || 'Rival',
                date: matchDate,
                time: matchTime,
                location: p.lugar || 'Campo Oficial',
                notes: p.notas || undefined,
                viewUrl: `https://app-gestiondeclubes.vercel.app/dashboard/family/e/${pl.id}/partidos`,
              }),
            }
          }).filter(Boolean) as any[]

          if (dispatchList.length > 0) {
            const res = await NotificationService.dispatchBatch({ notifications: dispatchList })
            totalSent += res.successful
            totalFailed += res.failed
            totalSkipped += res.skipped
          }
        }

        // Marcar como enviado una vez procesado el lote
        await supabase
          .from('partidos')
          .update({ rsvp_reminder_sent: true })
          .eq('id', p.id)
      }
    }

    // 3. PROCESAR RECORDATORIOS DE RENDIMIENTO (Bienestar Previo y Feedback Post-Entrenamiento)
    try {
      const { evaluateReminderEligibility } = await import('@/lib/performance/reminders-service')
      const { getSpainDateString } = await import('@/lib/performance/wellness-service')
      const todayISO = getSpainDateString(new Date())

      // Consultar sesiones de entrenamiento de hoy con horarios definidos
      const { data: todayTrainings } = await supabase
        .from('team_events')
        .select('id, title, date, start_time, end_time, team_id, teams(name, club_id)')
        .eq('date', todayISO)
        .not('start_time', 'is', null)

      if (todayTrainings && todayTrainings.length > 0) {
        for (const training of todayTrainings) {
          const clubId = (training.teams as any)?.club_id
          const teamName = (training.teams as any)?.name || 'Equipo'
          const schedule = {
            eventId: training.id,
            date: training.date,
            startTime: training.start_time,
            endTime: training.end_time,
            title: training.title,
            teamId: training.team_id,
            teamName,
            clubId
          }

          const { data: players } = await supabase
            .from('players')
            .select('id, first_name, last_name, tutor_id, user_auth_id, email, tutor_email, parent1_email, tutor:profiles!players_tutor_id_fkey(email)')
            .eq('team_id', training.team_id)

          if (!players || players.length === 0) continue

          // Consultar registros ya completados para esta sesión
          const { data: completedWellness } = await supabase
            .from('player_daily_wellness')
            .select('player_id')
            .eq('date', training.date)
            .in('player_id', players.map(p => p.id))

          const completedWellnessIds = new Set((completedWellness || []).map(w => w.player_id))

          const { data: completedFeedback } = await supabase
            .from('player_session_feedback')
            .select('player_id')
            .eq('event_id', training.id)
            .in('player_id', players.map(p => p.id))

          const completedFeedbackIds = new Set((completedFeedback || []).map(f => f.player_id))

          const performanceNotifications: any[] = []

          for (const player of players) {
            const playerInfo = {
              id: player.id,
              firstName: player.first_name,
              lastName: player.last_name,
              userAuthId: player.user_auth_id,
              tutorId: player.tutor_id,
              email: player.email,
              tutorEmail: (player.tutor as any)?.email || player.tutor_email || player.parent1_email,
            }

            // A. Evaluar aviso de Bienestar Previo
            const wellnessEval = evaluateReminderEligibility({
              reminderType: 'WELLNESS_REMINDER',
              schedule,
              player: playerInfo,
              isFormCompleted: completedWellnessIds.has(player.id)
            })

            if (wellnessEval.eligible && wellnessEval.recipient?.userId) {
              performanceNotifications.push({
                userId: wellnessEval.recipient.userId,
                userEmail: wellnessEval.recipient.email,
                clubId,
                type: 'WELLNESS_REMINDER' as const,
                title: `🔋 Cuestionario de Bienestar: ${training.title || 'Entrenamiento'}`,
                content: `Hola ${wellnessEval.recipient.displayName}. Por favor completa el estado físico previo de ${player.first_name} antes del entrenamiento.`,
                link: `/wellness/${training.id}?p=${player.id}`,
                channels: ['IN_APP' as const, 'EMAIL' as const, 'PUSH' as const],
                idempotencyKey: wellnessEval.idempotencyKey,
                emailSubject: `🔋 Bienestar previo: ${training.title || 'Entrenamiento'} - ${teamName}`,
              })
            }

            // B. Evaluar aviso de Feedback Post-Entrenamiento (RPE)
            if (training.end_time) {
              const feedbackEval = evaluateReminderEligibility({
                reminderType: 'SESSION_FEEDBACK_REMINDER',
                schedule,
                player: playerInfo,
                isFormCompleted: completedFeedbackIds.has(player.id)
              })

              if (feedbackEval.eligible && feedbackEval.recipient?.userId) {
                performanceNotifications.push({
                  userId: feedbackEval.recipient.userId,
                  userEmail: feedbackEval.recipient.email,
                  clubId,
                  type: 'SESSION_FEEDBACK_REMINDER' as const,
                  title: `📊 Valoración de Esfuerzo (RPE): ${training.title || 'Entrenamiento'}`,
                  content: `Hola ${feedbackEval.recipient.displayName}. Registra el esfuerzo percibido y minutos de ${player.first_name} en la sesión.`,
                  link: `/feedback/${training.id}?p=${player.id}`,
                  channels: ['IN_APP' as const, 'EMAIL' as const, 'PUSH' as const],
                  idempotencyKey: feedbackEval.idempotencyKey,
                  emailSubject: `📊 Valoración de sesión (RPE): ${training.title || 'Entrenamiento'} - ${teamName}`,
                })
              }
            }
          }

          if (performanceNotifications.length > 0) {
            totalProcessed += performanceNotifications.length
            const res = await NotificationService.dispatchBatch({ notifications: performanceNotifications })
            totalSent += res.successful
            totalFailed += res.failed
            totalSkipped += res.skipped
          }
        }
      }
    } catch (perfRemError: any) {
      console.warn('[send-reminders] Error evaluando recordatorios de rendimiento:', perfRemError?.message || perfRemError)
    }

    const duration = Date.now() - startTime
    console.log(`[send-reminders OK] ${totalProcessed} actividades procesadas (${totalSent} enviados, ${totalSkipped} omitidos, ${totalFailed} fallidos) en ${duration}ms`)

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      sent: totalSent,
      skipped: totalSkipped,
      failed: totalFailed,
      durationMs: duration,
    })
  } catch (error: any) {
    console.error('[API] Error send-reminders:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}

