"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function saveConvocatoria(partidoId: string, convocados: string[], titulares: string[]) {
  if (partidoId.startsWith('demo')) {
    return { success: true }
  }
  const supabase = await createClient()

  try {
    // 1. Obtener convocatorias actuales
    const { data: actuales, error: selectError } = await supabase
      .from('convocatorias')
      .select('player_id')
      .eq('partido_id', partidoId)
    
    if (selectError) {
      console.error("[matches-actions] Error fetching current convocatorias:", selectError.message)
      return { success: false, error: 'Error al consultar las convocatorias actuales.' }
    }

    const actualesIds = actuales?.map(c => c.player_id) || []

    // 2. Determinar cuáles eliminar y cuáles insertar
    const paraEliminar = actualesIds.filter(id => !convocados.includes(id))
    const paraInsertar = convocados.filter(id => !actualesIds.includes(id))
    const paraActualizar = convocados.filter(id => actualesIds.includes(id)) 

    // 3. Ejecutar operaciones
    if (paraEliminar.length > 0) {
      const { error: deleteError } = await supabase
        .from('convocatorias')
        .delete()
        .eq('partido_id', partidoId)
        .in('player_id', paraEliminar)
        
      if (deleteError) {
        console.error("[matches-actions] Error deleting convocatorias:", deleteError.message)
        return { success: false, error: 'Error al eliminar jugadores de la convocatoria.' }
      }
    }

    if (paraInsertar.length > 0) {
      const inserciones = paraInsertar.map(id => ({
        partido_id: partidoId,
        player_id: id,
        titular: titulares.includes(id),
        minutos_jugados: 0,
        goles: 0,
        asistencias: 0,
        tarjetas_amarillas: 0,
        tarjetas_rojas: 0,
        asistencia_confirmada_familia: false
      }))
      const { error: insertError } = await supabase.from('convocatorias').insert(inserciones)
      if (insertError) {
        console.error("[matches-actions] Error inserting convocatorias:", insertError.message)
        return { success: false, error: 'No tienes permisos o ocurrió un error al añadir jugadores.' }
      }
    }

    // 4. Actualizar titulares de los que ya existían
    for (const id of paraActualizar) {
      const { error: updateError } = await supabase
        .from('convocatorias')
        .update({ titular: titulares.includes(id) })
        .eq('partido_id', partidoId)
        .eq('player_id', id)
        
      if (updateError) {
        console.error("[matches-actions] Error updating convocatoria:", updateError.message)
        return { success: false, error: 'Error al actualizar la titularidad de los jugadores.' }
      }
    }

    revalidatePath(`/dashboard/matches/${partidoId}`)
    return { success: true }
  } catch (error: any) {
    console.error("[matches-actions] Unexpected error saving convocatoria:", error)
    return { success: false, error: 'Error interno del servidor al procesar la convocatoria.' }
  }
}

export async function saveMatchStats(
  partidoId: string, 
  stats: Record<string, { minutos_jugados: number, goles: number, asistencias: number, tarjetas_amarillas: number, tarjetas_rojas: number }>,
  resultadoPropio: number,
  resultadoRival: number,
  coachReport?: string
) {
  if (partidoId.startsWith('demo')) {
    return { success: true }
  }
  const supabase = await createClient()

  try {
    const updateData: any = { 
      resultado_propio: resultadoPropio, 
      resultado_rival: resultadoRival,
      estado: 'Finalizado' 
    }
    
    if (coachReport !== undefined) {
      updateData.coach_report = coachReport
    }

    const { error: matchError } = await supabase
      .from('partidos')
      .update(updateData)
      .eq('id', partidoId)

    if (matchError) {
      console.error("[matches-actions] Error updating match stats:", matchError.message)
      return { success: false, error: 'Error al actualizar el resultado del partido.' }
    }

    for (const [playerId, playerStats] of Object.entries(stats)) {
      const { error: updateError } = await supabase
        .from('convocatorias')
        .update({
          minutos_jugados: playerStats.minutos_jugados,
          goles: playerStats.goles,
          asistencias: playerStats.asistencias,
          tarjetas_amarillas: playerStats.tarjetas_amarillas,
          tarjetas_rojas: playerStats.tarjetas_rojas
        })
        .eq('partido_id', partidoId)
        .eq('player_id', playerId)
        
      if (updateError) {
        console.error("[matches-actions] Error updating player stats:", updateError.message)
        return { success: false, error: 'Error al guardar estadísticas de los jugadores.' }
      }
    }

    revalidatePath(`/dashboard/matches/${partidoId}`)
    return { success: true }
  } catch (error: any) {
    console.error("[matches-actions] Unexpected error saving stats:", error)
    return { success: false, error: 'Error interno del servidor al guardar las estadísticas.' }
  }
}

// ─── saveLineup ───────────────────────────────────────────────────────────────
// Persists the tactical formation to convocatorias.posicion_tactica + slot_index.
// Clears positions for all convocados first, then writes only the assigned slots.

export interface LineupAssignment {
  player_id: string
  posicion_tactica: string  // e.g. 'POR', 'DC', 'MC'
  slot_index: number        // 0-10 index in the formation
}

export async function saveLineup(
  partidoId: string,
  assignments: LineupAssignment[]
): Promise<{ success: boolean; error?: string }> {
  if (partidoId.startsWith('demo')) {
    return { success: true }
  }
  const supabase = await createClient()

  try {
    // 1. Clear all existing tactical positions for this match
    const { error: clearError } = await supabase
      .from('convocatorias')
      .update({ posicion_tactica: null, slot_index: null })
      .eq('partido_id', partidoId)

    if (clearError) {
      console.error('[matches-actions] Error clearing lineup:', clearError.message)
      return { success: false, error: 'Error al limpiar la alineación anterior.' }
    }

    // 2. Write each assignment individually
    for (const assignment of assignments) {
      const { error: updateError } = await supabase
        .from('convocatorias')
        .update({
          posicion_tactica: assignment.posicion_tactica,
          slot_index: assignment.slot_index,
          titular: true, // Positioned = starter
        })
        .eq('partido_id', partidoId)
        .eq('player_id', assignment.player_id)

      if (updateError) {
        console.error('[matches-actions] Error saving lineup slot:', updateError.message)
        return { success: false, error: `Error al guardar la posición de un jugador: ${updateError.message}` }
      }
    }

    revalidatePath(`/dashboard/matches/${partidoId}`)
    return { success: true }
  } catch (error: any) {
    console.error('[matches-actions] Unexpected error in saveLineup:', error)
    return { success: false, error: 'Error interno del servidor al guardar la alineación.' }
  }
}

// ─── updateAsistencia ─────────────────────────────────────────────────────────
// Allows the coach to manually set a player's attendance status.

export type EstadoAsistencia = 'Pendiente' | 'Confirmado' | 'Ausente'

export async function updateAsistencia(
  partidoId: string,
  playerId: string,
  estado: EstadoAsistencia
): Promise<{ success: boolean; error?: string }> {
  if (partidoId.startsWith('demo')) {
    return { success: true }
  }
  const supabase = await createClient()
  try {
    const { error } = await supabase
      .from('convocatorias')
      .update({ estado_asistencia: estado })
      .eq('partido_id', partidoId)
      .eq('player_id', playerId)

    if (error) {
      console.error('[matches-actions] Error updating asistencia:', error.message)
      return { success: false, error: 'No se pudo actualizar el estado de asistencia.' }
    }

    revalidatePath(`/dashboard/matches/${partidoId}`)
    return { success: true }
  } catch (error: any) {
    console.error('[matches-actions] Unexpected error in updateAsistencia:', error)
    return { success: false, error: 'Error interno del servidor.' }
  }
}

// ─── addMatchEvent ────────────────────────────────────────────────────────────
// Adds a live event (goal, card, substitution) to match_events.

import type { TipoEvento } from '@/types/matches'

export interface AddMatchEventPayload {
  partido_id: string
  player_id?: string | null
  tipo_evento: TipoEvento
  minuto: number
  notas?: string | null
}

export async function addMatchEvent(
  payload: AddMatchEventPayload
): Promise<{ success: boolean; error?: string; id?: string }> {
  if (payload.partido_id.startsWith('demo')) {
    return { success: true, id: 'demo-event-' + Math.random().toString(36).substr(2, 9) }
  }
  const supabase = await createClient()
  try {
    const { data, error } = await supabase
      .from('match_events')
      .insert({
        partido_id:  payload.partido_id,
        player_id:   payload.player_id ?? null,
        tipo_evento: payload.tipo_evento,
        minuto:      payload.minuto,
        notas:       payload.notas ?? null,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[matches-actions] Error inserting match event:', error.message)
      return { success: false, error: 'No se pudo guardar el evento del partido.' }
    }

    revalidatePath(`/dashboard/matches/${payload.partido_id}`)
    return { success: true, id: data?.id }
  } catch (error: any) {
    console.error('[matches-actions] Unexpected error in addMatchEvent:', error)
    return { success: false, error: 'Error interno del servidor al guardar el evento.' }
  }
}

// ─── deleteMatchEvent ─────────────────────────────────────────────────────────
// Removes a live event (undo).

export async function deleteMatchEvent(
  eventId: string,
  partidoId: string
): Promise<{ success: boolean; error?: string }> {
  if (partidoId.startsWith('demo')) {
    return { success: true }
  }
  const supabase = await createClient()
  try {
    const { error } = await supabase
      .from('match_events')
      .delete()
      .eq('id', eventId)

    if (error) {
      console.error('[matches-actions] Error deleting match event:', error.message)
      return { success: false, error: 'No se pudo eliminar el evento.' }
    }

    revalidatePath(`/dashboard/matches/${partidoId}`)
    return { success: true }
  } catch (error: any) {
    console.error('[matches-actions] Unexpected error in deleteMatchEvent:', error)
    return { success: false, error: 'Error interno del servidor.' }
  }
}
