'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateUserRoleAction(userId: string, newRole: string) {
  const supabase = await createClient()

  // Verify the current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (currentProfile?.role !== 'admin') {
    return { success: false, error: 'No tienes permisos para realizar esta acción' }
  }

  // Update the user's role
  const { error } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId)

  if (error) {
    console.error('Error updating role:', error)
    return { success: false, error: error.message }
  }

  revalidatePath("/dashboard/club/miembros")
  return { success: true }
}

export async function generateStaffInviteAction(role: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, club_id")
    .eq("id", user.id)
    .single()

  if (profile?.role !== 'admin') {
    return { success: false, error: 'No tienes permisos para realizar esta acción' }
  }

  if (!profile.club_id) {
    return { success: false, error: 'No tienes un club asignado' }
  }

  const { data: invite, error } = await supabase
    .from("staff_invitations")
    .insert({
      club_id: profile.club_id,
      role: role,
      created_by: user.id
    })
    .select("token")
    .single()

  if (error || !invite) {
    console.error('Error creating invite:', error)
    return { success: false, error: 'Error al generar la invitación' }
  }

  return { success: true, token: invite.token }
}

export async function fetchClubPeopleWizardAction(clubId: string) {
  // Use @supabase/supabase-js to bypass RLS with service_role key
  const { createClient } = await import('@supabase/supabase-js')
  const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  
  const { data: players } = await supabaseAdmin
    .from('players')
    .select('id, first_name, last_name, team_id, birth_date')
    .eq('club_id', clubId)
    .neq('status', 'inactive')
    
  const { data: coaches } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('club_id', clubId)
    .in('role', ['entrenador', 'coach'])
    
  return { players: players || [], coaches: coaches || [] }
}
