'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function closeSeason(seasonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error('Solo los administradores pueden cerrar temporadas');

  // Quitar el candado si lo tuviera, y poner is_active = false
  const { data: season } = await supabase.from('seasons').select('name').eq('id', seasonId).single();
  let name = season?.name || '';
  name = name.replace(' 🔓', '');

  const { error } = await supabase
    .from('seasons')
    .update({ is_active: false, name })
    .eq('id', seasonId)
    .eq('club_id', profile.club_id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/temporadas');
  return true;
}

export async function startNewSeason(data: { name: string, start_date: string, end_date: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error('Solo los administradores pueden crear temporadas');

  // 1. Desactivar todas las temporadas actuales
  await supabase.from('seasons').update({ is_active: false }).eq('club_id', profile.club_id);
  
  // (Limpiar candados de reabiertas)
  const { data: openedSeasons } = await supabase.from('seasons').select('id, name').eq('club_id', profile.club_id).like('name', '%🔓%');
  for (const s of openedSeasons || []) {
    await supabase.from('seasons').update({ name: s.name.replace(' 🔓', '') }).eq('id', s.id);
  }

  // 2. Crear nueva temporada activa
  const { error } = await supabase.from('seasons').insert({
    club_id: profile.club_id,
    name: data.name,
    start_date: data.start_date,
    end_date: data.end_date,
    is_active: true
  });

  if (error) throw new Error(error.message);
  revalidatePath('/admin/temporadas');
  return true;
}

export async function reopenSeason(seasonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error('Solo los administradores pueden usar la Llave Maestra');

  const { data: season } = await supabase.from('seasons').select('name').eq('id', seasonId).single();
  if (!season) throw new Error('Temporada no encontrada');
  
  if (season.name.includes('🔓')) return true; // Ya está reabierta

  const { error } = await supabase
    .from('seasons')
    .update({ name: season.name + ' 🔓' })
    .eq('id', seasonId)
    .eq('club_id', profile.club_id);

  if (error) throw new Error(error.message);
  revalidatePath('/admin/temporadas');
  return true;
}

export async function bulkEnrollPlayers(seasonId: string, enrollments: {playerId: string, teamId: string | null}[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error('Solo los administradores pueden hacer matriculaciones masivas');

  const { data: season } = await supabase.from('seasons').select('id, is_active, name').eq('id', seasonId).eq('club_id', profile.club_id).single();
  if (!season) throw new Error('Temporada no encontrada');

  let hasErrors = false;

  for (const enr of enrollments) {
    if (!enr.teamId) {
      await supabase.from('player_season_history').update({ status: 'inactive' }).eq('player_id', enr.playerId).eq('season_id', seasonId);
    } else {
      const { data: existing } = await supabase.from('player_season_history').select('id').eq('player_id', enr.playerId).eq('season_id', seasonId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('player_season_history').update({ team_id: enr.teamId, status: 'active' }).eq('id', existing.id);
        if (error) hasErrors = true;
      } else {
        const { error } = await supabase.from('player_season_history').insert({ player_id: enr.playerId, team_id: enr.teamId, season_id: seasonId, club_id: profile.club_id, status: 'active' });
        if (error) hasErrors = true;
      }
      
      if (season.is_active) {
        await supabase.from('players').update({ team_id: enr.teamId, status: 'active' }).eq('id', enr.playerId);
      }
    }
  }

  revalidatePath('/dashboard/club/miembros');
  revalidatePath('/dashboard/equipos');
  return { success: !hasErrors };
}

export async function cloneTeamsAction(seasonId: string, teamIdsToClone: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error('Solo los administradores pueden clonar equipos');

  const { data: season } = await supabase.from('seasons').select('id, club_id').eq('id', seasonId).eq('club_id', profile.club_id).single();
  if (!season) throw new Error('Temporada no encontrada');

  // Fetch the teams to clone
  const { data: oldTeams } = await supabase
    .from('teams')
    .select('name, category, color')
    .in('id', teamIdsToClone)
    .eq('club_id', profile.club_id);

  if (!oldTeams || oldTeams.length === 0) return { success: true };

  // Prepare new teams data
  const newTeamsData = oldTeams.map(t => ({
    ...t,
    season_id: seasonId,
    club_id: profile.club_id,
    members: 0,
    coaches: 0
  }));

  const { error } = await supabase.from('teams').insert(newTeamsData);

  if (error) throw new Error(error.message);
  
  revalidatePath('/dashboard/equipos');
  revalidatePath('/admin/temporadas/asistente');
  return { success: true };
}
