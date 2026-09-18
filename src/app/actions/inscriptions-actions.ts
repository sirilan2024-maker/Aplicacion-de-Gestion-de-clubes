'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getAuthenticatedContext, ADMIN_ROLES, canUserAccessPlayer, canUserManageRegistration, canUserUpdateRegistrationEmail } from "@/lib/auth-helpers";

export async function getInscriptionsAction(targetSeasonId?: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) return { success: false, data: [] };

  if (!ADMIN_ROLES.includes(context.profile.role) && context.profile.role !== 'secretario') {
    return { success: false, data: [] };
  }

  const clubId = context.profile.club_id;
  if (!clubId) return { success: false, data: [] };

  const adminSupabase = await createAdminClient();

  // Obtener temporada solicitada o activa
  let seasonQuery = adminSupabase
    .from('seasons')
    .select('id, start_date, end_date')
    .eq('club_id', clubId);

  if (targetSeasonId) {
    seasonQuery = seasonQuery.eq('id', targetSeasonId);
  } else {
    seasonQuery = seasonQuery.eq('is_active', true);
  }

  const { data: seasonRow } = await seasonQuery.maybeSingle();

  if (!seasonRow?.id) return { success: true, data: [] };

  // Consultar solicitudes pendientes asociadas a la temporada elegida (via player_season_history o periodo oficial)
  const { data: seasonPsh } = await adminSupabase
    .from('player_season_history')
    .select('player_id')
    .eq('season_id', seasonRow.id);

  const seasonPlayerIds = (seasonPsh || []).map(p => p.player_id).filter(Boolean);

  let query = adminSupabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      posicion_principal,
      created_at,
      user_auth_id,
      status,
      registration_status,
      was_in_club,
      payment_method
    `)
    .eq('club_id', clubId)
    .in('registration_status', ['pending_revision', 'request_correction', 'pending_payment', 'formalized'])
    .order('created_at', { ascending: false });

  if (seasonPlayerIds.length > 0) {
    query = query.in('id', seasonPlayerIds);
  } else if (seasonRow.start_date && seasonRow.end_date) {
    query = query.gte('created_at', `${seasonRow.start_date}T00:00:00.000Z`)
                 .lte('created_at', `${seasonRow.end_date}T23:59:59.999Z`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching pending players:', error);
    return { success: false, data: [] };
  }

  // Transform data with real fee calculations (195€ renewal / 250€ new)
  const formattedData = await Promise.all((data || []).map(async (item: any) => {
    const { data: fees } = await adminSupabase
      .from('fees')
      .select('amount_cents, monto_total, estado, payment_method, metodo_pago')
      .eq('player_id', item.id);

    let totalCents = (fees || []).reduce((acc: number, f: any) => acc + (f.amount_cents || f.monto_total || 0), 0);
    let feeTotal = totalCents > 0 ? totalCents / 100 : (item.was_in_club ? 195 : 250);
    let paymentMethod = fees?.find((f: any) => f.payment_method || f.metodo_pago)?.payment_method ||
                        fees?.find((f: any) => f.payment_method || f.metodo_pago)?.metodo_pago ||
                        item.payment_method ||
                        'Por Confirmar';

    return {
      id: item.id,
      name: `${item.first_name || 'Desconocido'} ${item.last_name || ''}`,
      category: item.posicion_principal || 'Sin categoría',
      date: new Date(item.created_at).toLocaleDateString('es-ES'),
      status: item.registration_status || 'pending_revision',
      paymentMethod,
      feeTotal,
      raw_form_data: {},
      userId: item.user_auth_id
    };
  }));

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

  revalidatePath('/admin/secretaria');
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

  revalidatePath('/admin/secretaria');
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

  revalidatePath('/admin/secretaria');
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

  revalidatePath('/admin/secretaria');
  revalidatePath('/dashboard/inscripciones');
  return { success: true };
}


export async function resetPasswordAction(email: string) {
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.clubsportingsaladar.com';
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${siteUrl}/auth/callback?next=/actualizar-password`,
  });
  if (error) {
    console.error('[resetPasswordAction] Error:', error.message);
    return { success: false, error: error.message };
  }
  return { success: true };
}

async function getPlayerPdfFeeInfo(adminSupabase: any, player: any) {
  // Los jugadores senior no tienen cuotas de inscripción por diseño
  if (player.is_senior) {
    return {
      totalAmount: 0,
      baseTotal: 0,
      isRenewal: false,
      isReserved: false,
      reservationAmount: 0,
      remainingAmount: 0,
      method: player.payment_method || 'Sin cuota',
      status: 'no_aplica',
    };
  }

  let { data: fees } = await adminSupabase
    .from('fees')
    .select('amount_cents, amount_paid_cents, monto_total, estado, payment_method, metodo_pago, concept')
    .eq('player_id', player.id);

  const { count } = await adminSupabase
    .from('player_season_history')
    .select('id', { count: 'exact', head: true })
    .eq('player_id', player.id);

  const isRenewal = Boolean(player.was_in_club) || (count ? count > 1 : false);

  if (!fees || fees.length === 0) {
    try {
      const { createAdminFeeForPlayerAction } = await import('@/app/actions/treasury-actions');
      await createAdminFeeForPlayerAction(player.id, isRenewal);

      const { data: refreshedFees } = await adminSupabase
        .from('fees')
        .select('amount_cents, amount_paid_cents, monto_total, estado, payment_method, metodo_pago, concept')
        .eq('player_id', player.id);
      fees = refreshedFees || [];
    } catch (e) {
      console.error('Error al generar cuota automáticamente para el PDF:', e);
    }
  }

  const baseTotal = isRenewal ? 195 : 250;
  const isReserved = Boolean(player.paid_reservation) || (fees || []).some((f: any) => f.concept?.toLowerCase().includes('reserva'));
  const remainingAmount = isReserved ? Math.max(0, baseTotal - 50) : baseTotal;

  let totalCents = (fees || []).reduce((sum: number, f: any) => sum + (f.amount_cents || f.monto_total || 0), 0);
  let totalAmount = totalCents > 0 ? totalCents / 100 : baseTotal;

  let method = fees?.find((f: any) => f.payment_method || f.metodo_pago)?.payment_method ||
               fees?.find((f: any) => f.payment_method || f.metodo_pago)?.metodo_pago ||
               player.payment_method ||
               'Por Confirmar';

  let status = fees?.some((f: any) => f.estado === 'pagado') ? 'pagado' :
               fees?.some((f: any) => f.estado === 'pdte_verif') ? 'pdte_verif' :
               'pendiente';

  return { totalAmount, baseTotal, isRenewal, isReserved, reservationAmount: isReserved ? 50 : 0, remainingAmount, method, status };
}

export async function getInscriptionPdfAction(playerId: string) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) return { success: false, error: authError || 'No autenticado' };

  const adminSupabase = await createAdminClient();
  const access = await canUserAccessPlayer(adminSupabase, context, playerId);
  if (!access.allowed || !access.player) {
    return { success: false, error: access.reason || 'No autorizado' };
  }

  const { data: player, error: playerQueryError } = await adminSupabase
    .from('players')
    .select(`
      id, first_name, last_name, dni, birth_date, sip, is_senior, created_at,
      registration_status, posicion_principal, address, city,
      parent1_name, parent1_last_name, parent1_dni, parent1_phone, parent1_email,
      parent2_name, parent2_last_name, parent2_phone, parent2_email,
      iban, was_in_club, paid_reservation, payment_method, teams(id, name, category)
    `)
    .eq('id', playerId)
    .single();

  if (playerQueryError) console.error('[getInscriptionPdfAction] Query error:', playerQueryError.message);
  if (!player) return { success: false, error: 'Jugador no encontrado' };

  // Apparel sizes
  const { data: apparel } = await adminSupabase
    .from('player_apparel')
    .select('item_name, size')
    .eq('player_id', playerId);

  // Health data
  const { data: health } = await adminSupabase
    .from('player_health')
    .select('allergies, conditions, notes')
    .eq('player_id', playerId)
    .maybeSingle();

  // Fee data calculation & auto-creation
  const feeInfo = await getPlayerPdfFeeInfo(adminSupabase, player);

  const formattedBirthDate = player.birth_date
    ? new Date(player.birth_date).toLocaleDateString('es-ES')
    : null;

  const teamInfo = Array.isArray(player.teams) ? player.teams[0] : player.teams;
  const categoryStr = teamInfo?.name || teamInfo?.category || player.posicion_principal || 'Sin asignar';
  const fullAddress = [player.address, player.city].filter(Boolean).join(', ');

  const pdfData = {
    player: {
      id: player.id,
      firstName: player.first_name || '',
      lastName: player.last_name || '',
      dni: player.dni,
      birthDate: formattedBirthDate,
      category: categoryStr,
      phone: player.parent1_phone,
      email: player.parent1_email,
      sip: player.sip,
      address: fullAddress,
      registrationStatus: player.registration_status,
      createdAt: player.created_at,
    },
    tutor: {
      name: player.is_senior
        ? `${player.first_name} ${player.last_name}`.trim()
        : `${player.parent1_name || ''} ${player.parent1_last_name || ''}`.trim(),
      dni: player.is_senior ? player.dni : player.parent1_dni,
      phone: player.parent1_phone,
      email: player.parent1_email,
    },
    health: {
      allergies: health?.allergies,
      conditions: health?.conditions,
      notes: health?.notes,
    },
    apparel: (apparel || []).map(a => ({ itemName: a.item_name, size: a.size })),
    payment: {
      method: feeInfo.method,
      totalAmount: feeInfo.totalAmount,
      baseTotal: feeInfo.baseTotal,
      isRenewal: feeInfo.isRenewal,
      isReserved: feeInfo.isReserved,
      reservationAmount: feeInfo.reservationAmount,
      remainingAmount: feeInfo.remainingAmount,
      status: feeInfo.status,
      iban: player.iban,
    }
  };

  const { generateInscriptionPdfBuffer } = await import('@/lib/pdf/inscription-pdf-generator');
  const pdfBuffer = await generateInscriptionPdfBuffer(pdfData);
  const base64 = Buffer.from(pdfBuffer).toString('base64');
  const fileName = `Ficha_Inscripcion_${player.first_name}_${player.last_name}.pdf`.replace(/[^a-zA-Z0-9_.-]/g, '_');

  return { success: true, base64, fileName };
}

export async function getBatchInscriptionsPdfAction(playerIds?: string[]) {
  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError) return { success: false, error: authError || 'No autenticado' };

  if (!ADMIN_ROLES.includes(context.profile.role) && context.profile.role !== 'secretario') {
    return { success: false, error: 'No tienes permisos' };
  }

  const adminSupabase = await createAdminClient();
  let query = adminSupabase
    .from('players')
    .select(`
      id, first_name, last_name, dni, birth_date, sip, is_senior, created_at,
      registration_status, posicion_principal, address, city,
      parent1_name, parent1_last_name, parent1_dni, parent1_phone, parent1_email,
      parent2_name, parent2_last_name, parent2_phone, parent2_email,
      iban, was_in_club, paid_reservation, payment_method, teams(id, name, category)
    `)
    .eq('club_id', context.profile.club_id);

  if (playerIds && playerIds.length > 0) {
    query = query.in('id', playerIds);
  }

  const { data: players } = await query;
  if (!players || players.length === 0) {
    return { success: false, error: 'No se encontraron inscripciones para exportar' };
  }

  const pdfDataList = await Promise.all(players.map(async (player) => {
    const { data: apparel } = await adminSupabase
      .from('player_apparel')
      .select('item_name, size')
      .eq('player_id', player.id);

    const { data: health } = await adminSupabase
      .from('player_health')
      .select('allergies, conditions, notes')
      .eq('player_id', player.id)
      .maybeSingle();

    const feeInfo = await getPlayerPdfFeeInfo(adminSupabase, player);

    const formattedBirthDate = player.birth_date
      ? new Date(player.birth_date).toLocaleDateString('es-ES')
      : null;

    const teamInfo = Array.isArray(player.teams) ? player.teams[0] : player.teams;
    const categoryStr = teamInfo?.name || teamInfo?.category || player.posicion_principal || 'Sin asignar';
    const fullAddress = [player.address, player.city].filter(Boolean).join(', ');

    return {
      player: {
        id: player.id,
        firstName: player.first_name || '',
        lastName: player.last_name || '',
        dni: player.dni,
        birthDate: formattedBirthDate,
        category: categoryStr,
        phone: player.parent1_phone,
        email: player.parent1_email,
        sip: player.sip,
        address: fullAddress,
        registrationStatus: player.registration_status,
        createdAt: player.created_at,
      },
      tutor: {
        name: player.is_senior
          ? `${player.first_name} ${player.last_name}`.trim()
          : `${player.parent1_name || ''} ${player.parent1_last_name || ''}`.trim(),
        dni: player.is_senior ? player.dni : player.parent1_dni,
        phone: player.parent1_phone,
        email: player.parent1_email,
      },
      health: {
        allergies: health?.allergies,
        conditions: health?.conditions,
        notes: health?.notes,
      },
      apparel: (apparel || []).map(a => ({ itemName: a.item_name, size: a.size })),
      payment: {
        method: feeInfo.method,
        totalAmount: feeInfo.totalAmount,
        baseTotal: feeInfo.baseTotal,
        isRenewal: feeInfo.isRenewal,
        isReserved: feeInfo.isReserved,
        reservationAmount: feeInfo.reservationAmount,
        remainingAmount: feeInfo.remainingAmount,
        status: feeInfo.status,
        iban: player.iban,
      }
    };
  }));

  const { generateBatchInscriptionsPdfBuffer } = await import('@/lib/pdf/inscription-pdf-generator');
  const pdfBuffer = await generateBatchInscriptionsPdfBuffer(pdfDataList);
  const base64 = Buffer.from(pdfBuffer).toString('base64');
  const fileName = `Fichas_Inscripcion_Lote_Sporting_Saladar.pdf`;

  return { success: true, base64, fileName };
}
