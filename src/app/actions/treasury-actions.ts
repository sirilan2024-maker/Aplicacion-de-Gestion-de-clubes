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
