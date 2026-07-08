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

export async function assignStaffToTeamAction(staffId: string, teamId: string | null) {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  
  if (teamId) {
    const { data: team } = await adminClient.from('teams').select('club_id').eq('id', teamId).single()
    if (!team) return { success: false, error: 'Equipo no encontrado' }
    
    await adminClient.from('team_coaches').delete().eq('profile_id', staffId)
    
    const { error } = await adminClient.from('team_coaches').insert({ 
      profile_id: staffId, 
      team_id: teamId, 
      club_id: team.club_id 
    })
    
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await adminClient.from('team_coaches').delete().eq('profile_id', staffId)
    if (error) return { success: false, error: error.message }
  }
  
  revalidatePath("/dashboard/club/miembros")
  return { success: true }
}

export async function bulkCreateStaffInvitationsAction(
  clubId: string, 
  staffList: { first_name: string, last_name: string, role: string, team_id?: string }[]
) {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  
  const invitationsToInsert = staffList.map(staff => {
    let sanitizedRole = staff.role.toLowerCase();
    if (!['admin', 'coordinador', 'entrenador'].includes(sanitizedRole)) {
      sanitizedRole = 'entrenador'; // Default fallback para delegados, etc.
    }
    
    // El importador pasa first_name y last_name en el objeto staff
    const fullName = `${(staff as any).first_name || ''} ${(staff as any).last_name || ''}`.trim() || 'Staff Invitado';
    
    return {
      club_id: clubId,
      role: sanitizedRole,
      team_id: staff.team_id || null,
      name: fullName
    };
  })

  const { data, error } = await adminClient
    .from('staff_invitations')
    .insert(invitationsToInsert)
    .select('id, token')

  if (error || !data) {
    console.error('[Bulk Staff Invite]', error)
    return { success: false, error: 'Error generando invitaciones de staff' }
  }

  const results = staffList.map((staff, index) => ({
    name: `${staff.first_name} ${staff.last_name}`.trim(),
    role: staff.role,
    token: data[index].token
  }))

  return { success: true, invitations: results }
}

export async function getPendingStaffInvitationsAction(clubId: string) {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('staff_invitations')
    .select(`
      id, role, token, created_at, team_id, name,
      teams (name, color)
    `)
    .eq('club_id', clubId)
    .eq('used', false)

  if (error) {
    console.error('[getPendingStaffInvitationsAction]', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function updateStaffProfileAction(staffId: string, data: { phone: string, dni: string, birth_date: string, license_number: string, first_name?: string, last_name?: string, email?: string }) {
  const supabase = await createClient()
  
  const payload: any = {
    phone: data.phone || null,
    dni: data.dni || null,
    birth_date: data.birth_date || null,
    license_number: data.license_number || null
  }
  
  if (data.first_name !== undefined) payload.first_name = data.first_name
  if (data.last_name !== undefined) payload.last_name = data.last_name
  if (data.email !== undefined) payload.email = data.email

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', staffId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Update Auth email if provided
  if (data.email) {
    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = createAdminClient();
    await adminClient.auth.admin.updateUserById(staffId, { email: data.email });
  }

  return { success: true }
}

export async function removeStaffFromClubAction(staffId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  // Verify the current user is admin
  const { data: currentProfile } = await supabase.from("profiles").select("role, club_id").eq("id", user.id).single()
  if (currentProfile?.role !== 'admin') {
    return { success: false, error: 'No tienes permisos para realizar esta acción' }
  }

  // 1. Desasignar de cualquier equipo (usamos adminClient por si RLS bloquea update en teams)
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  await adminClient.from("team_coaches").delete().eq("profile_id", staffId)

  // 2. Quitar del club
  const { error } = await adminClient
    .from("profiles")
    .update({ club_id: null, role: 'coach' })
    .eq("id", staffId)
    .eq("club_id", currentProfile.club_id) // Check de seguridad

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/dashboard/club/miembros")
  return { success: true }
}

export async function cancelStaffInvitationAction(invitationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  // Verify the current user is admin
  const { data: currentProfile } = await supabase.from("profiles").select("role, club_id").eq("id", user.id).single()
  if (currentProfile?.role !== 'admin') {
    return { success: false, error: 'No tienes permisos para realizar esta acción' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  
  const { error } = await adminClient.from('staff_invitations').delete().eq('id', invitationId)
  
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/dashboard/club/miembros")
  return { success: true }
}
