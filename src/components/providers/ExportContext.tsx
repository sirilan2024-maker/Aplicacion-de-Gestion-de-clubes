"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import toast from "react-hot-toast";

interface ExportContextType {
  exportData: any[];
  setExportData: (data: any[], filename: string) => void;
  exportToCsv: () => void;
}

const ExportContext = createContext<ExportContextType>({
  exportData: [],
  setExportData: () => {},
  exportToCsv: () => {},
});

export function ExportProvider({ children }: { children: React.ReactNode }) {
  const [exportData, setExportDataState] = useState<any[]>([]);
  const [currentFilename, setCurrentFilename] = useState<string>("export");

  const setExportData = useCallback((data: any[], filename: string) => {
    setExportDataState(data);
    setCurrentFilename(filename);
  }, []);

  const exportToCsv = useCallback(() => {
    if (exportData.length === 0) {
      toast.error("No hay datos para exportar en esta vista");
      return;
    }

    try {
      // 1. Get headers
      const headers = Object.keys(exportData[0]);
      
      // 2. Map data to rows
      const rows = exportData.map(row => 
        headers.map(header => {
          let val = row[header];
          // Handle nulls and strings with commas/quotes
          if (val === null || val === undefined) val = "";
          val = String(val);
          if (val.includes(",") || val.includes("\"") || val.includes("\n")) {
            val = `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(",")
      );

      // 3. Join with newline
      const csvContent = [headers.join(","), ...rows].join("\n");

      // 4. Create Blob and trigger download (UTF-8 BOM for Excel compatibility)
      const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `${currentFilename}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Archivo exportado correctamente");
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      toast.error("Hubo un error al exportar");
    }
  }, [exportData, currentFilename]);

  return (
    <ExportContext.Provider value={{ exportData, setExportData, exportToCsv }}>
      {children}
    </ExportContext.Provider>
  );
}

export function useExport() {
  return useContext(ExportContext);
}
