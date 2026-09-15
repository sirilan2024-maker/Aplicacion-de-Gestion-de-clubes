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
    unassignedFormalizedPlayersCount?: number;
    singleUnassignedPlayerId?: string | null;
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
    activeInjuriesList: Array<{
      id: string;
      playerId: string;
      playerName: string;
      teamId?: string | null;
      teamName?: string | null;
      injuryType: string;
      bodyRegion?: string | null;
      bodyStructure?: string | null;
      laterality?: string | null;
      severity?: string | null;
      injuryDate: string;
      expectedReturnDate?: string | null;
      estimatedMinDays?: number | null;
      estimatedMaxDays?: number | null;
      rtsPhase?: string | null;
      status: string;
      mechanismDetails?: string | null;
      daysInjured?: number;
      daysRemaining?: number | null;
      formattedRecoveryTime?: string;
    }>;
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

export async function getExecutiveDashboardAction(targetSeasonId?: string): Promise<{
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

    // 2. Temporada dinámica (targetSeasonId o is_active = true)
    let seasonQuery = adminClient
      .from('seasons')
      .select('id, name, is_active')
      .eq('club_id', clubId);

    if (targetSeasonId) {
      seasonQuery = seasonQuery.eq('id', targetSeasonId);
    } else {
      seasonQuery = seasonQuery.eq('is_active', true);
    }

    const { data: activeSeasonRow } = await seasonQuery.maybeSingle();

    const resolvedSeasonId = targetSeasonId || activeSeasonRow?.id || '';

    const activeSeason = {
      id: resolvedSeasonId,
      name: activeSeasonRow?.name || 'Temporada 2026/27',
      isActive: activeSeasonRow?.is_active ?? true,
    };

    // Obtenemos los player_id pertenecientes a la temporada consultada
    let seasonalPlayerIds: string[] = [];
    if (resolvedSeasonId) {
      const { data: pshRows } = await adminClient
        .from('player_season_history')
        .select('player_id')
        .eq('season_id', resolvedSeasonId);
      seasonalPlayerIds = (pshRows || []).map(r => r.player_id).filter(Boolean);
    }

    // 3. Total active players (federados / activos en la temporada elegida)
    const activePlayersCount = seasonalPlayerIds.length;

    // 4. Equipos del club asignados a esta temporada
    let teamsQuery = adminClient
      .from('teams')
      .select('id, name, category, color, ffcv_group_id, ffcv_team_id, season_id')
      .eq('club_id', clubId);

    if (activeSeason.id) {
      teamsQuery = teamsQuery.eq('season_id', activeSeason.id);
    }

    const { data: rawTeams } = await teamsQuery;
    const teams = rawTeams || [];
    const federatedTeams = teams.filter(t => Boolean(t.ffcv_group_id));
    const activeTeamsCount = teams.filter(t => t.season_id === activeSeason.id).length;

    // 5. Pending inscriptions in Secretaría (jugadores en estado de inscripción vinculados a la temporada)
    let pendingInscriptionsCount = 0;
    if (seasonalPlayerIds.length > 0) {
      const { count: pendingInscCount } = await adminClient
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('club_id', clubId)
        .in('id', seasonalPlayerIds)
        .in('registration_status', ['pending_revision', 'request_correction']);
      pendingInscriptionsCount = pendingInscCount || 0;
    }

    const unassignedFormalizedPlayersCount = 0;
    const singleUnassignedPlayerId = null;

    // 6. Fees in Tesorería
    // Obtener cuotas pendientes para el club
    const { data: rawFees } = await adminClient
      .from('fees')
      .select('id, amount_cents, amount_paid_cents, estado, payment_method')
      .eq('club_id', clubId);

    const feesList = rawFees || [];
    const pendingFeesList = feesList.filter(f => f.estado === 'pendiente' || f.estado === 'pending');
    const pendingFeesCount = pendingFeesList.length;
    const pendingFeesAmount = pendingFeesList.reduce((sum, f) => sum + (f.amount_cents || 0), 0) / 100;

    const pendingSepaList = pendingFeesList.filter(f => (f.payment_method || '').toLowerCase().includes('domicilia'));
    const pendingSepaCount = pendingSepaList.length;
    const pendingSepaAmount = pendingSepaList.reduce((sum, f) => sum + (f.amount_cents || 0), 0) / 100;
    const isSepaConfigured = Boolean(club?.sepa_creditor_id?.trim() && club?.sepa_iban?.trim());
    
    const paidFeesList = feesList.filter(f => f.estado === 'pagado' || f.estado === 'paid');
    const totalPaidAmount = paidFeesList.reduce((sum, f) => sum + (f.amount_paid_cents || f.amount_cents || 0), 0) / 100;

    // 7. Motor Estadístico Dinámico por Temporada
    const teamIds = teams.map(t => t.id);
    const { data: rawPartidos } = await adminClient
      .from('partidos')
      .select('id, estado, resultado_propio, resultado_rival, equipo_id, es_local, rival_nombre, lugar, fecha_hora, jornada')
      .in('equipo_id', teamIds.length > 0 ? teamIds : ['00000000-0000-0000-0000-000000000000'])
      .order('fecha_hora', { ascending: false });

    const allMatches = rawPartidos || [];
    const playedMatches = allMatches.filter(p => p.estado === 'Finalizado' || (p.resultado_propio !== null && p.resultado_rival !== null));

    let totalPlayedMatches = playedMatches.length;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    const teamMatchMap = new Map<string, typeof playedMatches>();
    playedMatches.forEach(p => {
      const list = teamMatchMap.get(p.equipo_id) || [];
      list.push(p);
      teamMatchMap.set(p.equipo_id, list);

      goalsFor += p.resultado_propio || 0;
      goalsAgainst += p.resultado_rival || 0;
      if ((p.resultado_propio || 0) > (p.resultado_rival || 0)) wins++;
      else if ((p.resultado_propio || 0) === (p.resultado_rival || 0)) draws++;
      else losses++;
    });

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

    // Mapear clasificación más reciente por ffcv_group_id
    const standingsByGroup = new Map<string, any[]>();
    (allStandings || []).forEach(s => {
      const list = standingsByGroup.get(s.ffcv_group_id) || [];
      list.push(s);
      standingsByGroup.set(s.ffcv_group_id, list);
    });

    for (const team of federatedTeams) {
      const groupInfo = team.ffcv_group_id ? groupMap.get(team.ffcv_group_id) : undefined;
      const tMatches = teamMatchMap.get(team.id) || [];
      
      let tWins = 0, tDraws = 0, tLosses = 0, tGf = 0, tGa = 0;
      tMatches.forEach(m => {
        tGf += m.resultado_propio || 0;
        tGa += m.resultado_rival || 0;
        if ((m.resultado_propio || 0) > (m.resultado_rival || 0)) tWins++;
        else if ((m.resultado_propio || 0) === (m.resultado_rival || 0)) tDraws++;
        else tLosses++;
      });

      const tPoints = (tWins * 3) + tDraws;
      const tPlayed = tMatches.length;
      const tWinRate = tPlayed > 0 ? Math.round((tWins / tPlayed) * 100) : 0;

      // Buscar posición actual en ffcv_standings si existe para el club
      let currentPos: number | undefined = undefined;
      const groupSt = standingsByGroup.get(team.ffcv_group_id || '');
      if (groupSt && groupSt.length > 0) {
        const latestMatchday = groupSt[0].matchday;
        const latestRows = groupSt.filter(r => r.matchday === latestMatchday);
        const clubRow = latestRows.find(r => r.team_name.toLowerCase().includes('saladar') || r.team_name.toLowerCase().includes(team.name.toLowerCase()));
        if (clubRow) currentPos = clubRow.position;
      }

      teamStats.push({
        teamId: team.id,
        teamName: team.name,
        teamCategory: team.category || 'Federado',
        competitionName: groupInfo?.competition_name || 'Liga FFCV',
        groupName: groupInfo?.group_name || 'Grupo Oficial',
        currentPosition: currentPos,
        totalTeamsInGroup: groupInfo?.total_teams,
        matchesPlayed: tPlayed,
        wins: tWins,
        draws: tDraws,
        losses: tLosses,
        goalsFor: tGf,
        goalsAgainst: tGa,
        goalDiff: tGf - tGa,
        points: tPoints,
        winRate: tWinRate,
      });
    }

    // Equipos no federados / formativos del club
    const nonFederatedTeams = teams.filter(t => !t.ffcv_group_id);
    for (const team of nonFederatedTeams) {
      const isLigaBrave = team.name.toLowerCase().includes('infantil c') || team.category?.toLowerCase().includes('brave');
      const tMatches = teamMatchMap.get(team.id) || [];
      let tWins = 0, tDraws = 0, tLosses = 0, tGf = 0, tGa = 0;
      tMatches.forEach(m => {
        tGf += m.resultado_propio || 0;
        tGa += m.resultado_rival || 0;
        if ((m.resultado_propio || 0) > (m.resultado_rival || 0)) tWins++;
        else if ((m.resultado_propio || 0) === (m.resultado_rival || 0)) tDraws++;
        else tLosses++;
      });
      const tPlayed = tMatches.length;

      teamStats.push({
        teamId: team.id,
        teamName: team.name,
        teamCategory: team.category || (isLigaBrave ? 'Infantil' : 'No federado'),
        competitionName: isLigaBrave ? 'Liga Brave' : 'No federado',
        groupName: isLigaBrave ? 'Grupo Formativo' : '',
        currentPosition: undefined,
        totalTeamsInGroup: undefined,
        matchesPlayed: tPlayed,
        wins: tWins,
        draws: tDraws,
        losses: tLosses,
        goalsFor: tGf,
        goalsAgainst: tGa,
        goalDiff: tGf - tGa,
        points: (tWins * 3) + tDraws,
        winRate: tPlayed > 0 ? Math.round((tWins / tPlayed) * 100) : 0,
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
      const isNonFedA = a.competitionName === 'No federado' || a.competitionName === 'Liga Brave' || a.teamCategory === 'Liga Brave' || a.teamCategory === 'No federado';
      const isNonFedB = b.competitionName === 'No federado' || b.competitionName === 'Liga Brave' || b.teamCategory === 'Liga Brave' || b.teamCategory === 'No federado';
      if (!isNonFedA && isNonFedB) return -1;
      if (isNonFedA && !isNonFedB) return 1;
      const rankA = teamHierarchy[a.teamName.toLowerCase().trim()] || 99;
      const rankB = teamHierarchy[b.teamName.toLowerCase().trim()] || 99;
      return rankA - rankB;
    });

    const globalWinRate = totalPlayedMatches > 0 ? Math.round((wins / totalPlayedMatches) * 100) : 0;
    const points = (wins * 3) + draws;
    const possiblePoints = totalPlayedMatches * 3;
    const pointsPercentage = possiblePoints > 0 ? Math.round((points / possiblePoints) * 100) : 0;

    // 8. Estadísticas individuales de jugadores y Líderes Deportivos
    const unreportedMatchesCount = allMatches.filter(p => p.estado === 'Programado' && p.fecha_hora < new Date().toISOString()).length;
    const topScorer = null;
    const topMinutes = null;
    const apercibidosCount = 0;

    // 9. Enfermería y Lesiones Activas (filtradas por jugadores de la temporada consultada)
    let activeInjuriesList: Array<{
      id: string;
      playerId: string;
      playerName: string;
      teamId: string | null;
      teamName: string;
      injuryType: string;
      injuryDate: string;
      status: 'active';
    }> = [];

    if (seasonalPlayerIds.length > 0) {
      const { data: rawInjuries } = await adminClient
        .from('players')
        .select('id, first_name, last_name, injury_description, team_id, teams:team_id(name)')
        .eq('club_id', clubId)
        .in('id', seasonalPlayerIds)
        .not('injury_description', 'is', null);

      activeInjuriesList = (rawInjuries || [])
        .filter(p => Boolean(p.injury_description && p.injury_description.trim().length > 0))
        .map(p => ({
          id: p.id,
          playerId: p.id,
          playerName: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          teamId: p.team_id,
          teamName: (p.teams as any)?.name || 'Equipo',
          injuryType: p.injury_description || 'Molestia física',
          injuryDate: new Date().toISOString(),
          status: 'active' as const,
        }));
    }
    const activeInjuriesCount = activeInjuriesList.length;

    // 10. Tasa de Asistencia Dinámica por Temporada
    let attendanceRate = 0;
    if (seasonalPlayerIds.length > 0) {
      const { data: attRows } = await adminClient
        .from('attendance')
        .select('status')
        .in('player_id', seasonalPlayerIds);

      const totalAtt = attRows?.length || 0;
      if (totalAtt > 0) {
        const presentes = attRows!.filter(r => (r.status || '').toLowerCase().trim() === 'presente' || (r.status || '').toLowerCase().trim() === 'present').length;
        attendanceRate = Math.round((presentes / totalAtt) * 100);
      }
    }

    // 11. Upcoming matches (Agenda filtrada por equipos de la temporada consultada)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: rawMatches } = await adminClient
      .from('partidos')
      .select(`
        id, fecha_hora, rival_nombre, lugar, jornada, es_local, estado,
        resultado_propio, resultado_rival,
        teams:equipo_id (name, category, color)
      `)
      .eq('club_id', clubId)
      .in('equipo_id', teamIds.length > 0 ? teamIds : ['00000000-0000-0000-0000-000000000000'])
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
      .in('team_id', teamIds.length > 0 ? teamIds : ['00000000-0000-0000-0000-000000000000'])
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
          unassignedFormalizedPlayersCount,
          singleUnassignedPlayerId,
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
          activeInjuriesCount: activeInjuriesCount || activeInjuriesList.length || 0,
          activeInjuriesList: activeInjuriesList || [],
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
