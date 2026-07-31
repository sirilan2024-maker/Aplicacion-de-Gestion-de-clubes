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

export async function assignStaffToTeamAction(staffId: string, teamIds: string[]) {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  
  // Siempre limpiamos las asignaciones anteriores
  await adminClient.from('team_coaches').delete().eq('profile_id', staffId)

  if (teamIds && teamIds.length > 0) {
    // Obtenemos el club_id del primer equipo (asumimos que todos los equipos son del mismo club)
    const { data: team } = await adminClient.from('teams').select('club_id').eq('id', teamIds[0]).single()
    if (!team) return { success: false, error: 'Equipo no encontrado' }
    
    // Preparamos el array de inserciones
    const inserts = teamIds.map(id => ({
      profile_id: staffId, 
      team_id: id, 
      club_id: team.club_id 
    }))

    const { error } = await adminClient.from('team_coaches').insert(inserts)
    
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

export async function updateUserRolesAction(userId: string, activeRole: string, rolesList: string[]) {
  const supabase = await createClient()

  // Verify the current user is admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (currentProfile?.role !== 'admin' && currentProfile?.role !== 'superadmin') {
    return { success: false, error: 'No tienes permisos para realizar esta acción' }
  }

  // Use admin client to bypass RLS for the update
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from("profiles")
    .update({ 
      role: activeRole,
      roles: rolesList
    })
    .eq("id", userId)

  if (error) {
    console.error('Error updating user roles:', error)
    return { success: false, error: error.message }
  }

  // FASE 3: Auditoría Interna de Control de Roles
  await adminClient.from("auditoria_roles").insert({
    admin_id: user.id,
    usuario_afectado_id: userId,
    rol_anterior: currentProfile?.role || 'unknown',
    rol_nuevo: activeRole
  })

  revalidatePath("/dashboard/club/miembros")
  return { success: true }
}

export async function switchActiveRoleAction(selectedRole: string) {
  const supabase = await createClient()

  // Get active user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("roles")
    .eq("id", user.id)
    .single()

  if (!profile) return { success: false, error: 'Perfil no encontrado' }

  const roles = profile.roles || []
  if (!roles.includes(selectedRole)) {
    return { success: false, error: 'No tienes este rol asignado' }
  }

  // Use admin client to bypass RLS for the update
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from("profiles")
    .update({ role: selectedRole })
    .eq("id", user.id)

  if (error) {
    console.error('Error switching role:', error)
    return { success: false, error: error.message }
  }

  // revalidatePath("/dashboard") // Removed to prevent hook mismatch race condition since client does a full window.location.href redirect
  return { success: true }
}

export async function updateClubSettingsAction(clubId: string, formData: FormData) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();
  const name = formData.get('name') as string;
  const file = formData.get('logo') as File | null;
  let logo_url = formData.get('currentLogoUrl') as string | null;

  if (file && file.size > 0) {
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `club-${clubId}-${Date.now()}.${fileExt}`;
    const filePath = `clubs/${fileName}`;
    
    const { error: uploadError } = await adminClient.storage
      .from('avatars')
      .upload(filePath, buffer, { contentType: file.type, upsert: true });
      
    if (uploadError) return { success: false, error: 'Error subiendo archivo: ' + uploadError.message };
    
    const { data: { publicUrl } } = adminClient.storage.from('avatars').getPublicUrl(filePath);
    logo_url = publicUrl;
  }
  
  const updateData: any = { name: name };
  if (logo_url) updateData.logo_url = logo_url;
  
  const { error } = await adminClient.from('clubs').update(updateData).eq('id', clubId);
  if (error) return { success: false, error: 'Error actualizando club: ' + error.message };
  
  return { success: true, logo_url };
}
export async function getClubInfoAction(clubId: string) {
  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();
  const { data, error } = await adminClient.from('clubs').select('id, name, logo_url').eq('id', clubId).single();
  if (error) return null;
  return data;
}
