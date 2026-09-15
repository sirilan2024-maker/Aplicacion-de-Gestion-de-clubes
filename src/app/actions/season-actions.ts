'use server'

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { assertSeasonEditable } from '@/lib/season-utils';

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

export async function renewPlayerSeasonAction(
  playerId: string,
  targetSeasonId: string,
  teamId: string | null,
  status: 'active' | 'pending_renewal' | 'renewed' | 'baja' | 'inactive' = 'active'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase.from('profiles').select('club_id, role').eq('id', user.id).single();
  if (!profile || profile.role !== 'admin') throw new Error('Solo los administradores pueden renovar jugadores');

  await assertSeasonEditable(targetSeasonId, profile.club_id);

  const { data: season } = await supabase.from('seasons').select('id, is_active').eq('id', targetSeasonId).eq('club_id', profile.club_id).single();
  if (!season) throw new Error('Temporada no encontrada');

  // Validar estrictamente la pertenencia del jugador al club del administrador
  const { data: player } = await supabase.from('players').select('id, club_id').eq('id', playerId).single();
  if (!player || player.club_id !== profile.club_id) throw new Error('El jugador no pertenece a tu club.');

  // Validar estrictamente que el equipo pertenece al club y a la temporada objetivo
  if (teamId) {
    const { data: team } = await supabase.from('teams').select('season_id, club_id').eq('id', teamId).single();
    if (!team || team.club_id !== profile.club_id) {
      throw new Error('El equipo seleccionado no pertenece a tu club.');
    }
    if (team.season_id && team.season_id !== targetSeasonId) {
      throw new Error('El equipo seleccionado no pertenece a la temporada objetivo.');
    }
  }

  const { data: existingHistory } = await supabase
    .from('player_season_history')
    .select('id')
    .eq('player_id', playerId)
    .eq('season_id', targetSeasonId)
    .maybeSingle();

  if (existingHistory) {
    const { error } = await supabase
      .from('player_season_history')
      .update({ team_id: teamId, status })
      .eq('id', existingHistory.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from('player_season_history')
      .insert({ player_id: playerId, season_id: targetSeasonId, team_id: teamId, club_id: profile.club_id, status });
    if (error) throw new Error(error.message);
  }

  if (season.is_active) {
    await supabase.from('players').update({ team_id: teamId, status: status === 'baja' ? 'inactive' : 'active', was_in_club: true }).eq('id', playerId);
  }

  revalidatePath('/dashboard/club/miembros');
  revalidatePath('/dashboard/equipos');
  return { success: true };
}

export async function requestFamilyPlayerRenewalAction(playerId: string, targetSeasonId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No autorizado');

  const { data: profile } = await supabase.from('profiles').select('id, club_id, role').eq('id', user.id).single();
  if (!profile?.club_id) throw new Error('No se encontró el club');

  const { data: player } = await supabase.from('players').select('id, club_id, tutor_id').eq('id', playerId).single();
  if (!player || player.club_id !== profile.club_id) throw new Error('Jugador no encontrado');

  const isTutor = player.tutor_id === user.id || profile.role === 'admin';
  if (!isTutor) throw new Error('Solo el tutor legal puede solicitar la renovación');

  await assertSeasonEditable(targetSeasonId, profile.club_id);

  const { data: existing } = await supabase
    .from('player_season_history')
    .select('id')
    .eq('player_id', playerId)
    .eq('season_id', targetSeasonId)
    .maybeSingle();

  if (existing) {
    await supabase.from('player_season_history').update({ status: 'pending_renewal' }).eq('id', existing.id);
  } else {
    await supabase.from('player_season_history').insert({
      player_id: playerId,
      season_id: targetSeasonId,
      club_id: profile.club_id,
      status: 'pending_renewal',
    });
  }

  revalidatePath('/dashboard/family');
  return { success: true };
}
