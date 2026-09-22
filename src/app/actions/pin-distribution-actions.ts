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

