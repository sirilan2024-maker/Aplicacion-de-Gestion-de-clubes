"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"

export async function altaAsistidaAction({
  email,
  playerName,
  clubId
}: {
  email: string;
  playerName: string;
  clubId: string;
}) {
  try {
    const supabase = await createClient()
    const adminSupabase = await createAdminClient()

    let userId: string | null = null;
    let isNewUser = false;

    // 1. Check if user already exists
    // We try to invite. If it fails because user exists, we fallback.
    const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      data: { role: 'family' },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?verify=true`
    });

    if (inviteError) {
      if (inviteError.message.includes("already registered") || inviteError.status === 422 || inviteError.status === 400) {
        // User exists. Find their ID.
        const { data: profile } = await adminSupabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();
        
        if (profile) {
          userId = profile.id;
          // Send them a magic link natively
          await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?verify=true`
            }
          });
        } else {
          return { success: false, error: "El usuario existe pero no se encontró su perfil." }
        }
      } else {
        return { success: false, error: inviteError.message }
      }
    } else {
      userId = inviteData.user.id;
      isNewUser = true;
    }

    if (!userId) {
      return { success: false, error: "No se pudo obtener el ID del usuario." }
    }

    // 2. Create the player with gdpr_consent = false
    const { data: newPlayer, error: playerError } = await adminSupabase
      .from("players")
      .insert({
        first_name: playerName,
        last_name: "", // Lo pedimos simplificado
        club_id: clubId,
        tutor_id: userId,
        gdpr_consent: false,
        status: "active", // Active but with pending consent
        parent1_email: email,
        parent_contact: email
      })
      .select("id")
      .single();

    if (playerError) {
      console.error("[AltaAsistida] Error creating player:", playerError);
      return { success: false, error: "Error al crear la ficha del jugador." }
    }

    // 3. Link player to tutor explicitly just in case
    await adminSupabase.from("player_tutors").insert({
      player_id: newPlayer.id,
      tutor_id: userId
    });

    return { success: true }
  } catch (error: any) {
    console.error("[AltaAsistida] Exception:", error);
    return { success: false, error: error.message || "Error inesperado" }
  }
}
