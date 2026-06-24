'use server'

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

// Obtener todos los entrenadores del club
export async function getAvailableCoachesAction(clubId: string) {
  // Use service role to bypass RLS
  const supabase = await createAdminClient()

  // Buscar perfiles con rol entrenador, coach o coordinador (revisando role y rol por si acaso)
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, role, rol, club_id")
    .eq("club_id", clubId)

  if (error) {
    console.error("Error fetching coaches:", error)
    return { success: false, error: "Error al cargar entrenadores" }
  }

  // Filtrar en memoria por si el IN de supabase falla
  const validRoles = ["entrenador", "coach", "coordinador", "staff"]
  const coaches = (data || []).filter(p => {
    const r1 = p.role?.toLowerCase() || ""
    const r2 = p.rol?.toLowerCase() || ""
    return validRoles.includes(r1) || validRoles.includes(r2)
  })

  return { success: true, coaches }
}

// Obtener los entrenadores asignados a un equipo
export async function getTeamCoachesAction(teamId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from("team_coaches")
    .select("profile_id")
    .eq("team_id", teamId)
  if (error) return { success: false, assignedIds: [] }
  return { success: true, assignedIds: data.map(tc => tc.profile_id) }
}

// Obtener los perfiles completos de los entrenadores asignados (para la plantilla)
export async function getTeamCoachesProfilesAction(teamId: string) {
  const adminClient = await createAdminClient()
  const { data, error } = await adminClient
    .from("team_coaches")
    .select(`
      profile_id,
      profiles:profile_id (
        id, first_name, last_name, email, rol, role
      )
    `)
    .eq("team_id", teamId)
  if (error) return []
  return data
}

// Alternar asignación de un entrenador a un equipo
export async function toggleCoachTeamAssignmentAction(teamId: string, coachId: string, clubId: string, isAssigned: boolean) {
  const authClient = await createClient()
  const adminClient = await createAdminClient()

  // Verificar si está autenticado
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return { success: false, error: "No autenticado" }

  if (isAssigned) {
    const { error } = await adminClient.from("team_coaches").insert({
      team_id: teamId,
      profile_id: coachId,
      club_id: clubId
    })
    if (error) {
      console.error("toggleCoachTeamAssignmentAction insert error:", error)
      return { success: false, error: "Error al asignar" }
    }
  } else {
    const { error } = await adminClient.from("team_coaches")
      .delete()
      .eq("team_id", teamId)
      .eq("profile_id", coachId)
    if (error) {
      console.error("toggleCoachTeamAssignmentAction delete error:", error)
      return { success: false, error: "Error al desasignar" }
    }
  }

  // Actualizar el conteo de entrenadores en la tabla teams
  const { count } = await adminClient.from("team_coaches").select("*", { count: 'exact', head: true }).eq("team_id", teamId)
  if (count !== null) {
    await adminClient.from("teams").update({ coaches: count }).eq("id", teamId)
  }

  revalidatePath("/dashboard/equipos")
  return { success: true }
}
