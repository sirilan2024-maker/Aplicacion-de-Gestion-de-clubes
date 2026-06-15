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

    const { error } = await supabase
      .from('players')
      .update({ status: isArchived ? 'inactive' : 'active' })
      .eq('id', playerId)

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
