"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

// ─────────────────────────────────────────────────────────────────────────────
// Alta Asistida (invitación de miembro desde el panel de Secretaría)
// ─────────────────────────────────────────────────────────────────────────────
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

    const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      data: { role: 'familia' },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?verify=true`
    });

    if (inviteError) {
      if (inviteError.message.includes("already registered") || inviteError.status === 422 || inviteError.status === 400) {
        const { data: profile } = await adminSupabase
          .from("profiles")
          .select("id")
          .eq("email", email)
          .single();
        
        if (profile) {
          userId = profile.id;
          await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?verify=true` }
          });
        } else {
          return { success: false, error: "El usuario existe pero no se encontró su perfil." }
        }
      } else {
        return { success: false, error: inviteError.message }
      }
    } else {
      userId = inviteData.user.id;
    }

    if (!userId) {
      return { success: false, error: "No se pudo obtener el ID del usuario." }
    }

    const { data: newPlayer, error: playerError } = await adminSupabase
      .from("players")
      .insert({
        first_name: playerName,
        last_name: "",
        club_id: clubId,
        tutor_id: userId,
        user_auth_id: userId,
        gdpr_consent: false,
        status: "active",
        parent1_email: email,
        parent_contact: email,
        registration_status: 'pending_revision',
      })
      .select("id")
      .single();

    if (playerError) {
      console.error("[AltaAsistida] Error creating player:", playerError);
      return { success: false, error: "Error al crear la ficha del jugador." }
    }

    await adminSupabase.from("player_tutors").insert({
      player_id: newPlayer.id,
      tutor_id: userId,
      is_primary: true,
    });

    return { success: true }
  } catch (error: any) {
    console.error("[AltaAsistida] Exception:", error);
    return { success: false, error: error.message || "Error inesperado" }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 5: Obtener documentos de un jugador desde las tablas definitivas
// Lee de player_documents, families (DNI tutor) y players (SIP)
// Genera Signed URLs temporales (15 min) desde el bucket expedientes-doc
// ─────────────────────────────────────────────────────────────────────────────
export async function getPlayerExpedienteAction(playerId: string) {
  try {
    const supabaseAdmin = await createAdminClient();

    // 1. Obtener documentos de la tabla player_documents
    const { data: docs, error: docsError } = await supabaseAdmin
      .from('player_documents')
      .select('id, document_type, file_url, status, rejection_reason, created_at')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (docsError) throw docsError;

    // 2. Obtener el DNI del tutor desde families (vinculado por family_id en players)
    const { data: playerRow } = await supabaseAdmin
      .from('players')
      .select('family_id, sip, dni, families(id, tutor_1_dni_url, tutor_2_dni_url)')
      .eq('id', playerId)
      .single();

    // 3. Generar Signed URLs para todos los documentos de player_documents
    const documentsWithUrls = await Promise.all(
      (docs || []).map(async (doc) => {
        let signedUrl: string | null = null;
        if (doc.file_url) {
          const { data } = await supabaseAdmin.storage
            .from('expedientes-doc')
            .createSignedUrl(doc.file_url, 900); // 15 minutos
          signedUrl = data?.signedUrl || null;
        }
        return { ...doc, signedUrl };
      })
    );

    // 4. Generar Signed URL para el DNI del tutor si existe
    const family = playerRow?.families as any;
    let tutorDniSignedUrl: string | null = null;
    let tutorDni2SignedUrl: string | null = null;
    
    if (family?.tutor_1_dni_url) {
      const { data } = await supabaseAdmin.storage
        .from('expedientes-doc')
        .createSignedUrl(family.tutor_1_dni_url, 900);
      tutorDniSignedUrl = data?.signedUrl || null;
    }
    if (family?.tutor_2_dni_url) {
      const { data } = await supabaseAdmin.storage
        .from('expedientes-doc')
        .createSignedUrl(family.tutor_2_dni_url, 900);
      tutorDni2SignedUrl = data?.signedUrl || null;
    }

    return {
      success: true,
      documents: documentsWithUrls,
      tutorDniUrl: tutorDniSignedUrl,
      tutorDni2Url: tutorDni2SignedUrl,
      familyId: family?.id || null,
      sipNumber: playerRow?.sip || null,
      playerDni: playerRow?.dni || null,
    };
  } catch (error: any) {
    console.error('[getPlayerExpedienteAction]', error);
    return { success: false, error: error.message, documents: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FASE 5: Cambiar el estado de un documento (validado / rechazado / pendiente)
// ─────────────────────────────────────────────────────────────────────────────
export async function updateDocumentStatusAction(
  docId: string,
  status: 'pendiente' | 'recibido' | 'validado' | 'rechazado' | 'caducado',
  rejectionReason?: string
) {
  try {
    const supabaseAdmin = await createAdminClient();

    const { error } = await supabaseAdmin
      .from('player_documents')
      .update({
        status,
        rejection_reason: rejectionReason || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId);

    if (error) throw error;

    revalidatePath('/dashboard/club/secretaria');
    revalidatePath('/dashboard/club/miembros');
    return { success: true };
  } catch (error: any) {
    console.error('[updateDocumentStatusAction]', error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener tallas de utillería del jugador (para la pestaña Utillería)
// ─────────────────────────────────────────────────────────────────────────────
export async function getPlayerApparelAction(playerId: string) {
  try {
    const supabaseAdmin = await createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('player_apparel')
      .select('id, item_name, size, delivered, delivered_at')
      .eq('player_id', playerId)
      .order('item_name');

    if (error) throw error;
    return { success: true, apparel: data || [] };
  } catch (error: any) {
    console.error('[getPlayerApparelAction]', error);
    return { success: false, error: error.message, apparel: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Marcar prenda como entregada
// ─────────────────────────────────────────────────────────────────────────────
export async function markApparelDeliveredAction(apparelId: string, delivered: boolean) {
  try {
    const supabaseAdmin = await createAdminClient();
    const { error } = await supabaseAdmin
      .from('player_apparel')
      .update({
        delivered,
        delivered_at: delivered ? new Date().toISOString() : null,
      })
      .eq('id', apparelId);

    if (error) throw error;
    revalidatePath('/dashboard/club/secretaria');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener ficha completa del jugador para el panel de Secretaría (Fase 5)
// ─────────────────────────────────────────────────────────────────────────────
export async function getPlayerFichaAction(playerId: string) {
  try {
    const supabaseAdmin = await createAdminClient();

    const { data, error } = await supabaseAdmin
      .from('players')
      .select(`
        *,
        teams(name, category, color),
        families(id, tutor_1_dni_url, tutor_2_name, tutor_2_dni_url, iban_account)
      `)
      .eq('id', playerId)
      .single();

    if (error) throw error;
    return { success: true, player: data };
  } catch (error: any) {
    console.error('[getPlayerFichaAction]', error);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Funciones heredadas (compatibilidad)
// ─────────────────────────────────────────────────────────────────────────────
export async function getSignedDniUrlAction(filePath: string) {
  try {
    const supabaseAdmin = await createAdminClient();
    const { data, error } = await supabaseAdmin
      .storage
      .from('expedientes-doc') // ← Bucket correcto
      .createSignedUrl(filePath, 900);

    if (error || !data) throw error || new Error('No se pudo generar la URL firmada');
    return { success: true, signedUrl: data.signedUrl };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function listPlayerDocumentsAction(playerId: string) {
  // Redirige a la nueva implementación que usa la tabla player_documents
  const result = await getPlayerExpedienteAction(playerId);
  if (!result.success) return { success: false, error: result.error };
  
  return {
    success: true,
    documents: result.documents.map((d: any) => ({
      name: d.document_type,
      url: d.signedUrl,
      size: 0,
      created_at: d.created_at,
    })).filter((d: any) => d.url),
  };
}

export async function submitMegaWizardAction(payload: any, clubId: string) {
  try {
    const supabaseAdmin = await createAdminClient();
    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'IP desconocida';
    const timestamp = new Date().toISOString();

    const { data: newPlayer, error } = await supabaseAdmin.from("players").insert({
      first_name: payload.playerFirstName,
      last_name: payload.playerLastName,
      birth_date: payload.birthDate,
      club_id: clubId,
      gdpr_consent: true,
      consent_rgpd_at: payload.consentRgpd ? timestamp : null,
      consent_tutela_at: payload.consentTutela ? timestamp : null,
      consent_medical_at: payload.consentMedical ? timestamp : null,
      consent_image_at: payload.consentImage ? timestamp : null,
      consent_ip: ip,
      consent_user_agent: headersList.get('user-agent') || 'Unknown',
      is_foreign: payload.isForeign,
      never_federated: payload.neverFederated,
      registration_status: 'pending_revision',
      status: 'active',
    }).select("id").single();

    if (error) throw error;
    return { success: true, playerId: newPlayer.id };
  } catch (error: any) {
    console.error("[Wizard] Error:", error);
    return { success: false, error: error.message };
  }
}

export async function validatePlayerRegistrationAction(playerId: string) {
  const adminSupabase = await createAdminClient();
  const { data: player, error: fetchError } = await adminSupabase.from('players').select('*').eq('id', playerId).single();
  
  if (fetchError || !player) {
    return { success: false, error: 'Jugador no encontrado' };
  }
  
  // 1. Update player status
  const { error: updateError } = await adminSupabase
    .from('players')
    .update({ registration_status: 'formalized' })
    .eq('id', playerId);
    
  if (updateError) return { success: false, error: updateError.message };
  
  // 2. Generate fees only if they don't exist yet
  const { createAdminFeeForPlayerAction } = await import('@/app/actions/treasury-actions');
  await createAdminFeeForPlayerAction(playerId, player.was_in_club || false);
  
  revalidatePath('/dashboard/club/jugador/[id]', 'page');
  revalidatePath('/dashboard/club/miembros');
  return { success: true };
}

