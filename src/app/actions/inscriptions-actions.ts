'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function getInscriptionsAction(frontendClubId?: string) {
  const supabase = await createAdminClient();
  
  let clubId = frontendClubId;
  if (!clubId) {
    const { data: clubData } = await supabase.from('clubs').select('id').limit(1).single();
    clubId = clubData?.id;
  }
  
  if (!clubId) return { success: false, data: [] };

  const { data, error } = await supabase
    .from('registrations')
    .select(`
      id,
      status,
      form_data,
      payment_method,
      payment_plan,
      payment_status,
      created_at
    `)
    .eq('club_id', clubId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching registrations:', error);
    return { success: false, data: [] };
  }

  // Transform data to match frontend interface
  const formattedData = data.map((item: any) => {
    const formData = item.form_data || {};
    // Calculate fee based on the same logic used in frontend (or store it in DB, but we didn't store feeTotal directly)
    let feeTotal = 250;
    if (formData.wasInClub) {
      feeTotal = 195;
      if (formData.paidReservation) feeTotal -= 50;
    }
    
    // Map status 'PENDING_VALIDATION' to our UI status 'pending_revision'
    let uiStatus = 'pending_revision';
    if (item.status === 'NEEDS_CORRECTION') uiStatus = 'request_correction';
    if (item.status === 'APPROVED' && item.payment_status === 'PENDING') uiStatus = 'pending_payment';
    if (item.status === 'APPROVED' && (item.payment_status === 'SUCCESS' || item.payment_status === 'SUCCESS_MOCK' || item.payment_status === 'DONE')) uiStatus = 'formalized';
    if (item.status === 'REJECTED') uiStatus = 'rejected';

    return {
      id: item.id,
      name: `${formData.playerFirstName || 'Desconocido'} ${formData.playerLastName || ''}`,
      category: formData.sportPosicionPrincipal || 'Sin categoría', // Usar posición temporalmente si no hay categoría
      date: new Date(item.created_at).toLocaleDateString('es-ES'),
      status: uiStatus,
      paymentMethod: item.payment_method,
      feeTotal,
      raw_form_data: formData
    };
  });

  return { success: true, data: formattedData };
}

export async function approveInscriptionAction(id: string) {
  const supabase = await createAdminClient();
  
  // 1. Marcar como APPROVED en la tabla registrations
  const { error: updateError } = await supabase
    .from('registrations')
    .update({ status: 'APPROVED', payment_status: 'SUCCESS_MOCK' }) // Simulamos pago directo por ahora para que pase a formalizado o pending_payment
    .eq('id', id);

  if (updateError) return { success: false, error: updateError.message };

  // 2. Aquí iría la lógica de crear el Player en la tabla `players` y avisar a Utillería.
  // Por ahora lo dejamos marcado como aprobado.

  revalidatePath('/dashboard/inscripciones');
  return { success: true };
}

export async function requestCorrectionAction(id: string, reason: string) {
  const supabase = await createAdminClient();
  
  const { error } = await supabase
    .from('registrations')
    .update({ 
      status: 'NEEDS_CORRECTION',
      correction_reason: reason
    })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  // Aquí iría el envío de email automático
  revalidatePath('/dashboard/inscripciones');
  return { success: true };
}

export async function rejectInscriptionAction(id: string) {
  const supabase = await createAdminClient();
  
  const { error } = await supabase
    .from('registrations')
    .update({ status: 'REJECTED' })
    .eq('id', id);

  if (error) return { success: false, error: error.message };

  revalidatePath('/dashboard/inscripciones');
  return { success: true };
}
