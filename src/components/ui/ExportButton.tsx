"use client";

import { Download } from "lucide-react";
import { useExport } from "@/components/providers/ExportContext";

export function ExportButton() {
  const { exportToCsv } = useExport();

  return (
    <button 
      onClick={exportToCsv}
      className="w-full sm:w-auto justify-center items-center flex gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-lg font-medium transition-colors shadow-sm text-sm"
    >
      <Download size={18} />
      Exportar
    </button>
  );
}
