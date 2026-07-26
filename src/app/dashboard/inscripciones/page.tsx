import React from "react";
import { SecretariaInscripciones } from "@/components/features/admin/SecretariaInscripciones";

export const metadata = {
  title: "Secretaría de Inscripciones | Sporting Saladar",
  description: "Panel de gestión de inscripciones del club.",
};

export default function InscripcionesPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <SecretariaInscripciones />
    </div>
  );
}
