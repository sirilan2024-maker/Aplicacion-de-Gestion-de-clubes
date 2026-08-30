'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedContext, ADMIN_ROLES, canUserAccessPlayer, canUserManageRegistration, canUserUpdateRegistrationEmail } from "@/lib/auth-helpers";

export async function getInscriptionsAction() {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) return { success: false, data: [] };

  if (!ADMIN_ROLES.includes(context.profile.role) && context.profile.role !== 'secretario') {
    return { success: false, data: [] };
  }

  const clubId = context.profile.club_id;
  if (!clubId) return { success: false, data: [] };

  const adminSupabase = await createAdminClient();

  const { data, error } = await adminSupabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      posicion_principal,
      created_at,
      user_auth_id,
      status,
      registration_status
    `)
    .eq('club_id', clubId)
    .in('registration_status', ['pending_revision', 'request_correction', 'pending_payment', 'formalized'])
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching pending players:', error);
    return { success: false, data: [] };
  }

  // Transform data to match frontend interface
  const formattedData = data.map((item: any) => {
    return {
      id: item.id,
      name: `${item.first_name || 'Desconocido'} ${item.last_name || ''}`,
      category: item.posicion_principal || 'Sin categoría',
      date: new Date(item.created_at).toLocaleDateString('es-ES'),
      status: item.registration_status || 'pending_revision', // Mapped to UI status
      paymentMethod: 'Por Confirmar',
      feeTotal: 250, // Default for now
      raw_form_data: {}, // Not needed anymore for UI rendering
      userId: item.user_auth_id
    };
  });

  return { success: true, data: formattedData };
}

export async function approveInscriptionAction(id: string) {

  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' };
  }

  if (!ADMIN_ROLES.includes(context.profile.role)) {
    return { success: false, error: 'No tienes permisos para aprobar inscripciones' };
  }

  const supabase = await createAdminClient();

  const access = await canUserAccessPlayer(supabase, context, id);
  if (!access.allowed || !access.player || access.player.club_id !== context.profile.club_id) {
    return { success: false, error: access.reason || 'No autorizado para aprobar esta inscripción' };
  }
  
  // Update the player status to active and registration_status to formalized
  const { data: player, error: updateError } = await supabase
    .from('players')
    .update({ status: 'active', registration_status: 'formalized' })
    .eq('id', id)
    .eq('club_id', context.profile.club_id)
    .select('club_id, team_id')
    .single();

  if (updateError) {
    console.error('Error approving player:', updateError);
    return { success: false, error: updateError.message };
  }

  // Add to current season history if active
  if (player?.club_id) {
    const { data: activeSeason } = await supabase.from('seasons').select('id').eq('club_id', player.club_id).eq('is_active', true).single();
    if (activeSeason) {
      await supabase.from('player_season_history').upsert({
        player_id: id,
        club_id: player.club_id,
        season_id: activeSeason.id,
        team_id: player.team_id,
        status: 'active'
      }, { onConflict: 'player_id,season_id' });
    }
  }

  // Generar automáticamente el recibo oficial en PDF al inscribir/aprobar al miembro si ya está pagado
  try {
    const { data: playerFee } = await supabase.from('fees').select('id, estado').eq('player_id', id).limit(1).single();
    if (playerFee && playerFee.estado === 'pagado') {
      const { generateAndUploadReceiptAction } = await import('@/app/actions/treasury-actions');
      await generateAndUploadReceiptAction(playerFee.id);
    }
  } catch (e) {
    console.error('Error generando recibo automático al inscribir miembro:', e);
  }

  revalidatePath('/dashboard/inscripciones');
  revalidatePath('/dashboard/club/miembros');
  revalidatePath('/dashboard/utilleria');
  revalidatePath('/dashboard/treasury');
  return { success: true };
}

export async function requestCorrectionAction(id: string, reason: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' };
  }

  if (!ADMIN_ROLES.includes(context.profile.role)) {
    return { success: false, error: 'No tienes permisos para solicitar correcciones' };
  }

  const supabase = await createAdminClient();

  const access = await canUserManageRegistration(supabase, context, id);
  if (!access.allowed) {
    return { success: false, error: access.reason || 'No autorizado para modificar esta inscripción' };
  }
  
  const { error } = await supabase
    .from('registrations')
    .update({ 
      status: 'NEEDS_CORRECTION',
      correction_reason: reason
    })
    .eq('id', id)
    .eq('club_id', context.profile.club_id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/inscripciones');
  return { success: true };
}

export async function rejectInscriptionAction(id: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || 'No autenticado' };
  }

  if (!ADMIN_ROLES.includes(context.profile.role)) {
    return { success: false, error: 'No tienes permisos para rechazar inscripciones' };
  }

  const supabase = await createAdminClient();

  const access = await canUserAccessPlayer(supabase, context, id);
  if (!access.allowed || !access.player || access.player.club_id !== context.profile.club_id) {
    return { success: false, error: access.reason || 'No autorizado para eliminar este jugador' };
  }
  
  // 1. Fetch player name to delete associated fees
  const { data: player } = await supabase.from('players').select('first_name, last_name, user_auth_id').eq('id', id).eq('club_id', context.profile.club_id).single();
  
  if (player) {
    const conceptLike = `Inscripción Temporada - ${player.first_name} ${player.last_name}`;
    await supabase.from('fees').delete().ilike('concept', conceptLike).eq('club_id', context.profile.club_id);
  }

  // 2. Manually delete from related tables just to be safe
  await supabase.from('player_season_history').delete().eq('player_id', id).eq('club_id', context.profile.club_id);
  await supabase.from('player_tutors').delete().eq('player_id', id);
  await supabase.from('player_documents').delete().eq('player_id', id);
  await supabase.from('player_apparel').delete().eq('player_id', id);
  
  // 3. Borrado del jugador (hard delete)
  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id)
    .eq('club_id', context.profile.club_id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/inscripciones');
  return { success: true };
}


export async function updateRegistrationEmailAction(registrationId: string, newEmail: string, userId?: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) {
    return { success: false, error: authError || "No autenticado" };
  }

  const supabase = await createAdminClient();

  const access = await canUserUpdateRegistrationEmail(supabase, context, registrationId, userId);
  if (!access.allowed) {
    return { success: false, error: access.reason || "No autorizado para modificar el email de esta inscripción" };
  }
  
  // 1. Update form_data in registrations
  const { data: reg, error: fetchErr } = await supabase
    .from('registrations')
    .select('form_data, club_id')
    .eq('id', registrationId)
    .eq('club_id', context.profile.club_id)
    .single();

  if (fetchErr || !reg) return { success: false, error: fetchErr?.message || "Inscripción no encontrada" };

  const formData = reg.form_data || {};
  formData.tutor1Email = newEmail;

  const { error: updateRegErr } = await supabase
    .from('registrations')
    .update({ form_data: formData })
    .eq('id', registrationId)
    .eq('club_id', context.profile.club_id);

  if (updateRegErr) return { success: false, error: updateRegErr.message };

  // 2. Update auth.users and profiles if user_id is provided
  if (userId) {
    const { error: authErr } = await supabase.auth.admin.updateUserById(userId, { email: newEmail });
    if (authErr) return { success: false, error: authErr.message };

    const { error: profErr } = await supabase
      .from('profiles')
      .update({ email: newEmail })
      .eq('id', userId)
      .eq('club_id', context.profile.club_id);

    if (profErr) return { success: false, error: profErr.message };
  }

  revalidatePath('/dashboard/inscripciones');
  return { success: true };
}


export async function resetPasswordAction(email: string) {
  const supabase = await createAdminClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) return { success: false, error: error.message };
  return { success: true };
}
