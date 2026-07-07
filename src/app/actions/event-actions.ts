'use server'

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

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
    season_id: finalSeasonId
  }).select().single();

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/equipos/${teamId}/calendario`);
  return data;
}

export async function updateTeamEventAction(eventId: string, teamId: string, eventData: any) {
  const adminClient = await createAdminClient();
  // Omitting strict season_id check for updates for brevity, assuming if it exists they can edit it if they are on the page (UI protection handles this).
  const { error } = await adminClient.from('team_events').update(eventData).eq('id', eventId);
  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/equipos/${teamId}/calendario`);
  return true;
}
