"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

// 1. CREATE INVITATION
export async function createInvitation({ email, role, teamId }: { email: string, role: string, teamId: string }) {
  const supabase = createClient(cookies())
  
  // Verify permissions (admin or coach of the team)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  // Generate unique token
  const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      email,
      role,
      team_id: teamId,
      token,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating invitation:", error)
    return { error: error.message }
  }

  // SIMULATE SENDING EMAIL
  console.log(`[EMAIL SIMULATION] Invitación enviada a ${email}. Enlace: http://localhost:3000/invite/${token}`)

  revalidatePath(`/dashboard/e/${teamId}`)
  return { success: true, data }
}

// 2. GET INVITATION BY TOKEN
export async function getInvitationByToken(token: string) {
  const supabase = createClient(cookies())
  const { data, error } = await supabase
    .from("invitations")
    .select(`
      *,
      equipo:equipos(name, club:clubs(name))
    `)
    .eq("token", token)
    .single()
    
  if (error) return { error: "Invitación no encontrada o inválida." }
  return { data }
}

// 3. ACCEPT INVITATION (Link Player)
export async function acceptInvitation(token: string, playerData: { 
  first_name: string, 
  last_name: string, 
  medical_notes?: string, 
  gdpr_consent: boolean 
}) {
  const supabase = createClient(cookies())
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Debes registrarte o iniciar sesión primero." }

  // 1. Get invite
  const { data: invite, error: inviteErr } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single()

  if (inviteErr || !invite) return { error: "Invitación no válida o ya usada." }

  // 2. Update Profile Role
  const { error: profileErr } = await supabase
    .from("profiles")
    .update({ role: invite.role })
    .eq("id", user.id)

  if (profileErr) return { error: "Error al actualizar tu perfil." }

  // 3. Create Player Record
  const { error: playerErr } = await supabase
    .from("players")
    .insert({
      team_id: invite.team_id,
      first_name: playerData.first_name,
      last_name: playerData.last_name,
      user_id: user.id,
      gdpr_consent: playerData.gdpr_consent,
      medical_notes: playerData.medical_notes,
      status: "Activo"
    })

  if (playerErr) return { error: "Error al crear tu ficha de jugador." }

  // 4. Mark Invite as Accepted
  await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("id", invite.id)

  return { success: true }
}
