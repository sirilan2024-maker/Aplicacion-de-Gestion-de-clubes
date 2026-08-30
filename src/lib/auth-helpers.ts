import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export interface AuthenticatedContext {
  user: { id: string; email?: string };
  profile: {
    id: string;
    role: string;
    roles?: string[];
    club_id: string;
    first_name?: string;
    last_name?: string;
  };
}

export const ADMIN_ROLES = ["admin", "coordinador", "metodologo", "superadmin", "secretario", "tesorero", "directivo"];
export const COACH_ROLES = ["coach", "entrenador", "delegado", "preparador_fisico"];
export const STAFF_ROLES = [...ADMIN_ROLES, ...COACH_ROLES];
export const TREASURY_ADMIN_ROLES = ["admin", "coordinador", "tesorero", "superadmin", "secretario"];

/**
 * Obtiene el usuario autenticado y su perfil con club_id desde la sesión activa.
 */
export async function getAuthenticatedContext(): Promise<{
  context: AuthenticatedContext | null;
  error?: string;
  statusCode?: number;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { context: null, error: "No autenticado", statusCode: 401 };
    }

    const adminClient = createAdminClient();
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, role, roles, club_id, first_name, last_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return { context: null, error: "Perfil de usuario no encontrado", statusCode: 403 };
    }

    if (!profile.club_id) {
      return { context: null, error: "Usuario sin club asignado", statusCode: 403 };
    }

    return {
      context: {
        user: { id: user.id, email: user.email },
        profile: {
          id: profile.id,
          role: profile.role || "family",
          roles: profile.roles || [profile.role || "family"],
          club_id: profile.club_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
        },
      },
    };
  } catch (err: any) {
    if (err?.message?.includes("cookies") || err?.message?.includes("request scope") || err?.message?.includes("DYNAMIC_SERVER_USAGE")) {
      return { context: null, error: "No autenticado", statusCode: 401 };
    }
    return { context: null, error: err.message || "Error de autenticación", statusCode: 500 };
  }
}


/**
 * Verifica si un usuario tiene permisos para consultar o modificar a un jugador específico.
 */
export async function canUserAccessPlayer(
  adminClient: ReturnType<typeof createAdminClient>,
  ctx: AuthenticatedContext,
  playerId: string
): Promise<{ allowed: boolean; player?: any; reason?: string }> {
  const { data: player, error } = await adminClient
    .from("players")
    .select("id, club_id, team_id, tutor_id, user_auth_id")
    .eq("id", playerId)
    .single();

  if (error || !player) {
    return { allowed: false, reason: "Jugador no encontrado" };
  }

  // Comprobar aislamiento de club
  if (player.club_id !== ctx.profile.club_id) {
    return { allowed: false, reason: "El jugador no pertenece a tu club" };
  }

  // 1. Directiva / Admin
  if (ADMIN_ROLES.includes(ctx.profile.role)) {
    return { allowed: true, player };
  }

  // 2. Propio jugador
  if (player.user_auth_id === ctx.user.id) {
    return { allowed: true, player };
  }

  // 3. Tutor directo o tutor vinculado
  if (player.tutor_id === ctx.user.id) {
    return { allowed: true, player };
  }

  const { data: tutorLink } = await adminClient
    .from("player_tutors")
    .select("id")
    .eq("player_id", playerId)
    .eq("tutor_id", ctx.user.id)
    .maybeSingle();

  if (tutorLink) {
    return { allowed: true, player };
  }

  // 4. Entrenador asignado al equipo del jugador
  if (COACH_ROLES.includes(ctx.profile.role) && player.team_id) {
    const { data: coachAssignment } = await adminClient
      .from("team_coaches")
      .select("id")
      .eq("team_id", player.team_id)
      .eq("profile_id", ctx.user.id)
      .maybeSingle();

    if (coachAssignment) {
      return { allowed: true, player };
    }
  }

  return { allowed: false, reason: "No tienes permiso para acceder a este jugador" };
}

/**
 * Verifica si un usuario tiene permisos para consultar cuotas de una familia.
 */
export async function canUserAccessFamily(
  adminClient: ReturnType<typeof createAdminClient>,
  ctx: AuthenticatedContext,
  familyId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // 1. Admin/Tesorero del club
  if (TREASURY_ADMIN_ROLES.includes(ctx.profile.role)) {
    const { data: targetProfile } = await adminClient
      .from("profiles")
      .select("club_id")
      .eq("id", familyId)
      .single();

    if (targetProfile && targetProfile.club_id === ctx.profile.club_id) {
      return { allowed: true };
    }

    // Comprobar si la familia tiene cuotas o jugadores en este club
    const { data: hasClubFees } = await adminClient
      .from("fees")
      .select("id")
      .eq("profile_id", familyId)
      .eq("club_id", ctx.profile.club_id)
      .limit(1)
      .maybeSingle();

    if (hasClubFees) {
      return { allowed: true };
    }

    return { allowed: false, reason: "La familia no pertenece a tu club" };
  }

  // 2. La propia familia consultando sus datos
  if (ctx.user.id === familyId) {
    return { allowed: true };
  }

  // 3. Tutor vinculado con jugadores asociados a esa familia
  const { data: sharedTutor } = await adminClient
    .from("player_tutors")
    .select("player_id")
    .eq("tutor_id", ctx.user.id);

  if (sharedTutor && sharedTutor.length > 0) {
    const playerIds = sharedTutor.map((t) => t.player_id);
    const { data: familyMatch } = await adminClient
      .from("player_tutors")
      .select("id")
      .eq("tutor_id", familyId)
      .in("player_id", playerIds)
      .limit(1)
      .maybeSingle();

    if (familyMatch) {
      return { allowed: true };
    }
  }

  return { allowed: false, reason: "No autorizado para consultar la información financiera de esta familia" };
}

/**
 * Verifica si un partido pertenece al club del usuario.
 */
export async function canUserAccessMatch(
  adminClient: ReturnType<typeof createAdminClient>,
  ctx: AuthenticatedContext,
  partidoId: string
): Promise<{ allowed: boolean; match?: any; reason?: string }> {
  const { data: match, error } = await adminClient
    .from("partidos")
    .select("id, equipo_id, acta_oficial_url, fecha_hora, rival_nombre, lugar, equipo:teams(id, name, club_id)")
    .eq("id", partidoId)
    .single();

  if (error || !match) {
    return { allowed: false, reason: "Partido no encontrado" };
  }

  const matchClubId = (match.equipo as any)?.club_id;
  if (!matchClubId || matchClubId !== ctx.profile.club_id) {
    return { allowed: false, reason: "El partido no pertenece a tu club" };
  }

  return { allowed: true, match };
}

/**
 * Verifica si una cuota pertenece al club y si el usuario tiene permiso para verla.
 */
export async function canUserAccessFee(
  adminClient: ReturnType<typeof createAdminClient>,
  ctx: AuthenticatedContext,
  feeId: string
): Promise<{ allowed: boolean; fee?: any; reason?: string }> {
  const { data: fee, error } = await adminClient
    .from("fees")
    .select("id, club_id, profile_id, player_id, players(tutor_id, user_auth_id)")
    .eq("id", feeId)
    .single();

  if (error || !fee) {
    return { allowed: false, reason: "Cuota no encontrada" };
  }

  if (fee.club_id !== ctx.profile.club_id) {
    return { allowed: false, reason: "La cuota no pertenece a tu club" };
  }

  if (TREASURY_ADMIN_ROLES.includes(ctx.profile.role)) {
    return { allowed: true, fee };
  }

  if (fee.profile_id === ctx.user.id) {
    return { allowed: true, fee };
  }

  const playerObj = Array.isArray(fee.players) ? fee.players[0] : fee.players;
  if (playerObj && (playerObj.tutor_id === ctx.user.id || playerObj.user_auth_id === ctx.user.id)) {
    return { allowed: true, fee };
  }

  if (fee.player_id) {
    const { data: tutorLink } = await adminClient
      .from("player_tutors")
      .select("id")
      .eq("player_id", fee.player_id)
      .eq("tutor_id", ctx.user.id)
      .maybeSingle();

    if (tutorLink) {
      return { allowed: true, fee };
    }
  }

  return { allowed: false, reason: "No autorizado para acceder a esta cuota" };
}

/**
 * Verifica si un usuario tiene permisos para eliminar un equipo del club.
 */
export async function canUserDeleteTeam(
  adminClient: ReturnType<typeof createAdminClient>,
  ctx: AuthenticatedContext,
  teamId: string
): Promise<{ allowed: boolean; team?: any; reason?: string }> {
  if (!ADMIN_ROLES.includes(ctx.profile.role)) {
    return { allowed: false, reason: "No tienes permisos de administración para eliminar equipos" };
  }

  const { data: team, error } = await adminClient
    .from("teams")
    .select("id, name, club_id")
    .eq("id", teamId)
    .single();

  if (error || !team) {
    return { allowed: false, reason: "Equipo no encontrado" };
  }

  if (team.club_id !== ctx.profile.club_id) {
    return { allowed: false, reason: "El equipo no pertenece a tu club" };
  }

  return { allowed: true, team };
}

/**
 * Verifica si un usuario tiene permisos para modificar el email de una inscripción y usuario asociado.
 */
export async function canUserUpdateRegistrationEmail(
  adminClient: ReturnType<typeof createAdminClient>,
  ctx: AuthenticatedContext,
  registrationId: string,
  userId?: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (!ADMIN_ROLES.includes(ctx.profile.role)) {
    return { allowed: false, reason: "No tienes permisos administrativos para modificar emails de inscripciones" };
  }

  const { data: registration, error } = await adminClient
    .from("registrations")
    .select("id, club_id, form_data")
    .eq("id", registrationId)
    .single();

  if (error || !registration) {
    return { allowed: false, reason: "Inscripción no encontrada" };
  }

  if (registration.club_id !== ctx.profile.club_id) {
    return { allowed: false, reason: "La inscripción no pertenece a tu club" };
  }

  if (userId) {
    const { data: targetProfile, error: profileErr } = await adminClient
      .from("profiles")
      .select("id, club_id, role")
      .eq("id", userId)
      .single();

    if (profileErr || !targetProfile) {
      return { allowed: false, reason: "Perfil de usuario asociado no encontrado" };
    }

    if (targetProfile.club_id !== ctx.profile.club_id) {
      return { allowed: false, reason: "El usuario objetivo no pertenece a tu club" };
    }
  }

  return { allowed: true };
}

/**
 * Verifica si un usuario tiene permisos para actualizar el perfil o email de un miembro del staff.
 */
export async function canUserUpdateStaffProfile(
  adminClient: ReturnType<typeof createAdminClient>,
  ctx: AuthenticatedContext,
  staffId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const isSelf = ctx.user.id === staffId;
  const isAdmin = ADMIN_ROLES.includes(ctx.profile.role);

  if (!isSelf && !isAdmin) {
    return { allowed: false, reason: "No tienes permisos para modificar el perfil de este miembro de staff" };
  }

  const { data: targetProfile, error } = await adminClient
    .from("profiles")
    .select("id, club_id, role")
    .eq("id", staffId)
    .single();

  if (error || !targetProfile) {
    return { allowed: false, reason: "Miembro de staff no encontrado" };
  }

  if (targetProfile.club_id !== ctx.profile.club_id) {
    return { allowed: false, reason: "El miembro de staff no pertenece a tu club" };
  }

  return { allowed: true };
}

/**
 * Verifica si un usuario es administrador y tiene permisos sobre otro usuario de su club (para cambio de roles o asignación).
 */
export async function canUserManageClubStaff(
  adminClient: ReturnType<typeof createAdminClient>,
  ctx: AuthenticatedContext,
  targetUserId: string
): Promise<{ allowed: boolean; reason?: string }> {
  if (!ADMIN_ROLES.includes(ctx.profile.role)) {
    return { allowed: false, reason: "No tienes permisos de administración" };
  }

  const { data: targetProfile, error } = await adminClient
    .from("profiles")
    .select("id, club_id, role")
    .eq("id", targetUserId)
    .single();

  if (error || !targetProfile) {
    return { allowed: false, reason: "Usuario no encontrado" };
  }

  if (targetProfile.club_id !== ctx.profile.club_id) {
    return { allowed: false, reason: "El usuario no pertenece a tu club" };
  }

  return { allowed: true };
}

/**
 * Verifica si un usuario tiene permisos de administración o técnico sobre un equipo de su club.
 */
export async function canUserManageTeam(
  adminClient: ReturnType<typeof createAdminClient>,
  ctx: AuthenticatedContext,
  teamId: string
): Promise<{ allowed: boolean; team?: any; reason?: string }> {
  const { data: team, error } = await adminClient
    .from("teams")
    .select("id, name, club_id")
    .eq("id", teamId)
    .single();

  if (error || !team) {
    return { allowed: false, reason: "Equipo no encontrado" };
  }

  if (team.club_id !== ctx.profile.club_id) {
    return { allowed: false, reason: "El equipo no pertenece a tu club" };
  }

  if (ADMIN_ROLES.includes(ctx.profile.role)) {
    return { allowed: true, team };
  }

  if (COACH_ROLES.includes(ctx.profile.role)) {
    const { data: coachAssignment } = await adminClient
      .from("team_coaches")
      .select("id")
      .eq("team_id", teamId)
      .eq("profile_id", ctx.user.id)
      .maybeSingle();

    if (coachAssignment) {
      return { allowed: true, team };
    }
  }

  return { allowed: false, reason: "No tienes permisos sobre este equipo" };
}

/**
 * Verifica si un usuario tiene permisos administrativos sobre una inscripción del club.
 */
export async function canUserManageRegistration(
  adminClient: ReturnType<typeof createAdminClient>,
  ctx: AuthenticatedContext,
  registrationId: string
): Promise<{ allowed: boolean; registration?: any; reason?: string }> {
  if (!ADMIN_ROLES.includes(ctx.profile.role)) {
    return { allowed: false, reason: "No tienes permisos de administración" };
  }

  const { data: registration, error } = await adminClient
    .from("registrations")
    .select("id, club_id, status")
    .eq("id", registrationId)
    .single();

  if (error || !registration) {
    return { allowed: false, reason: "Inscripción no encontrada" };
  }

  if (registration.club_id !== ctx.profile.club_id) {
    return { allowed: false, reason: "La inscripción no pertenece a tu club" };
  }

  return { allowed: true, registration };
}