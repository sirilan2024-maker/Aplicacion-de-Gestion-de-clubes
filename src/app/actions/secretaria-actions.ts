"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { getAuthenticatedContext, ADMIN_ROLES, canUserAccessPlayer } from "@/lib/auth-helpers"

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
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || "No autenticado" };
    }

    if (!ADMIN_ROLES.includes(context.profile.role) || context.profile.club_id !== clubId) {
      return { success: false, error: "No tienes permisos para registrar miembros en este club" };
    }

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
        club_id: context.profile.club_id,
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
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || "No autenticado", documents: [] };
    }

    const supabaseAdmin = await createAdminClient();

    const access = await canUserAccessPlayer(supabaseAdmin, context, playerId);
    if (!access.allowed || !access.player || access.player.club_id !== context.profile.club_id) {
      return { success: false, error: access.reason || "No autorizado", documents: [] };
    }

    // 1. Obtener documentos de la tabla player_documents
    const { data: docs, error: docsError } = await supabaseAdmin
      .from('player_documents')
      .select('id, document_type, file_url, status, rejection_reason, created_at')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false });

    if (docsError) throw docsError;

    // 2. Obtener datos del jugador, SEPA y del tutor desde families
    const { data: playerRow } = await supabaseAdmin
      .from('players')
      .select('family_id, sip, dni, first_name, last_name, is_senior, parent1_name, parent1_last_name, parent1_dni, iban, sepa_mandate_id, sepa_mandate_date, families(id, tutor_1_dni_url, tutor_2_dni_url)')
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

    const isSenior = Boolean(playerRow?.is_senior);
    const payer = isSenior
      ? {
          type: 'senior',
          name: `${playerRow?.first_name || ''} ${playerRow?.last_name || ''}`.trim(),
          dni: playerRow?.dni || null,
        }
      : {
          type: 'tutor',
          name: `${playerRow?.parent1_name || ''} ${playerRow?.parent1_last_name || ''}`.trim() || playerRow?.parent1_name || null,
          dni: playerRow?.parent1_dni || null,
        };

    return {
      success: true,
      documents: documentsWithUrls,
      tutorDniUrl: tutorDniSignedUrl,
      tutorDni2Url: tutorDni2SignedUrl,
      familyId: family?.id || null,
      sipNumber: playerRow?.sip || null,
      playerDni: playerRow?.dni || null,
      sepa: {
        iban: playerRow?.iban || null,
        sepa_mandate_id: playerRow?.sepa_mandate_id || null,
        sepa_mandate_date: playerRow?.sepa_mandate_date || null,
      },
      payer,
      isSenior,
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
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || "No autenticado" };
    }

    if (!ADMIN_ROLES.includes(context.profile.role) && context.profile.role !== 'secretario') {
      return { success: false, error: "No tienes permisos para cambiar el estado del documento" };
    }

    const supabaseAdmin = await createAdminClient();

    // Validar que el documento pertenezca al club del usuario
    const { data: doc } = await supabaseAdmin
      .from('player_documents')
      .select('id, player_id, players(club_id)')
      .eq('id', docId)
      .single();

    const docClubId = (doc?.players as any)?.club_id;
    if (!doc || docClubId !== context.profile.club_id) {
      return { success: false, error: "Documento no encontrado o ajeno a tu club" };
    }

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
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || "No autenticado", apparel: [] };
    }

    const supabaseAdmin = await createAdminClient();

    const access = await canUserAccessPlayer(supabaseAdmin, context, playerId);
    if (!access.allowed || !access.player || access.player.club_id !== context.profile.club_id) {
      return { success: false, error: access.reason || "No autorizado", apparel: [] };
    }

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
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || "No autenticado" };
    }

    if (!ADMIN_ROLES.includes(context.profile.role) && context.profile.role !== 'utillero') {
      return { success: false, error: "No tienes permisos de utillería" };
    }

    const supabaseAdmin = await createAdminClient();

    const { data: appRow } = await supabaseAdmin
      .from('player_apparel')
      .select('id, player_id, players(club_id)')
      .eq('id', apparelId)
      .single();

    const appClubId = (appRow?.players as any)?.club_id;
    if (!appRow || appClubId !== context.profile.club_id) {
      return { success: false, error: "Prenda no encontrada o ajena a tu club" };
    }

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
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || "No autenticado" };
    }

    const supabaseAdmin = await createAdminClient();

    const access = await canUserAccessPlayer(supabaseAdmin, context, playerId);
    if (!access.allowed || !access.player || access.player.club_id !== context.profile.club_id) {
      return { success: false, error: access.reason || "No autorizado para consultar esta ficha" };
    }

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
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || "No autenticado" };
    }

    const isAdmin = ADMIN_ROLES.includes(context.profile.role) || context.profile.role === 'secretario';
    const isOwner = filePath.startsWith(`${context.user.id}/`);
    if (!isAdmin && !isOwner) {
      return { success: false, error: "No autorizado para acceder a este documento" };
    }

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
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }

  if (!ADMIN_ROLES.includes(context.profile.role)) {
    return { success: false, error: "No tienes permisos de secretaría para validar jugadores" };
  }

  const adminSupabase = await createAdminClient();
  const access = await canUserAccessPlayer(adminSupabase, context, playerId);
  if (!access.allowed || !access.player || access.player.club_id !== context.profile.club_id) {
    return { success: false, error: access.reason || "Jugador no encontrado o no autorizado" };
  }
  
  // 1. Update player status
  const { error: updateError } = await adminSupabase
    .from('players')
    .update({ registration_status: 'formalized' })
    .eq('id', playerId)
    .eq('club_id', context.profile.club_id);
    
  if (updateError) return { success: false, error: updateError.message };
  
  // 2. Generate fees only if they don't exist yet
  const { createAdminFeeForPlayerAction } = await import('@/app/actions/treasury-actions');
  await createAdminFeeForPlayerAction(playerId, access.player.was_in_club || false);
  
  revalidatePath('/dashboard/club/jugador/[id]', 'page');
  revalidatePath('/dashboard/club/miembros');
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// P11-E: Gestión de Datos SEPA de Jugador (Captura Secretaría)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtener datos SEPA y datos de pagador según reglas de negocio:
 * Si is_senior = true -> pagador es el jugador (nombre, dni, contacto)
 * Si is_senior = false -> pagador es el tutor en parent1_*
 */
export async function getPlayerSepaAction(playerId: string) {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || "No autenticado" };
    }

    if (!ADMIN_ROLES.includes(context.profile.role)) {
      return { success: false, error: "No tienes permisos para consultar datos SEPA" };
    }

    const adminClient = await createAdminClient();
    const access = await canUserAccessPlayer(adminClient, context, playerId);
    if (!access.allowed || !access.player || access.player.club_id !== context.profile.club_id) {
      return { success: false, error: access.reason || "No autorizado para consultar este jugador" };
    }

    const { data: player, error } = await adminClient
      .from('players')
      .select(`
        id, club_id, first_name, last_name, dni, phone, email, is_senior,
        parent1_name, parent1_last_name, parent1_dni, parent1_phone, parent1_email,
        iban, sepa_mandate_id, sepa_mandate_date
      `)
      .eq('id', playerId)
      .single();

    if (error || !player) {
      return { success: false, error: "Jugador no encontrado" };
    }

    // Regla de Pagador P11-E:
    // Si is_senior = true: el pagador es el propio jugador.
    // Si is_senior = false: el pagador es el tutor registrado en parent1_*.
    const isSenior = Boolean(player.is_senior);
    const payer = isSenior
      ? {
          type: 'senior',
          name: `${player.first_name || ''} ${player.last_name || ''}`.trim(),
          dni: player.dni || null,
          phone: player.phone || null,
          email: player.email || null,
        }
      : {
          type: 'tutor',
          name: `${player.parent1_name || ''} ${player.parent1_last_name || ''}`.trim() || player.parent1_name || null,
          dni: player.parent1_dni || null,
          phone: player.parent1_phone || null,
          email: player.parent1_email || null,
        };

    return {
      success: true,
      sepa: {
        iban: player.iban || null,
        sepa_mandate_id: player.sepa_mandate_id || null,
        sepa_mandate_date: player.sepa_mandate_date || null,
      },
      payer,
      isSenior,
    };
  } catch {
    return { success: false, error: "Error al recuperar datos SEPA del jugador" };
  }
}

/**
 * Actualizar datos SEPA de un jugador (IBAN, Mandato, Fecha Mandato)
 */
export async function updatePlayerSepaAction(playerId: string, {
  iban,
  sepaMandateId,
  sepaMandateDate,
}: {
  iban: string | null;
  sepaMandateId: string | null;
  sepaMandateDate: string | null;
}) {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return { success: false, error: authError || "No autenticado" };
    }

    if (!ADMIN_ROLES.includes(context.profile.role)) {
      return { success: false, error: "No tienes permisos de Secretaría para modificar datos SEPA" };
    }

    const adminClient = await createAdminClient();
    const access = await canUserAccessPlayer(adminClient, context, playerId);
    if (!access.allowed || !access.player || access.player.club_id !== context.profile.club_id) {
      return { success: false, error: access.reason || "No tienes permisos para modificar este jugador" };
    }

    // Limpieza y validación segura
    const cleanIban = iban ? iban.replace(/\s+/g, '').toUpperCase() : null;
    const cleanMandateId = sepaMandateId ? sepaMandateId.trim() : null;
    const cleanMandateDate = sepaMandateDate ? sepaMandateDate.trim() : null;

    if (cleanIban && !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(cleanIban)) {
      return { success: false, error: "El formato de IBAN no es válido" };
    }

    const { error: updateError } = await adminClient
      .from('players')
      .update({
        iban: cleanIban,
        sepa_mandate_id: cleanMandateId,
        sepa_mandate_date: cleanMandateDate || null,
      })
      .eq('id', playerId)
      .eq('club_id', context.profile.club_id);

    if (updateError) {
      // Seguridad: nunca mostrar IBAN ni detalles sensibles en logs
      console.error('[updatePlayerSepaAction] Error al guardar datos SEPA');
      return { success: false, error: "Error al guardar los datos SEPA del jugador" };
    }

    revalidatePath(`/dashboard/club/jugador/${playerId}`);
    revalidatePath('/admin/secretaria');
    return { success: true };
  } catch {
    return { success: false, error: "Error inesperado al guardar datos SEPA" };
  }
}



