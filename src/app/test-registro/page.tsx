import { Suspense } from "react";
import { PlayerRegistrationForm } from "@/components/forms/PlayerRegistrationForm";

export default function TestRegistroPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto mb-8 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900">
          Vista Previa del Formulario
        </h1>
        <p className="mt-2 text-gray-600">
          Esta es una página de prueba para revisar el componente de registro antes de integrarlo.
        </p>
      </div>
      
      <Suspense fallback={<div className="text-center py-10">Cargando formulario...</div>}>
        <PlayerRegistrationForm />
      </Suspense>
    </div>
  );
}
