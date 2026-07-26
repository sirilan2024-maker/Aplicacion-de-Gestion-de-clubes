import { RegistrationWizard } from "@/components/features/registration/RegistrationWizard";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Inscripción de Senior | ClubManager",
  description: "Formulario de inscripción para jugadores del equipo Senior",
};

export default function SeniorRegistrationPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Formulario de Inscripción Oficial (Equipo Senior)
        </h1>
        <p className="mt-2 text-gray-600">Exclusivo para jugadores del equipo Senior</p>
      </div>
      
      <Suspense fallback={<div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>}>
        <RegistrationWizard isInternalForm={false} formType="senior" />
      </Suspense>
    </div>
  );
}
