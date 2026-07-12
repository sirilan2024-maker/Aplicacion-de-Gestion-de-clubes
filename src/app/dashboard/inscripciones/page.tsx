import React from "react";
import { InscriptionsAdminPanel } from "@/components/features/admin/InscriptionsAdminPanel";

export const metadata = {
  title: "Secretaría de Inscripciones | Sporting Saladar",
  description: "Panel de gestión de inscripciones del club.",
};

export default function InscripcionesPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 py-8">
      <InscriptionsAdminPanel />
    </div>
  );
}
