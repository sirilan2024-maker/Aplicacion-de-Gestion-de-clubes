"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function getFamilyFeesAction(familyId: string) {
  const adminSupabase = await createAdminClient();
  const { data, error } = await adminSupabase
    .from("fees")
    .select("id, concept, amount_cents, currency, estado, fecha_pago, tipo_cargo")
    .eq("family_id", familyId)
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error fetching family fees via admin:", error);
    throw new Error(error.message);
  }
  
  return data;
}

export async function getClubFeesAction() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) throw new Error("Club no encontrado");

  const { data, error } = await adminSupabase
    .from("fees")
    .select("id, concept, amount_cents, currency, estado, fecha_pago, tipo_cargo")
    .eq("club_id", profile.club_id)
    .order("creado_en", { ascending: false });

  if (error) {
    console.error("Error fetching club fees via admin:", error);
    throw new Error(error.message);
  }
  
  return data;
}

export async function getClubFamiliesAction() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) throw new Error("Club no encontrado");

  const { data, error } = await adminSupabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("club_id", profile.club_id)
    .eq("role", "tutor");

  if (error) {
    console.error("Error fetching families:", error);
    throw new Error(error.message);
  }

  return data;
}

export async function createFeeAction(feeData: any) {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) throw new Error("Club no encontrado");

  const { data, error } = await adminSupabase.from("fees").insert({
    ...feeData,
    club_id: profile.club_id
  });

  if (error) throw new Error(error.message);
  return data;
}

export async function getRegistrationPaymentsAction() {
  const supabase = await createClient();
  const adminSupabase = await createAdminClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await adminSupabase.from("profiles").select("club_id").eq("id", user.id).single();
  if (!profile?.club_id) throw new Error("Club no encontrado");

  // Fetch registrations from this club that are not rejected
  const { data, error } = await adminSupabase
    .from("registrations")
    .select("id, form_data, payment_method, payment_plan, payment_status, status, created_at, stripe_payment_intent_id")
    .eq("club_id", profile.club_id)
    .neq("status", "REJECTED")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching registration payments:", error);
    throw new Error(error.message);
  }

  // Format them for the treasury UI
  return data.map(reg => {
    const formData = reg.form_data || {};
    let feeTotal = 250;
    if (formData.wasInClub) {
      feeTotal = 195;
      if (formData.paidReservation) feeTotal -= 50;
    }
    
    return {
      id: reg.id,
      concept: `Inscripción: ${formData.playerFirstName || ''} ${formData.playerLastName || ''}`,
      amount_cents: feeTotal * 100,
      currency: 'eur',
      estado: reg.payment_status?.toLowerCase() === 'success' || reg.payment_status?.toLowerCase() === 'success_mock' || reg.payment_status?.toLowerCase() === 'done' ? 'pagado' : 'pendiente',
      fecha_pago: reg.created_at,
      tipo_cargo: reg.payment_plan === 'Fraccionado' ? 'subscription' : 'one_time',
      payment_method: reg.payment_method,
      registration_status: reg.status
    };
  });
}

