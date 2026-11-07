'use server'

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedContext, canUserManageTeam, getUserAllRoles } from '@/lib/auth-helpers';
import { NotificationService } from '@/lib/notifications/notification-service';
import { getEventReminderEmailHtml } from '@/lib/email-service';


export async function createTeamEventAction(teamId: string, eventData: any, clientSeasonId?: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || 'No autorizado');
  }

  const adminClient = await createAdminClient();
  const teamAccess = await canUserManageTeam(adminClient, context, teamId);
  if (!teamAccess.allowed) {
    throw new Error(teamAccess.reason || 'No tienes permisos para crear eventos en este equipo');
  }

  const profile = context.profile;
  const userRoles = getUserAllRoles(context);

  let finalSeasonId = clientSeasonId;

  if (finalSeasonId) {
    const { data: targetSeason } = await adminClient.from('seasons').select('is_active, name').eq('id', finalSeasonId).single();
    const isOverride = targetSeason && targetSeason.name.includes('🔓') && (userRoles.includes('admin') || userRoles.includes('superadmin'));
    if (!targetSeason || (!targetSeason.is_active && !isOverride)) {
      throw new Error("No se pueden crear datos en una temporada cerrada.");
    }
  } else {
    const { data: activeSeason } = await adminClient.from('seasons').select('id').eq('club_id', profile.club_id).eq('is_active', true).single();
    if (!activeSeason) throw new Error("No hay temporada activa");
    finalSeasonId = activeSeason.id;
  }

  // Respetar fielmente la configuración del entrenador (fecha/hora personalizada o desactivado)
  const finalReminderTime = eventData.rsvp_reminder_time !== undefined 
    ? eventData.rsvp_reminder_time 
    : null;

  const { data, error } = await adminClient.from('team_events').insert({
    ...eventData,
    team_id: teamId,
    season_id: finalSeasonId,
    rsvp_reminder_time: finalReminderTime
  }).select().single();

  if (error) throw new Error(error.message);

  // Si se solicita notificar al equipo inmediatamente
  if (eventData.notify_team && data) {
    try {
      const { data: team } = await adminClient.from('teams').select('name').eq('id', teamId).single();
      const teamName = team?.name || 'Equipo';

      const { data: players } = await adminClient
        .from('players')
        .select('id, first_name, last_name, tutor_id, user_auth_id, email, tutor_email, parent1_email, tutor:profiles!players_tutor_id_fkey(email)')
        .eq('team_id', teamId);

      if (players && players.length > 0) {
        const eventTitle = data.title || (data.event_type === 'Entrenamiento' || data.event_type === 'training' ? 'Entrenamiento' : 'Evento de Equipo');
        const formattedDate = new Date(data.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        const formattedTime = data.start_time ? data.start_time.slice(0, 5) : 'Por confirmar';

        const dispatchList = players.map(p => {
          const targetUserId = p.tutor_id || p.user_auth_id;
          const targetEmail = (p.tutor as any)?.email || p.tutor_email || p.parent1_email || p.email;
          const isTraining = data.event_type === 'Entrenamiento' || data.event_type === 'training';

          return {
            userId: targetUserId,
            userEmail: targetEmail,
            clubId: profile.club_id,
            type: isTraining ? ('NEW_TRAINING' as const) : ('NEW_EVENT' as const),
            title: `📅 Nuevo ${eventTitle} - ${teamName}`,
            content: `Se ha programado una nueva sesión (${eventTitle}) para el ${formattedDate} a las ${formattedTime}.`,
            link: `/dashboard/family/e/${p.id}/eventos`,
            channels: ['IN_APP' as const, 'EMAIL' as const, 'PUSH' as const],
            idempotencyKey: `new_event:${data.id}:${p.id}:${targetUserId}`,
            emailSubject: `📅 [${teamName}] Nuevo ${eventTitle}: ${formattedDate}`,
            emailHtml: getEventReminderEmailHtml({
              playerName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
              title: eventTitle,
              eventType: isTraining ? 'Entrenamiento Oficial' : 'Evento de Club',
              date: formattedDate,
              time: formattedTime,
              location: data.location || 'Instalaciones del Club',
              viewUrl: `https://app-gestiondeclubes.vercel.app/dashboard/family/e/${p.id}/eventos`,
            }),
          };
        }).filter(item => Boolean(item.userId));

        if (dispatchList.length > 0) {
          await NotificationService.dispatchBatch({ notifications: dispatchList });
        }
      }
    } catch (notifErr) {
      console.error('[createTeamEventAction Notification Error]:', notifErr);
    }
  }

  // Programar avisos automáticos en Upstash QStash (Hooper -180m y RPE +90m)
  if (data?.id && data?.date && data?.start_time) {
    try {
      const { scheduleSessionQStashReminders } = await import('@/lib/performance/qstash-service');
      await scheduleSessionQStashReminders(
        {
          id: data.id,
          date: data.date,
          startTime: data.start_time,
          clubId: profile.club_id,
          teamId,
          title: data.title,
        },
        adminClient
      );
    } catch (qsErr) {
      console.warn('[createTeamEventAction QStash Warning]:', qsErr);
    }
  }

  revalidatePath(`/dashboard/equipos/${teamId}/calendario`);
  revalidatePath(`/dashboard/events`);
  return data;
}

export async function updateTeamEventAction(eventId: string, teamId: string, eventData: any) {

  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || 'No autorizado');
  }

  const adminClient = await createAdminClient();

  const teamAccess = await canUserManageTeam(adminClient, context, teamId);
  if (!teamAccess.allowed) {
    throw new Error(teamAccess.reason || 'No tienes permisos para modificar eventos de este equipo');
  }

  const { data: updatedEvent, error } = await adminClient
    .from('team_events')
    .update({
      ...eventData,
      rsvp_reminder_time: eventData.rsvp_reminder_time !== undefined ? eventData.rsvp_reminder_time : undefined
    })
    .eq('id', eventId)
    .eq('team_id', teamId)
    .select('id, date, start_time, title, teams(club_id)')
    .maybeSingle();

  if (error) throw new Error(error.message);

  // Reprogramar en Upstash QStash si cambiaron fecha u hora de inicio
  if (updatedEvent?.date && updatedEvent?.start_time) {
    try {
      const { scheduleSessionQStashReminders } = await import('@/lib/performance/qstash-service');
      const clubId = (updatedEvent.teams as any)?.club_id || context.profile.club_id;
      await scheduleSessionQStashReminders(
        {
          id: updatedEvent.id,
          date: updatedEvent.date,
          startTime: updatedEvent.start_time,
          clubId,
          teamId,
          title: updatedEvent.title,
        },
        adminClient
      );
    } catch (qsErr) {
      console.warn('[updateTeamEventAction QStash Warning]:', qsErr);
    }
  }

  revalidatePath(`/dashboard/equipos/${teamId}/calendario`);
  revalidatePath(`/dashboard/events`);
  return true;
}

export async function deleteTeamEventAction(eventId: string, teamId: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    throw new Error(authError || 'No autorizado');
  }

  const adminClient = await createAdminClient();

  const teamAccess = await canUserManageTeam(adminClient, context, teamId);
  if (!teamAccess.allowed) {
    throw new Error(teamAccess.reason || 'No tienes permisos para eliminar eventos de este equipo');
  }

  // 1. Cancelar avisos pendientes en Upstash QStash
  try {
    const { cancelSessionQStashReminders } = await import('@/lib/performance/qstash-service');
    await cancelSessionQStashReminders(eventId, context.profile.club_id, adminClient);
  } catch (qsErr) {
    console.warn('[deleteTeamEventAction QStash Warning]:', qsErr);
  }

  // 2. Eliminar de base de datos
  const { error } = await adminClient.from('team_events').delete().eq('id', eventId).eq('team_id', teamId);
  if (error) throw new Error(error.message);

  revalidatePath(`/dashboard/equipos/${teamId}/calendario`);
  revalidatePath(`/dashboard/events`);
  return true;
}

