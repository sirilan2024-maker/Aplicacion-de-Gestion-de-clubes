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
