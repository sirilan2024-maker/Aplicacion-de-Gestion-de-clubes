import { RegistrationWizard } from "@/components/features/registration/RegistrationWizard";
import { Metadata } from "next";
import { Suspense } from "react";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Inscripción de Jugador | ClubManager",
  description: "Formulario de inscripción para nuevos jugadores",
};

export default async function PublicRegistrationPage() {
  const supabaseAdmin = await createAdminClient();
  
  // Buscar primero por el club oficial configurado (Sporting Saladar)
  const { data: club } = await supabaseAdmin
    .from('clubs')
    .select('id, name, sepa_iban')
    .eq('slug', 'club-sporting-saladar')
    .maybeSingle();

  let clubIban = club?.sepa_iban || null;

  // Fallback si no está por slug específico: buscar el primer club con IBAN configurado
  if (!clubIban) {
    const { data: fallbackClub } = await supabaseAdmin
      .from('clubs')
      .select('sepa_iban')
      .not('sepa_iban', 'is', null)
      .limit(1)
      .maybeSingle();
    clubIban = fallbackClub?.sepa_iban || null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Formulario de Inscripción Oficial
        </h1>
      </div>
      
      <Suspense fallback={<div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>}>
        <RegistrationWizard isInternalForm={false} clubIban={clubIban} />
      </Suspense>
    </div>
  );
}
