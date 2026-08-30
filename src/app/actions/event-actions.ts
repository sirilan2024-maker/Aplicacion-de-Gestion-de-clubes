'use server'

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedContext, canUserManageTeam } from '@/lib/auth-helpers';


export async function createTeamEventAction(teamId: string, eventData: any, clientSeasonId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single();
  if (!profile?.club_id) throw new Error('No se pudo obtener el club');

  let finalSeasonId = clientSeasonId;

  if (finalSeasonId) {
    const { data: targetSeason } = await supabase.from('seasons').select('is_active, name').eq('id', finalSeasonId).single();
    const isOverride = targetSeason && targetSeason.name.includes('🔓') && profile.role === 'admin';
    if (!targetSeason || (!targetSeason.is_active && !isOverride)) {
      throw new Error("No se pueden crear datos en una temporada cerrada.");
    }
  } else {
    const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', profile.club_id).eq('is_active', true).single();
    if (!activeSeason) throw new Error("No hay temporada activa");
    finalSeasonId = activeSeason.id;
  }

  const adminClient = await createAdminClient();
  const { data, error } = await adminClient.from('team_events').insert({
    ...eventData,
    team_id: teamId,
    season_id: finalSeasonId,
    rsvp_reminder_time: eventData.rsvp_reminder_time || null
  }).select().single();

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/equipos/${teamId}/calendario`);
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

  const { error } = await adminClient.from('team_events').update({
    ...eventData,
    rsvp_reminder_time: eventData.rsvp_reminder_time !== undefined ? eventData.rsvp_reminder_time : undefined
  }).eq('id', eventId).eq('team_id', teamId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/equipos/${teamId}/calendario`);
  return true;
}

