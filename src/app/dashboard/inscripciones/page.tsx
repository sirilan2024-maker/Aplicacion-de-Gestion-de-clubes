import React, { Suspense } from "react";
import { SecretariaInscripciones } from "@/components/features/admin/SecretariaInscripciones";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Secretaría de Inscripciones | Sporting Saladar",
  description: "Panel de gestión de inscripciones del club.",
};

export default function InscripcionesPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        }
      >
        <SecretariaInscripciones />
      </Suspense>
    </div>
  );
}
