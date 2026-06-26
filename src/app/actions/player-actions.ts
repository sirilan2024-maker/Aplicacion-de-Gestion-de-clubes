"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function archivePlayerAction(playerId: string, isArchived: boolean = true) {
  try {
    const supabase = await createClient()

    // Comprobamos la autenticación
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: { message: "No autenticado" } }
    }

    const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single()
    const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', profile?.club_id).eq('is_active', true).single()

    const { error } = await supabase
      .from('players')
      .update({ status: isArchived ? 'inactive' : 'active' })
      .eq('id', playerId)

    if (activeSeason?.id) {
      await supabase
        .from('player_season_history')
        .update({ status: isArchived ? 'inactive' : 'active' })
        .eq('player_id', playerId)
        .eq('season_id', activeSeason.id)
    }

    if (error) {
      console.error("Error archiving player:", error)
      return { success: false, error }
    }

    revalidatePath('/dashboard/club/miembros')
    revalidatePath('/dashboard/equipos/[teamId]/plantilla', 'page')
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: { message: err.message } }
  }
}

export async function reactivatePlayerAction(playerId: string, teamId: string | null) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: { message: "No autenticado" } }
    }

    const { data: profile } = await supabase.from('profiles').select('club_id').eq('id', user.id).single()
    const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', profile?.club_id).eq('is_active', true).single()

    // Reactivar al jugador
    const { error: updateError } = await supabase
      .from('players')
      .update({ status: 'active', team_id: teamId })
      .eq('id', playerId)

    if (updateError) {
      return { success: false, error: updateError }
    }

    // Si se le ha asignado un equipo y hay temporada activa, lo registramos en el historial
    if (teamId && activeSeason?.id) {
      // Evitar duplicados (por si ya estuviera)
      const { data: existing } = await supabase
        .from('player_season_history')
        .select('id')
        .eq('player_id', playerId)
        .eq('season_id', activeSeason.id)
        .eq('team_id', teamId)
        .maybeSingle()
        
      if (!existing) {
        await supabase.from('player_season_history').insert({
          player_id: playerId,
          team_id: teamId,
          season_id: activeSeason.id,
          club_id: profile?.club_id,
          status: 'active'
        })
      }
    }

    revalidatePath('/dashboard/club/miembros')
    revalidatePath('/dashboard/club/miembros/archivo')
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: { message: err.message } }
  }
}

export async function deletePlayerAction(playerId: string) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { success: false, error: { message: "No autenticado" } }
    }

    // Get current first name
    const { data: player } = await supabase
      .from('players')
      .select('first_name')
      .eq('id', playerId)
      .single()

    if (!player) return { success: false, error: { message: "Jugador no encontrado" } }

    const { error } = await supabase
      .from('players')
      .update({ 
        first_name: `[ELIMINADO] ${player.first_name}`,
        status: 'inactive'
      })
      .eq('id', playerId)

    if (error) {
      console.error("Error deleting player:", error)
      return { success: false, error }
    }

    revalidatePath('/dashboard/club/miembros')
    
    return { success: true }
  } catch (err: any) {
    return { success: false, error: { message: err.message } }
  }
}
