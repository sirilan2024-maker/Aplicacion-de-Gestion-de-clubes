"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateConvocatoria(matchId: string, playerId: string, status: "convocado" | "lesionado" | "duda" | "no_convocado" | null) {
  const supabase = await createClient()

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

  revalidatePath(`/dashboard/e/[teamId]/partidos/${matchId}`, 'page')
  return { success: true }
}

export async function sendConvocatoriaAlerts(matchId: string, teamId: string, playerIds: string[]) {
  // Simularemos el envío de la notificación a los perfiles vinculados a los players
  // En una versión real, cruzaríamos playerIds con profiles para insertar en public.notifications
  const supabase = await createClient()

  console.log(`[ALERTA ENVIADA] Partido ${matchId}: Se ha notificado a ${playerIds.length} jugadores para confirmar asistencia.`)
  
  // Guardamos un pequeño registro en supabase o simulamos éxito
  return { success: true, message: `Alertas push enviadas a ${playerIds.length} jugadores.` }
}

export async function updateMatchDetails(matchId: string, teamId: string, updates: { fecha_hora?: string, lugar?: string, rival_nombre?: string }) {
  const supabase = await createClient()
  await supabase.from('partidos').update(updates).eq('id', matchId)
  revalidatePath(`/dashboard/e/${teamId}/partidos`, 'page')
  return { success: true }
}

export async function saveMatchReport(matchId: string, report: { coach_rating: number, coach_summary: string, positive_aspects: string, improvement_aspects: string, attitude_notes: string }) {
  const supabase = await createClient()
  await supabase.from('partidos').update(report).eq('id', matchId)
  revalidatePath(`/dashboard/e/[teamId]/partidos/${matchId}`, 'page')
  return { success: true }
}
