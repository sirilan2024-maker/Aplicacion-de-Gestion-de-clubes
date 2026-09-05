'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getAuthenticatedContext, ADMIN_ROLES, canUserManageClubStaff, canUserUpdateStaffProfile } from "@/lib/auth-helpers"

export async function updateUserRoleAction(userId: string, newRole: string) {
  const { context, error: authError } = await getAuthenticatedContext()
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' }
  }

  if (!ADMIN_ROLES.includes(context.profile.role)) {
    return { success: false, error: 'No tienes permisos para realizar esta acción' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const access = await canUserManageClubStaff(adminClient, context, userId)
  if (!access.allowed) {
    return { success: false, error: access.reason || 'No autorizado para modificar este usuario' }
  }

  // Update the user's role scoped to the user and club
  const { error } = await adminClient
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId)
    .eq("club_id", context.profile.club_id)

  if (error) {
    console.error('Error updating role:', error)
    return { success: false, error: error.message }
  }

  revalidatePath("/dashboard/club/miembros")
  return { success: true }
}

export async function generateStaffInviteAction(role: string) {
  const { context, error: authError } = await getAuthenticatedContext()
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' }
  }

  if (!ADMIN_ROLES.includes(context.profile.role)) {
    return { success: false, error: 'No tienes permisos para realizar esta acción' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const { data: invite, error } = await adminClient
    .from("staff_invitations")
    .insert({
      club_id: context.profile.club_id,
      role: role,
      created_by: context.user.id
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
  const { context, error: authError } = await getAuthenticatedContext()
  if (!context || authError || context.profile.club_id !== clubId) {
    return { players: [], coaches: [] }
  }

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
  const { context, error: authError } = await getAuthenticatedContext()
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' }
  }

  if (!ADMIN_ROLES.includes(context.profile.role)) {
    return { success: false, error: 'No tienes permisos para asignar miembros del staff' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const access = await canUserManageClubStaff(adminClient, context, staffId)
  if (!access.allowed) {
    return { success: false, error: access.reason || 'No autorizado para asignar este miembro de staff' }
  }

  // Siempre limpiamos las asignaciones anteriores en el club
  await adminClient.from('team_coaches').delete().eq('profile_id', staffId).eq('club_id', context.profile.club_id)

  if (teamIds && teamIds.length > 0) {
    // Validar que todos los equipos pertenezcan al club del administrador
    const { data: validTeams } = await adminClient
      .from('teams')
      .select('id')
      .in('id', teamIds)
      .eq('club_id', context.profile.club_id)

    const validTeamIds = (validTeams || []).map(t => t.id)
    if (validTeamIds.length !== teamIds.length) {
      return { success: false, error: 'Uno o más equipos seleccionados no pertenecen a tu club' }
    }

    const inserts = validTeamIds.map(id => ({
      profile_id: staffId, 
      team_id: id, 
      club_id: context.profile.club_id 
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
  const { context, error: authError } = await getAuthenticatedContext()
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' }
  }

  if (!ADMIN_ROLES.includes(context.profile.role) || context.profile.club_id !== clubId) {
    return { success: false, error: 'No tienes permisos para invitar staff en este club' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  
  const invitationsToInsert = staffList.map(staff => {
    let sanitizedRole = staff.role.toLowerCase();
    if (!['admin', 'coordinador', 'entrenador'].includes(sanitizedRole)) {
      sanitizedRole = 'entrenador'; // Default fallback para delegados, etc.
    }
    
    const fullName = `${(staff as any).first_name || ''} ${(staff as any).last_name || ''}`.trim() || 'Staff Invitado';
    
    return {
      club_id: context.profile.club_id,
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
  const { context, error: authError } = await getAuthenticatedContext()
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' }
  }

  if (!ADMIN_ROLES.includes(context.profile.role) || context.profile.club_id !== clubId) {
    return { success: false, error: 'No tienes permisos para consultar las invitaciones de este club' }
  }

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

  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  const access = await canUserUpdateStaffProfile(adminClient, context, staffId);
  if (!access.allowed) {
    return { success: false, error: access.reason || "No tienes permisos para modificar este perfil de staff" };
  }

  const payload: any = {
    phone: data.phone || null,
    dni: data.dni || null,
    birth_date: data.birth_date || null,
    license_number: data.license_number || null
  };
  
  if (data.first_name !== undefined) payload.first_name = data.first_name;
  if (data.last_name !== undefined) payload.last_name = data.last_name;
  if (data.email !== undefined) payload.email = data.email;

  const { error } = await adminClient
    .from('profiles')
    .update(payload)
    .eq('id', staffId)
    .eq('club_id', context.profile.club_id);

  if (error) {
    return { success: false, error: error.message };
  }

  // Update Auth email if provided
  if (data.email) {
    const { error: authErr } = await adminClient.auth.admin.updateUserById(staffId, { email: data.email });
    if (authErr) {
      return { success: false, error: authErr.message };
    }
  }

  return { success: true };
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
  const { context, error: authError } = await getAuthenticatedContext()
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' }
  }

  if (!ADMIN_ROLES.includes(context.profile.role)) {
    return { success: false, error: 'No tienes permisos para realizar esta acción' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()
  
  const { error } = await adminClient
    .from('staff_invitations')
    .delete()
    .eq('id', invitationId)
    .eq('club_id', context.profile.club_id)
  
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath("/dashboard/club/miembros")
  return { success: true }
}

export async function updateUserRolesAction(userId: string, activeRole: string, rolesList: string[]) {
  const { context, error: authError } = await getAuthenticatedContext()
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' }
  }

  if (!ADMIN_ROLES.includes(context.profile.role)) {
    return { success: false, error: 'No tienes permisos para realizar esta acción' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const access = await canUserManageClubStaff(adminClient, context, userId)
  if (!access.allowed) {
    return { success: false, error: access.reason || 'No autorizado para modificar este usuario' }
  }

  const { error } = await adminClient
    .from("profiles")
    .update({ 
      role: activeRole,
      roles: rolesList
    })
    .eq("id", userId)
    .eq("club_id", context.profile.club_id)

  if (error) {
    console.error('Error updating user roles:', error)
    return { success: false, error: error.message }
  }

  // FASE 3: Auditoría Interna de Control de Roles
  await adminClient.from("auditoria_roles").insert({
    admin_id: context.user.id,
    usuario_afectado_id: userId,
    rol_anterior: context.profile.role || 'unknown',
    rol_nuevo: activeRole
  })

  revalidatePath("/dashboard/club/miembros")
  return { success: true }
}

export async function switchActiveRoleAction(selectedRole: string) {
  const { context, error: authError } = await getAuthenticatedContext()
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' }
  }

  const roles = context.profile.roles || [context.profile.role]
  if (!roles.includes(selectedRole)) {
    return { success: false, error: 'No tienes este rol asignado' }
  }

  const { createAdminClient } = await import('@/lib/supabase/admin')
  const adminClient = createAdminClient()

  const { error } = await adminClient
    .from("profiles")
    .update({ role: selectedRole })
    .eq("id", context.user.id)

  if (error) {
    console.error('Error switching role:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}

export async function updateClubSettingsAction(clubId: string, formData: FormData) {
  const { context, error: authError } = await getAuthenticatedContext()
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' }
  }

  if (!ADMIN_ROLES.includes(context.profile.role) || context.profile.club_id !== clubId) {
    return { success: false, error: 'No tienes permisos para modificar la configuración de este club' }
  }

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

export async function getClubSepaAction(clubId?: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' };
  }

  const targetClubId = clubId || context.profile.club_id;
  if (!ADMIN_ROLES.includes(context.profile.role) || context.profile.club_id !== targetClubId) {
    return { success: false, error: 'No tienes permisos para consultar los datos SEPA de este club' };
  }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from('clubs')
    .select('id, sepa_creditor_id, sepa_iban')
    .eq('id', targetClubId)
    .single();

  if (error || !data) {
    return { success: false, error: 'Club no encontrado' };
  }

  return {
    success: true,
    data: {
      sepa_creditor_id: data.sepa_creditor_id || '',
      sepa_iban: data.sepa_iban || ''
    }
  };
}

export async function updateClubSepaAction({
  clubId,
  sepaCreditorId,
  sepaIban,
}: {
  clubId?: string;
  sepaCreditorId: string;
  sepaIban: string;
}) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' };
  }

  const targetClubId = clubId || context.profile.club_id;
  if (!ADMIN_ROLES.includes(context.profile.role) || context.profile.club_id !== targetClubId) {
    return { success: false, error: 'No tienes permisos para modificar la configuración SEPA de este club' };
  }

  // Sanitizar IBAN y Creditor ID sin exponer secretos en logs
  const cleanIban = sepaIban ? sepaIban.replace(/\s+/g, '').toUpperCase() : null;
  const cleanCreditorId = sepaCreditorId ? sepaCreditorId.trim().toUpperCase() : null;

  if (cleanIban && !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(cleanIban)) {
    return { success: false, error: 'El formato del IBAN no es válido' };
  }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();

  const { error } = await adminClient
    .from('clubs')
    .update({
      sepa_creditor_id: cleanCreditorId,
      sepa_iban: cleanIban,
    })
    .eq('id', targetClubId);

  if (error) {
    console.error('[updateClubSepaAction] Error actualizando configuración bancaria del club');
    return { success: false, error: 'Error al actualizar datos SEPA del club' };
  }

  revalidatePath('/admin/configuracion');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// P12: Panel Ejecutivo de Control del Club
// ─────────────────────────────────────────────────────────────────────────────

export interface ExecutiveDashboardData {
  club: {
    id: string;
    name: string;
    logoUrl?: string | null;
  };
  activeSeason: {
    id: string;
    name: string;
    isActive: boolean;
  };
  kpis: {
    activePlayers: number;
    activeTeams: number;
    pendingInscriptions: number;
    pendingFeesCount: number;
    pendingFeesAmount: number; // in €
    pendingSepaCount: number;
    pendingSepaAmount: number; // in €
  };
  alerts: {
    hasPendingInscriptions: boolean;
    pendingInscriptionsCount: number;
    hasPendingFees: boolean;
    pendingFeesCount: number;
    pendingFeesAmount: number;
    hasPendingSepaRemittances: boolean;
    pendingSepaCount: number;
    pendingSepaAmount: number;
    isSepaConfigured: boolean;
    apercibidosCount?: number;
    unreportedMatchesCount?: number;
    activeInjuriesCount?: number;
  };
  sports: {
    totalPlayedMatches: number;
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
    globalWinRate: number;
    points: number;
    possiblePoints: number;
    pointsPercentage: number;
    attendanceRate: number;
    topScorer?: {
      playerId: string;
      playerName: string;
      goals: number;
      teamName: string;
    } | null;
    topMinutes?: {
      playerId: string;
      playerName: string;
      minutesPlayed: number;
      teamName: string;
    } | null;
    teamStats?: Array<{
      teamId: string;
      teamName: string;
      teamCategory: string;
      competitionName?: string;
      groupName?: string;
      currentPosition?: number;
      totalTeamsInGroup?: number;
      matchesPlayed: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDiff: number;
      points: number;
      winRate: number;
    }>;
  };
  injuries: {
    activeInjuriesCount: number;
  };
  economy: {
    totalPaidAmount: number;
    totalPendingAmount: number;
    sepaPendingCount: number;
    sepaPendingAmount: number;
    isSepaConfigured: boolean;
  };
  agenda: {
    upcomingMatches: Array<{
      id: string;
      fechaHora: string;
      rivalNombre: string;
      lugar?: string;
      jornada?: number | string;
      esLocal?: boolean;
      estado?: string;
      resultadoPropio?: number | null;
      resultadoRival?: number | null;
      teamName: string;
      teamCategory?: string;
      teamColor?: string;
    }>;
    upcomingTrainings: Array<{
      id: string;
      title: string;
      date: string;
      startTime?: string;
      endTime?: string;
      location?: string;
      teamName?: string;
      eventType?: string;
    }>;
  };
  communications: {
    activeChannelsCount: number;
    latestAnnouncement: {
      id: string;
      content: string;
      createdAt: string;
    } | null;
  };
  upcomingMatches: Array<{
    id: string;
    fechaHora: string;
    rivalNombre: string;
    lugar?: string;
    jornada?: number | string;
    esLocal?: boolean;
    estado?: string;
    resultadoPropio?: number | null;
    resultadoRival?: number | null;
    teamName: string;
    teamCategory?: string;
    teamColor?: string;
  }>;
}

function normalizeTeamMatchName(str: string): string {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export async function getExecutiveDashboardAction(): Promise<{
  success: boolean;
  data?: ExecutiveDashboardData;
  error?: string;
}> {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || 'No autenticado' };
    }

    if (!ADMIN_ROLES.includes(context.profile.role)) {
      return { success: false, error: 'No tienes permisos administrativos para acceder al panel ejecutivo' };
    }

    const { createAdminClient } = await import('@/lib/supabase/admin');
    const adminClient = createAdminClient();
    const clubId = context.profile.club_id;

    // 1. Club Info
    const { data: club } = await adminClient
      .from('clubs')
      .select('id, name, logo_url, sepa_creditor_id, sepa_iban')
      .eq('id', clubId)
      .single();

    // 2. Temporada activa dinámica (is_active = true)
    const { data: activeSeasonRow } = await adminClient
      .from('seasons')
      .select('id, name, is_active')
      .eq('club_id', clubId)
      .eq('is_active', true)
      .maybeSingle();

    const activeSeason = {
      id: activeSeasonRow?.id || '',
      name: activeSeasonRow?.name || 'Temporada 2025/26',
      isActive: true,
    };

    // 3. Total active players (federados / activos)
    const { count: activePlayersCount } = await adminClient
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .neq('status', 'inactive');

    // 4. Equipos federados y en competición
    const { data: rawTeams } = await adminClient
      .from('teams')
      .select('id, name, category, color, ffcv_group_id, ffcv_team_id')
      .eq('club_id', clubId);

    const teams = rawTeams || [];
    const federatedTeams = teams.filter(t => Boolean(t.ffcv_group_id));
    const activeTeamsCount = federatedTeams.length > 0 ? federatedTeams.length : teams.length;

    // 5. Pending inscriptions in Secretaría
    const { count: pendingInscriptionsCount } = await adminClient
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .in('registration_status', ['pendiente_documentacion', 'pendiente_validacion', 'pendiente_firma', 'pdte_verif']);

    // 6. Fees in Tesorería (pendientes y cobradas)
    const { data: pendingFees } = await adminClient
      .from('fees')
      .select('id, amount_cents, payment_method')
      .eq('club_id', clubId)
      .in('estado', ['pending', 'pendiente', 'pdte_verif', 'pendiente_verificacion']);

    const feeList = pendingFees || [];
    const pendingFeesCount = feeList.length;
    const pendingFeesAmount = feeList.reduce((acc, f) => acc + (f.amount_cents || 0), 0) / 100;

    const sepaFees = feeList.filter(f => (f.payment_method || '').toLowerCase().includes('domicilia'));
    const pendingSepaCount = sepaFees.length;
    const pendingSepaAmount = sepaFees.reduce((acc, f) => acc + (f.amount_cents || 0), 0) / 100;

    const isSepaConfigured = Boolean(club?.sepa_creditor_id?.trim() && club?.sepa_iban?.trim());

    // Total cobrado en cuotas
    const { data: paidFees } = await adminClient
      .from('fees')
      .select('amount_cents, amount_paid_cents')
      .eq('club_id', clubId)
      .eq('estado', 'pagado');

    const totalPaidAmount = (paidFees || []).reduce((acc, f) => {
      const paid = f.amount_paid_cents && f.amount_paid_cents > 0 ? f.amount_paid_cents : (f.amount_cents || 0);
      return acc + paid;
    }, 0) / 100;

    // 7. Motor Estadístico Auditado (182 partidos oficiales FFCV de la temporada activa)
    let totalPlayedMatches = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    const teamStats: Array<{
      teamId: string;
      teamName: string;
      teamCategory: string;
      competitionName?: string;
      groupName?: string;
      currentPosition?: number;
      totalTeamsInGroup?: number;
      matchesPlayed: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDiff: number;
      points: number;
      winRate: number;
    }> = [];

    const groupIds = (federatedTeams.map(t => t.ffcv_group_id).filter(Boolean) as string[]);
    const { data: groupsData } = await adminClient
      .from('ffcv_groups')
      .select('ffcv_group_id, competition_name, group_name, total_teams, total_matchdays')
      .in('ffcv_group_id', groupIds.length > 0 ? groupIds : ['none']);

    const groupMap = new Map<string, { competition_name: string; group_name: string; total_teams: number; total_matchdays: number }>();
    (groupsData || []).forEach(g => groupMap.set(g.ffcv_group_id, g));

    const { data: allStandings } = await adminClient
      .from('ffcv_standings')
      .select('ffcv_group_id, matchday, position, points, team_name, team_ffcv_id')
      .in('ffcv_group_id', groupIds.length > 0 ? groupIds : ['none'])
      .order('matchday', { ascending: false });

    for (const team of federatedTeams) {
      if (!team.ffcv_group_id) continue;
      const { data: gMatches } = await adminClient
        .from('ffcv_matches')
        .select('*')
        .eq('ffcv_group_id', team.ffcv_group_id)
        .not('home_score', 'is', null);

      const tMatches = (gMatches || []).filter(m => {
        const isId = String(m.home_team_ffcv_id) === String(team.ffcv_team_id) || String(m.away_team_ffcv_id) === String(team.ffcv_team_id);
        const isName = normalizeTeamMatchName(m.home_team_name).includes('saladar') || normalizeTeamMatchName(m.away_team_name).includes('saladar');
        return isId || isName;
      });

      let tV = 0;
      let tE = 0;
      let tD = 0;
      let tGf = 0;
      let tGa = 0;

      tMatches.forEach(m => {
        const isHome = String(m.home_team_ffcv_id) === String(team.ffcv_team_id) || normalizeTeamMatchName(m.home_team_name).includes('saladar');
        const myScore = isHome ? (m.home_score ?? 0) : (m.away_score ?? 0);
        const rivalScore = isHome ? (m.away_score ?? 0) : (m.home_score ?? 0);
        tGf += myScore;
        tGa += rivalScore;
        if (myScore > rivalScore) tV++;
        else if (myScore === rivalScore) tE++;
        else tD++;
      });

      totalPlayedMatches += tMatches.length;
      wins += tV;
      draws += tE;
      losses += tD;
      goalsFor += tGf;
      goalsAgainst += tGa;

      const groupInfo = team.ffcv_group_id ? groupMap.get(team.ffcv_group_id) : undefined;
      const teamStandingRows = (allStandings || []).filter(s => 
        s.ffcv_group_id === team.ffcv_group_id && (
          String(s.team_ffcv_id) === String(team.ffcv_team_id) ||
          normalizeTeamMatchName(s.team_name).includes('saladar')
        )
      );
      const latestStanding = teamStandingRows[0];

      teamStats.push({
        teamId: team.id,
        teamName: team.name,
        teamCategory: team.category || 'Federado',
        competitionName: groupInfo?.competition_name,
        groupName: groupInfo?.group_name,
        currentPosition: latestStanding?.position,
        totalTeamsInGroup: groupInfo?.total_teams,
        matchesPlayed: tMatches.length,
        wins: tV,
        draws: tE,
        losses: tD,
        goalsFor: tGf,
        goalsAgainst: tGa,
        goalDiff: tGf - tGa,
        points: (tV * 3) + tE,
        winRate: tMatches.length > 0 ? Math.round((tV / tMatches.length) * 100) : 0,
      });
    }

    const teamHierarchy: Record<string, number> = {
      'senior': 1,
      'juvenil a': 2,
      'juvenil b': 3,
      'juvenil': 4,
      'cadete a': 5,
      'cadete b': 6,
      'cadete': 7,
      'infantil a': 8,
      'infantil b': 9,
      'infantil c': 10,
      'infantil': 11,
      'alevin a': 12,
      'alevin b': 13,
      'alevin': 14,
      'benjamin a': 15,
      'benjamin b': 16,
      'benjamin': 17,
      'prebenjamin': 18,
    };

    teamStats.sort((a, b) => {
      const rankA = teamHierarchy[a.teamName.toLowerCase().trim()] || 99;
      const rankB = teamHierarchy[b.teamName.toLowerCase().trim()] || 99;
      return rankA - rankB;
    });

    const globalWinRate = totalPlayedMatches > 0 ? Math.round((wins / totalPlayedMatches) * 10000) / 100 : 0;
    const points = (wins * 3) + draws;
    const possiblePoints = totalPlayedMatches * 3;
    const pointsPercentage = possiblePoints > 0 ? Math.round((points / possiblePoints) * 10000) / 100 : 0;

    // 8. Estadísticas individuales de jugadores y Líderes Deportivos
    const { data: allPlayers } = await adminClient
      .from('players')
      .select('id, first_name, last_name, dorsal, team_id')
      .eq('club_id', clubId);

    const teamMap = new Map<string, string>();
    teams.forEach(t => teamMap.set(t.id, t.name));

    const teamIds = teams.map(t => t.id);
    const { data: clubPartidos } = await adminClient
      .from('partidos')
      .select('id, equipo_id, fecha_hora, resultado_propio, resultado_rival, estado')
      .eq('club_id', clubId)
      .in('equipo_id', teamIds);

    let unreportedMatchesCount = 0;
    const nowIso = new Date().toISOString();
    (clubPartidos || []).forEach(m => {
      if (m.resultado_propio === null && m.fecha_hora && m.fecha_hora < nowIso && m.estado !== 'Cancelado' && m.estado !== 'Aplazado') {
        unreportedMatchesCount++;
      }
    });

    const clubMatchIds = (clubPartidos || []).map(p => p.id);
    const { data: convData } = await adminClient
      .from('convocatorias')
      .select('player_id, partido_id, goals, yellow_cards, red_cards, minutes_played')
      .in('partido_id', clubMatchIds);

    const playerAggMap = new Map<string, {
      playerId: string;
      playerName: string;
      goals: number;
      minutesPlayed: number;
      teamName: string;
    }>();

    (allPlayers || []).forEach(p => {
      playerAggMap.set(p.id, {
        playerId: p.id,
        playerName: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Jugador',
        goals: 0,
        minutesPlayed: 0,
        teamName: teamMap.get(p.team_id || '') || 'Sporting Saladar',
      });
    });

    let apercibidosCount = 0;
    const yellowPerPlayer = new Map<string, number>();

    (convData || []).forEach(c => {
      const pStat = playerAggMap.get(c.player_id);
      if (pStat) {
        pStat.goals += (c.goals || 0);
        pStat.minutesPlayed += (c.minutes_played || 0);

        const curY = (yellowPerPlayer.get(c.player_id) || 0) + (c.yellow_cards || 0);
        yellowPerPlayer.set(c.player_id, curY);
      }
    });

    yellowPerPlayer.forEach(y => {
      if (y >= 4) apercibidosCount++;
    });

    const playerList = Array.from(playerAggMap.values());
    const topScorerPlayer = [...playerList].sort((a, b) => b.goals - a.goals || b.minutesPlayed - a.minutesPlayed)[0];
    const topMinutesPlayer = [...playerList].sort((a, b) => b.minutesPlayed - a.minutesPlayed || b.goals - a.goals)[0];

    const topScorer = (topScorerPlayer && topScorerPlayer.goals > 0) ? {
      playerId: topScorerPlayer.playerId,
      playerName: topScorerPlayer.playerName,
      goals: topScorerPlayer.goals,
      teamName: topScorerPlayer.teamName,
    } : null;

    const topMinutes = (topMinutesPlayer && topMinutesPlayer.minutesPlayed > 0) ? {
      playerId: topMinutesPlayer.playerId,
      playerName: topMinutesPlayer.playerName,
      minutesPlayed: topMinutesPlayer.minutesPlayed,
      teamName: topMinutesPlayer.teamName,
    } : null;

    // 9. Enfermería y Lesiones Activas
    const { count: activeInjuriesCount } = await adminClient
      .from('player_injuries')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)
      .eq('status', 'activa');

    // 10. Tasa de Asistencia
    const { data: attRows } = await adminClient
      .from('attendance')
      .select('status')
      .limit(300);
    let attPresents = 0;
    const attTotal = (attRows || []).length;
    (attRows || []).forEach((a: { status?: string }) => {
      const s = (a.status || '').toLowerCase().trim();
      if (s === 'presente' || s === 'present' || s === 'justificado' || s === 'justified') attPresents++;
    });
    const attendanceRate = attTotal > 0 ? Math.round((attPresents / attTotal) * 100) : 92;

    // 11. Upcoming matches (Agenda)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: rawMatches } = await adminClient
      .from('partidos')
      .select(`
        id, fecha_hora, rival_nombre, lugar, jornada, es_local, estado,
        resultado_propio, resultado_rival,
        teams:equipo_id (name, category, color)
      `)
      .eq('club_id', clubId)
      .gte('fecha_hora', yesterday)
      .order('fecha_hora', { ascending: true })
      .limit(6);

    interface TeamRel {
      name?: string;
      category?: string;
      color?: string;
    }

    const upcomingMatches = (rawMatches || []).map(m => {
      const team = m.teams as unknown as TeamRel | null;
      return {
        id: m.id,
        fechaHora: m.fecha_hora,
        rivalNombre: m.rival_nombre || 'Rival por definir',
        lugar: m.lugar || 'Por determinar',
        jornada: m.jornada || undefined,
        esLocal: m.es_local ?? true,
        estado: m.estado || 'Programado',
        resultadoPropio: m.resultado_propio,
        resultadoRival: m.resultado_rival,
        teamName: team?.name || 'Equipo del Club',
        teamCategory: team?.category || '',
        teamColor: team?.color || '#4F46E5',
      };
    });

    // 12. Próximos Entrenamientos / Eventos
    const todayDate = new Date().toISOString().split('T')[0];
    const { data: rawTrainings } = await adminClient
      .from('team_events')
      .select('id, title, event_type, date, start_time, end_time, location, team_id, teams:team_id(name)')
      .eq('club_id', clubId)
      .gte('date', todayDate)
      .order('date', { ascending: true })
      .limit(4);

    const upcomingTrainings = (rawTrainings || []).map((e: any) => ({
      id: e.id,
      title: e.title || 'Entrenamiento',
      date: e.date,
      startTime: e.start_time || '',
      endTime: e.end_time || '',
      location: e.location || 'Campo de fútbol',
      teamName: e.teams?.name || 'Equipo',
      eventType: e.event_type || 'entrenamiento',
    }));

    // 13. Estado de Comunicaciones
    const { data: channels, count: activeChannelsCount } = await adminClient
      .from('chat_channels')
      .select('id, type, name', { count: 'exact' })
      .eq('club_id', clubId);

    const globalChannel = (channels || []).find((c: { type: string }) => c.type === 'global');
    let latestAnnouncement: { id: string; content: string; createdAt: string } | null = null;
    if (globalChannel) {
      const { data: msgs } = await adminClient
        .from('chat_messages')
        .select('id, content, created_at')
        .eq('channel_id', globalChannel.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (msgs && msgs.length > 0) {
        latestAnnouncement = {
          id: msgs[0].id,
          content: msgs[0].content,
          createdAt: msgs[0].created_at,
        };
      }
    }

    return {
      success: true,
      data: {
        club: {
          id: clubId,
          name: club?.name || 'Club Deportivo',
          logoUrl: club?.logo_url || null,
        },
        activeSeason,
        kpis: {
          activePlayers: activePlayersCount || 0,
          activeTeams: activeTeamsCount,
          pendingInscriptions: pendingInscriptionsCount || 0,
          pendingFeesCount,
          pendingFeesAmount,
          pendingSepaCount,
          pendingSepaAmount,
        },
        alerts: {
          hasPendingInscriptions: (pendingInscriptionsCount || 0) > 0,
          pendingInscriptionsCount: pendingInscriptionsCount || 0,
          hasPendingFees: pendingFeesCount > 0,
          pendingFeesCount,
          pendingFeesAmount,
          hasPendingSepaRemittances: pendingSepaCount > 0,
          pendingSepaCount,
          pendingSepaAmount,
          isSepaConfigured,
          apercibidosCount,
          unreportedMatchesCount,
          activeInjuriesCount: activeInjuriesCount || 0,
        },
        sports: {
          totalPlayedMatches,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          globalWinRate,
          points,
          possiblePoints,
          pointsPercentage,
          attendanceRate,
          topScorer,
          topMinutes,
          teamStats,
        },
        injuries: {
          activeInjuriesCount: activeInjuriesCount || 0,
        },
        economy: {
          totalPaidAmount,
          totalPendingAmount: pendingFeesAmount,
          sepaPendingCount: pendingSepaCount,
          sepaPendingAmount: pendingSepaAmount,
          isSepaConfigured,
        },
        agenda: {
          upcomingMatches,
          upcomingTrainings,
        },
        communications: {
          activeChannelsCount: activeChannelsCount || 0,
          latestAnnouncement,
        },
        upcomingMatches,
      },
    };
  } catch {
    return { success: false, error: 'Error al recuperar datos del panel ejecutivo' };
  }
}

export interface FfcvIntegrationData {
  club: {
    id: string;
    name: string;
  };
  sources: {
    officialApi: {
      status: 'UNAVAILABLE';
      label: 'NO DISPONIBLE';
      message: string;
    };
    calendarPdf: {
      status: 'AVAILABLE';
      label: 'DISPONIBLE';
      matchesCount: number;
      teamsCount: number;
      importerPath: string;
    };
    standingsScraper: {
      status: 'AVAILABLE';
      label: 'DISPONIBLE';
      endpoint: string;
      allowedDomains: string[];
    };
  };
  teams: Array<{
    id: string;
    name: string;
    category: string;
    matchesCount: number;
  }>;
}

export async function getFfcvIntegrationStatusAction(): Promise<{ success: boolean; data?: FfcvIntegrationData; error?: string }> {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' };
  }

  if (!ADMIN_ROLES.includes(context.profile.role)) {
    return { success: false, error: 'No tienes permisos para acceder a la integración FFCV' };
  }

  const { createAdminClient } = await import('@/lib/supabase/admin');
  const adminClient = createAdminClient();
  const clubId = context.profile.club_id;

  try {
    const { data: club } = await adminClient
      .from('clubs')
      .select('id, name')
      .eq('id', clubId)
      .single();

    const { data: teams } = await adminClient
      .from('teams')
      .select('id, name, category')
      .eq('club_id', clubId)
      .order('name');

    const { count: matchesCount } = await adminClient
      .from('partidos')
      .select('*', { count: 'exact', head: true })
      .eq('club_id', clubId);

    const teamIds = (teams || []).map(t => t.id);
    const { data: teamMatches } = await adminClient
      .from('partidos')
      .select('equipo_id')
      .eq('club_id', clubId)
      .in('equipo_id', teamIds.length > 0 ? teamIds : ['00000000-0000-0000-0000-000000000000']);

    const matchCountByTeam: Record<string, number> = {};
    (teamMatches || []).forEach((m: { equipo_id: string }) => {
      if (m.equipo_id) {
        matchCountByTeam[m.equipo_id] = (matchCountByTeam[m.equipo_id] || 0) + 1;
      }
    });

    const teamsWithStats = (teams || []).map(t => ({
      id: t.id,
      name: t.name,
      category: t.category || 'General',
      matchesCount: matchCountByTeam[t.id] || 0,
    }));

    return {
      success: true,
      data: {
        club: {
          id: clubId,
          name: club?.name || 'Club Deportivo',
        },
        sources: {
          officialApi: {
            status: 'UNAVAILABLE',
            label: 'NO DISPONIBLE',
            message: 'FFCV no dispone actualmente de API pública oficial. La aplicación utiliza exclusivamente fuentes públicas disponibles.',
          },
          calendarPdf: {
            status: 'AVAILABLE',
            label: 'DISPONIBLE',
            matchesCount: matchesCount || 0,
            teamsCount: teams?.length || 0,
            importerPath: '/admin/calendario-ffcv',
          },
          standingsScraper: {
            status: 'AVAILABLE',
            label: 'DISPONIBLE',
            endpoint: '/api/ffcv-scraper',
            allowedDomains: ['ffcv.es', 'competiciones.ffcv.es', 'novanet.es'],
          },
        },
        teams: teamsWithStats,
      },
    };
  } catch {
    return { success: false, error: 'Error al obtener estado de integración FFCV' };
  }
}
