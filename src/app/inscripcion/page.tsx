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
      <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 text-center sm:text-left">
        <img 
          src="/images/sporting-saladar-shield.jpg" 
          alt="Escudo Club Sporting Saladar" 
          className="w-20 h-auto sm:w-24 object-contain drop-shadow-md shrink-0"
        />
        <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
            Formulario de Inscripción Oficial
          </h1>
          <span className="text-lg sm:text-xl font-bold text-blue-900 mt-1">
            Club Sporting Saladar
          </span>
        </div>
      </div>
      
      <Suspense fallback={<div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>}>
        <RegistrationWizard isInternalForm={false} clubIban={clubIban} />
      </Suspense>
    </div>
  );
}
