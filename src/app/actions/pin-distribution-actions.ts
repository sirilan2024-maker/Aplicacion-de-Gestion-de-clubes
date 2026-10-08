"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateLinkCode } from "@/lib/utils";
import { sendEmail, getPlayerPinEmailHtml } from "@/lib/email-service";

export interface SendTeamPinsResult {
  success: boolean;
  error?: string;
  totalPlayers: number;
  sentCount: number;
  skippedCount: number;
  missingEmailPlayers: Array<{
    id: string;
    name: string;
    pin: string;
  }>;
  errors: string[];
}

/**
 * Envía por correo electrónico individualizado el PIN de acceso a cada jugador/familia del equipo.
 * Prioridad de destino:
 *  1. email del propio jugador
 *  2. email de los padres/tutores (parent1_email o parent2_email)
 * Si un jugador no tiene PIN asignado (link_code), se genera automáticamente y se persiste en BD.
 */
export async function sendTeamPinsByEmailAction(teamId: string): Promise<SendTeamPinsResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        success: false,
        error: "No autorizado. Inicia sesión para realizar esta acción.",
        totalPlayers: 0,
        sentCount: 0,
        skippedCount: 0,
        missingEmailPlayers: [],
        errors: ["Usuario no autenticado"],
      };
    }

    const adminSupabase = await createAdminClient();

    // 1. Obtener información del equipo y club
    const { data: teamData, error: teamError } = await adminSupabase
      .from("teams")
      .select("id, name, club_id, clubs(name)")
      .eq("id", teamId)
      .single();

    if (teamError || !teamData) {
      return {
        success: false,
        error: "Equipo no encontrado.",
        totalPlayers: 0,
        sentCount: 0,
        skippedCount: 0,
        missingEmailPlayers: [],
        errors: [teamError?.message || "Equipo inexistente"],
      };
    }

    const teamName = teamData.name || "Equipo";
    const clubObj = Array.isArray(teamData.clubs) ? teamData.clubs[0] : teamData.clubs;
    const clubName = (clubObj as any)?.name || "Sporting Saladar";

    // 2. Obtener jugadores activos del equipo mediante player_season_history
    const { data: historyData, error: playersError } = await adminSupabase
      .from("player_season_history")
      .select(`
        status,
        players!inner (
          id,
          first_name,
          last_name,
          posicion,
          posicion_principal,
          status,
          email,
          parent1_email,
          parent2_email,
          parent_contact,
          link_code
        )
      `)
      .eq("team_id", teamId)
      .neq("status", "inactive");

    if (playersError) {
      return {
        success: false,
        error: "Error al consultar los jugadores del equipo: " + playersError.message,
        totalPlayers: 0,
        sentCount: 0,
        skippedCount: 0,
        missingEmailPlayers: [],
        errors: [playersError.message],
      };
    }

    // Filtrar y extraer los jugadores excluyendo el cuerpo técnico
    const rawPlayers = (historyData || []).map((h: any) => h.players).filter(Boolean);
    const players = rawPlayers.filter((p: any) => {
      const pos = (p.posicion_principal || p.posicion || "").toLowerCase();
      return !pos.includes("entrenador") && !pos.includes("delegado") && !pos.includes("técnico");
    });

    if (players.length === 0) {
      return {
        success: true,
        totalPlayers: 0,
        sentCount: 0,
        skippedCount: 0,
        missingEmailPlayers: [],
        errors: [],
      };
    }

    let sentCount = 0;
    const missingEmailPlayers: Array<{ id: string; name: string; pin: string }> = [];
    const executionErrors: string[] = [];

    for (const player of players) {
      const fullName = `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Jugador";

      // 3. Garantizar que tiene PIN. Si no lo tiene, generarlo y guardarlo en BD
      let effectivePin = player.link_code?.trim() || "";
      if (!effectivePin) {
        effectivePin = generateLinkCode();
        const { error: updatePinErr } = await adminSupabase
          .from("players")
          .update({ link_code: effectivePin })
          .eq("id", player.id);

        if (updatePinErr) {
          console.error(`[Pins] Error asignando PIN al jugador ${player.id}:`, updatePinErr);
        }
      }

      // 4. Determinar email de destino según prioridad indicada por el usuario:
      // Primero email del jugador; si no, email de tutores
      const targetEmail = (player.email?.trim()) ||
                          (player.parent1_email?.trim()) ||
                          (player.parent2_email?.trim()) ||
                          "";

      if (!targetEmail) {
        missingEmailPlayers.push({
          id: player.id,
          name: fullName,
          pin: effectivePin,
        });
        continue;
      }

      // 5. Enviar correo con el PIN
      const htmlContent = getPlayerPinEmailHtml({
        playerName: fullName,
        pinCode: effectivePin,
        clubName,
        teamName,
      });

      const res = await sendEmail({
        to: targetEmail,
        subject: `🔐 PIN de Registro Familiar - ${fullName} (${clubName})`,
        html: htmlContent,
      });

      if (res.success) {
        sentCount++;
      } else {
        executionErrors.push(`No se pudo enviar a ${fullName} (${targetEmail}): ${res.error || "Fallo en envío"}`);
      }
    }

    return {
      success: true,
      totalPlayers: players.length,
      sentCount,
      skippedCount: missingEmailPlayers.length,
      missingEmailPlayers,
      errors: executionErrors,
    };
  } catch (err: any) {
    console.error("[sendTeamPinsByEmailAction Exception]:", err);
    return {
      success: false,
      error: err.message || "Error inesperado al distribuir los PINs.",
      totalPlayers: 0,
      sentCount: 0,
      skippedCount: 0,
      missingEmailPlayers: [],
      errors: [err.message || "Excepción general"],
    };
  }
}

export interface PlayerPinDetailsResult {
  success: boolean;
  error?: string;
  pin: string;
  playerName: string;
  teamName: string;
  clubName: string;
  suggestedEmails: Array<{ label: string; email: string }>;
  linkedTutors: Array<{
    id: string;
    email: string;
    name: string;
    role: string;
    isPrimary: boolean;
  }>;
}

/**
 * Obtiene el PIN actual y tutores vinculados a un jugador específico para el panel de administración
 */
export async function getPlayerFamilyPinInfoAction(playerId: string): Promise<PlayerPinDetailsResult> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "No autenticado", pin: "", playerName: "", teamName: "", clubName: "", suggestedEmails: [], linkedTutors: [] };
    }

    const adminSupabase = await createAdminClient();

    const { data: player, error: pErr } = await adminSupabase
      .from("players")
      .select(`
        id, first_name, last_name, link_code, email, parent1_email, parent1_name, parent1_last_name, parent2_email, parent2_name, parent2_last_name,
        tutor_id,
        team_id,
        teams(name, clubs(name))
      `)
      .eq("id", playerId)
      .single();

    if (pErr || !player) {
      return { success: false, error: "Jugador no encontrado", pin: "", playerName: "", teamName: "", clubName: "", suggestedEmails: [], linkedTutors: [] };
    }

    let effectivePin = player.link_code?.trim() || "";
    if (!effectivePin) {
      effectivePin = generateLinkCode();
      await adminSupabase.from("players").update({ link_code: effectivePin }).eq("id", playerId);
    }

    const fullName = `${player.first_name || ""} ${player.last_name || ""}`.trim() || "Jugador";
    const teamObj = Array.isArray(player.teams) ? player.teams[0] : player.teams;
    const teamName = teamObj?.name || "Sin equipo";
    const clubObj = Array.isArray((teamObj as any)?.clubs) ? (teamObj as any).clubs[0] : (teamObj as any)?.clubs;
    const clubName = clubObj?.name || "Sporting Saladar";

    // Emails sugeridos
    const suggestedEmails: Array<{ label: string; email: string }> = [];
    if (player.parent1_email) {
      suggestedEmails.push({ label: `Padre/Tutor 1 (${player.parent1_name || 'Tutor'})`, email: player.parent1_email.trim() });
    }
    if (player.parent2_email) {
      suggestedEmails.push({ label: `Padre/Tutor 2 (${player.parent2_name || 'Tutor'})`, email: player.parent2_email.trim() });
    }
    if (player.email) {
      suggestedEmails.push({ label: "Correo del Jugador", email: player.email.trim() });
    }

    // Tutores vinculados actualmente
    const linkedTutors: Array<{ id: string; email: string; name: string; role: string; isPrimary: boolean }> = [];
    const tutorUserIds = new Set<string>();

    if (player.tutor_id) tutorUserIds.add(player.tutor_id);

    const { data: ptRows } = await adminSupabase
      .from("player_tutors")
      .select("tutor_id")
      .eq("player_id", playerId);

    (ptRows || []).forEach(pt => {
      if (pt.tutor_id) tutorUserIds.add(pt.tutor_id);
    });

    if (tutorUserIds.size > 0) {
      const { data: profiles } = await adminSupabase
        .from("profiles")
        .select("id, email, first_name, last_name, role")
        .in("id", Array.from(tutorUserIds));

      (profiles || []).forEach(prof => {
        linkedTutors.push({
          id: prof.id,
          email: prof.email || "Sin email",
          name: `${prof.first_name || ""} ${prof.last_name || ""}`.trim() || prof.email || "Usuario",
          role: prof.role || "family",
          isPrimary: prof.id === player.tutor_id,
        });
      });
    }

    return {
      success: true,
      pin: effectivePin,
      playerName: fullName,
      teamName,
      clubName,
      suggestedEmails,
      linkedTutors,
    };
  } catch (err: any) {
    return { success: false, error: err.message, pin: "", playerName: "", teamName: "", clubName: "", suggestedEmails: [], linkedTutors: [] };
  }
}

/**
 * Regenera un nuevo PIN para un jugador (por si se comprometió o se quiere invalidar el anterior)
 */
export async function regeneratePlayerPinAction(playerId: string): Promise<{ success: boolean; newPin?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "No autenticado" };

    const adminSupabase = await createAdminClient();
    const newPin = generateLinkCode();

    const { error } = await adminSupabase
      .from("players")
      .update({ link_code: newPin })
      .eq("id", playerId);

    if (error) return { success: false, error: error.message };

    return { success: true, newPin };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Envía el PIN de un jugador a un correo específico indicado manualmente por el administrador
 */
export async function sendSinglePlayerPinByEmailAction(params: {
  playerId: string;
  recipientEmail: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { playerId, recipientEmail } = params;
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return { success: false, error: "Introduce un correo electrónico válido." };
    }

    const info = await getPlayerFamilyPinInfoAction(playerId);
    if (!info.success || !info.pin) {
      return { success: false, error: info.error || "No se pudo obtener el PIN del jugador" };
    }

    const htmlContent = getPlayerPinEmailHtml({
      playerName: info.playerName,
      pinCode: info.pin,
      clubName: info.clubName,
      teamName: info.teamName,
    });

    const res = await sendEmail({
      to: recipientEmail.trim(),
      subject: `🔐 PIN de Registro y Acceso Familiar - ${info.playerName} (${info.clubName})`,
      html: htmlContent,
    });

    if (!res.success) {
      return { success: false, error: res.error || "Error al enviar el correo" };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export interface LinkTutorWithPinParams {
  pinCode: string;
  tutorFirstName: string;
  tutorLastName: string;
  tutorEmail: string;
  tutorPhone?: string;
  password?: string;
  consentRgpd: boolean;
}

export interface LinkTutorWithPinResult {
  success: boolean;
  error?: string;
  playerId?: string;
  playerName?: string;
  teamName?: string;
  email?: string;
  isExistingUser?: boolean;
}

/**
 * Vincula a un padre/madre o segundo tutor con un jugador ya existente mediante el PIN.
 * Crea el usuario/perfil del tutor y la vinculación en player_tutors sin pedir datos duplicados ni tallas ni cuotas.
 */
export async function linkTutorWithPinAction(params: LinkTutorWithPinParams): Promise<LinkTutorWithPinResult> {
  try {
    const {
      pinCode,
      tutorFirstName,
      tutorLastName,
      tutorEmail,
      tutorPhone,
      password,
      consentRgpd,
    } = params;

    if (!pinCode || pinCode.trim().length < 4) {
      return { success: false, error: "Introduce un código PIN válido." };
    }

    if (!tutorFirstName?.trim() || !tutorLastName?.trim()) {
      return { success: false, error: "Introduce el nombre y apellidos del tutor." };
    }

    const normalizedEmail = tutorEmail?.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
      return { success: false, error: "Introduce un correo electrónico válido." };
    }

    if (!consentRgpd) {
      return { success: false, error: "Debes aceptar el consentimiento de protección de datos (RGPD) para continuar." };
    }

    const adminSupabase = await createAdminClient();

    // 1. Localizar jugador por PIN
    const { data: player, error: playerError } = await adminSupabase
      .from("players")
      .select("id, first_name, last_name, club_id, team_id, parent1_email, parent2_email, parent2_phone, teams(name)")
      .eq("link_code", pinCode.trim().toUpperCase())
      .maybeSingle();

    if (playerError || !player) {
      return {
        success: false,
        error: "Código PIN no válido o no encontrado. Por favor comprueba el PIN facilitado por el club.",
      };
    }

    // 2. Gestionar usuario Auth y Perfil
    let targetUserId: string | null = null;
    let isExistingUser = false;

    // Verificar si el usuario actual ya está autenticado con este email
    const supabase = await createClient();
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (currentUser && currentUser.email?.toLowerCase() === normalizedEmail) {
      targetUserId = currentUser.id;
      isExistingUser = true;
    } else {
      // Buscar en profiles si ya existe cuenta
      const { data: existingProfile } = await adminSupabase
        .from("profiles")
        .select("id, role")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingProfile) {
        targetUserId = existingProfile.id;
        isExistingUser = true;
      } else {
        // Usuario nuevo: requiere contraseña
        if (!password || password.length < 6) {
          return { success: false, error: "La contraseña debe tener un mínimo de 6 caracteres." };
        }

        const { data: newAuth, error: createAuthError } = await adminSupabase.auth.admin.createUser({
          email: normalizedEmail,
          password: password,
          email_confirm: true,
          user_metadata: {
            first_name: tutorFirstName.trim(),
            last_name: tutorLastName.trim(),
            role: "tutor",
            club_id: player.club_id,
            team_id: player.team_id,
          },
        });

        if (createAuthError) {
          // Si ya existe en auth pero no tenía perfil en profiles
          if (
            createAuthError.message.toLowerCase().includes("already registered") ||
            createAuthError.message.toLowerCase().includes("already been registered")
          ) {
            const { data: userList } = await adminSupabase.auth.admin.listUsers();
            const match = userList.users.find(u => u.email?.toLowerCase() === normalizedEmail);
            if (match) {
              targetUserId = match.id;
              isExistingUser = true;
            } else {
              return {
                success: false,
                error: "Este correo ya está registrado en el sistema. Inicia sesión para vincular la ficha.",
              };
            }
          } else {
            return { success: false, error: createAuthError.message };
          }
        } else if (newAuth?.user) {
          targetUserId = newAuth.user.id;
        }
      }
    }

    if (!targetUserId) {
      return { success: false, error: "No se pudo identificar ni crear el usuario para el tutor." };
    }

    // 3. Upsert en profiles para asegurar datos completos y rol tutor
    await adminSupabase.from("profiles").upsert(
      {
        id: targetUserId,
        email: normalizedEmail,
        first_name: tutorFirstName.trim(),
        last_name: tutorLastName.trim(),
        phone: tutorPhone?.trim() || null,
        role: "tutor",
        club_id: player.club_id,
        team_id: player.team_id,
      },
      { onConflict: "id" }
    );

    // 4. Vincular en player_tutors (sin duplicar)
    const { data: existingTutorLink } = await adminSupabase
      .from("player_tutors")
      .select("id")
      .eq("player_id", player.id)
      .eq("tutor_id", targetUserId)
      .maybeSingle();

    if (!existingTutorLink) {
      await adminSupabase.from("player_tutors").insert({
        player_id: player.id,
        tutor_id: targetUserId,
      });
    }

    // 5. Rellenar parent2 en la ficha del jugador si estaba vacía
    const playerUpdates: any = {};
    if (!player.parent2_email && normalizedEmail !== player.parent1_email?.toLowerCase()) {
      playerUpdates.parent2_email = normalizedEmail;
      playerUpdates.parent2_name = `${tutorFirstName.trim()} ${tutorLastName.trim()}`.trim();
    }
    if (!player.parent2_phone && tutorPhone?.trim()) {
      playerUpdates.parent2_phone = tutorPhone.trim();
    }
    if (Object.keys(playerUpdates).length > 0) {
      await adminSupabase.from("players").update(playerUpdates).eq("id", player.id);
    }

    const team = Array.isArray(player.teams) ? player.teams[0] : player.teams;

    return {
      success: true,
      playerId: player.id,
      playerName: `${player.first_name} ${player.last_name}`.trim(),
      teamName: team?.name || "Equipo Asignado",
      email: normalizedEmail,
      isExistingUser,
    };
  } catch (err: any) {
    console.error("[linkTutorWithPinAction Error]:", err);
    return { success: false, error: err.message || "Error al vincular el tutor mediante PIN." };
  }
}

