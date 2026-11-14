import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resuelve o auto-vincula un jugador a un usuario familiar/tutor/jugador.
 * Estrategia de resolución jerárquica:
 * 1. Comprueba vinculación previa en profiles.linked_player_id.
 * 2. Comprueba asignación directa en tabla players (tutor_id, user_auth_id, user_id).
 * 3. Comprueba relación en player_tutors.
 * 4. Auto-vinculación inteligente por EMAIL (parent1_email / parent2_email / email).
 * 5. Auto-vinculación inteligente por TELÉFONO (parent1_phone / parent2_phone / phone) usando los últimos 9 dígitos.
 * 6. Auto-vinculación inteligente por DNI/NIE (parent1_dni / parent2_dni).
 * 
 * Si se encuentra coincidencia, se persiste automáticamente en la base de datos
 * y el usuario accede inmediatamente a su hijo/a sin esperas ni fricción.
 */
export async function resolveOrAutoLinkFamilyPlayer(userId: string, userEmail?: string | null): Promise<string | null> {
  const admin = createAdminClient();

  // 1. Comprobar si ya tiene linked_player_id en profiles
  const { data: profile } = await admin
    .from("profiles")
    .select("linked_player_id, phone, dni")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.linked_player_id) {
    const { data: validPlayer } = await admin
      .from("players")
      .select("id, status")
      .eq("id", profile.linked_player_id)
      .neq("status", "inactive")
      .maybeSingle();

    if (validPlayer?.id) {
      return validPlayer.id;
    }
  }

  // 2. Comprobar asignación directa en players (tutor_id, user_auth_id, user_id)
  const { data: directPlayer } = await admin
    .from("players")
    .select("id")
    .or(`tutor_id.eq.${userId},user_auth_id.eq.${userId},user_id.eq.${userId}`)
    .neq("status", "inactive")
    .limit(1)
    .maybeSingle();

  if (directPlayer?.id) {
    if (!profile?.linked_player_id) {
      await admin.from("profiles").update({ linked_player_id: directPlayer.id }).eq("id", userId);
    }
    return directPlayer.id;
  }

  // 3. Comprobar relación en player_tutors
  const { data: tutorLink } = await admin
    .from("player_tutors")
    .select("player_id, players!inner(status)")
    .eq("tutor_id", userId)
    .limit(1)
    .maybeSingle();

  if (tutorLink?.player_id && (tutorLink.players as any)?.status !== "inactive") {
    if (!profile?.linked_player_id) {
      await admin.from("profiles").update({ linked_player_id: tutorLink.player_id }).eq("id", userId);
    }
    return tutorLink.player_id;
  }

  // Helper interno para aplicar la auto-vinculación en segundo plano
  async function applyAutoLink(matchId: string, currentTutorId: string | null) {
    await admin.from("profiles").update({ linked_player_id: matchId }).eq("id", userId);

    if (!currentTutorId) {
      await admin.from("players").update({ tutor_id: userId }).eq("id", matchId);
    }

    const { data: existingPt } = await admin
      .from("player_tutors")
      .select("id")
      .eq("player_id", matchId)
      .eq("tutor_id", userId)
      .maybeSingle();

    if (!existingPt) {
      await admin.from("player_tutors").insert({
        player_id: matchId,
        tutor_id: userId,
        relationship: "tutor_principal"
      });
    }
  }

  // 4. AUTO-VINCULACIÓN INTELIGENTE POR EMAIL
  if (userEmail && userEmail.trim().length > 3) {
    const cleanEmail = userEmail.trim().toLowerCase();
    const { data: matchingPlayers } = await admin
      .from("players")
      .select("id, first_name, last_name, tutor_id")
      .or(`parent1_email.ilike.${cleanEmail},parent2_email.ilike.${cleanEmail},email.ilike.${cleanEmail}`)
      .neq("status", "inactive")
      .limit(1);

    if (matchingPlayers && matchingPlayers.length > 0) {
      const match = matchingPlayers[0];
      await applyAutoLink(match.id, match.tutor_id);
      return match.id;
    }
  }

  // 5. AUTO-VINCULACIÓN INTELIGENTE POR TELÉFONO MÓVIL
  // Si no hubo coincidencia por email, buscar por teléfono si el usuario lo tiene registrado
  let userPhone = profile?.phone;
  if (!userPhone) {
    // Buscar teléfono en auth.users si no está en profile
    const { data: authUserData } = await admin.auth.admin.getUserById(userId);
    userPhone = authUserData?.user?.phone || null;
  }

  if (userPhone) {
    const digitsOnly = userPhone.replace(/\D/g, "");
    if (digitsOnly.length >= 9) {
      const last9Digits = digitsOnly.slice(-9);
      const { data: matchingByPhone } = await admin
        .from("players")
        .select("id, first_name, last_name, tutor_id")
        .or(`parent1_phone.ilike.%${last9Digits}%,parent2_phone.ilike.%${last9Digits}%,phone.ilike.%${last9Digits}%`)
        .neq("status", "inactive")
        .limit(1);

      if (matchingByPhone && matchingByPhone.length > 0) {
        const match = matchingByPhone[0];
        await applyAutoLink(match.id, match.tutor_id);
        return match.id;
      }
    }
  }

  // 6. AUTO-VINCULACIÓN INTELIGENTE POR DNI / NIE
  const cleanDni = profile?.dni ? profile.dni.trim().toUpperCase() : null;
  if (cleanDni && cleanDni.length >= 7) {
    const { data: matchingByDni } = await admin
      .from("players")
      .select("id, first_name, last_name, tutor_id")
      .or(`parent1_dni.ilike.%${cleanDni}%,parent2_dni.ilike.%${cleanDni}%`)
      .neq("status", "inactive")
      .limit(1);

    if (matchingByDni && matchingByDni.length > 0) {
      const match = matchingByDni[0];
      await applyAutoLink(match.id, match.tutor_id);
      return match.id;
    }
  }

  return null;
}
