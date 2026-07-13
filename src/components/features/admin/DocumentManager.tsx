"use client";

import React, { useEffect, useState } from "react";
import { Download, FileText, Loader2, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listPlayerDocumentsAction } from "@/app/actions/secretaria-actions";
import JSZip from "jszip";
import { saveAs } from "file-saver";

interface DocumentManagerProps {
  playerId: string;
  playerName: string;
}

interface PlayerDocument {
  name: string;
  url: string;
  size: number;
  created_at: string;
}

export function DocumentManager({ playerId, playerName }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<PlayerDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [playerId]);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listPlayerDocumentsAction(playerId);
      if (res.success && res.documents) {
        setDocuments(res.documents);
      } else {
        setError(res.error || "Error al cargar documentos");
      }
    } catch (e: any) {
      setError(e.message || "Error de red");
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(2) + " MB";
  };

  const handleDownloadZip = async () => {
    if (documents.length === 0) return;
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folderName = `Expediente_${playerName.replace(/\s+/g, '_')}`;
      const folder = zip.folder(folderName);

      if (!folder) throw new Error("No se pudo crear la carpeta ZIP");

      // Descargar cada archivo y añadirlo al zip
      const promises = documents.map(async (doc) => {
        const response = await fetch(doc.url);
        if (!response.ok) throw new Error(`Error al descargar ${doc.name}`);
        const blob = await response.blob();
        folder.file(doc.name, blob);
      });

      await Promise.all(promises);

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}.zip`);
    } catch (err: any) {
      console.error(err);
      alert("Hubo un error al generar el ZIP: " + err.message);
    } finally {
      setDownloadingZip(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Expediente Documental</h3>
          <p className="text-sm text-gray-500">{documents.length} archivos almacenados de forma segura.</p>
        </div>
        <Button 
          onClick={handleDownloadZip} 
          disabled={documents.length === 0 || downloadingZip}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm flex items-center gap-2"
        >
          {downloadingZip ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Empaquetando ZIP...</>
          ) : (
            <><Download className="w-4 h-4" /> Descargar Expediente Completo (ZIP)</>
          )}
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-gray-500 bg-gray-50">
          <FileText className="w-12 h-12 mb-3 text-gray-300" />
          <p className="font-medium">No hay documentos subidos</p>
          <p className="text-sm">El jugador todavía no ha subido ningún archivo a su expediente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {documents.map((doc, idx) => {
            const isImage = doc.name.match(/\.(jpeg|jpg|gif|png|webp)$/i);
            return (
              <div key={idx} className="border border-gray-200 bg-white rounded-lg p-4 flex flex-col gap-3 shadow-sm hover:shadow transition-shadow group">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-50 p-2 rounded-lg text-blue-600 shrink-0">
                    {isImage ? <ImageIcon className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-gray-900 truncate" title={doc.name}>{doc.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{formatSize(doc.size)} • {new Date(doc.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="mt-auto pt-2 flex gap-2">
                  <a 
                    href={doc.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold py-1.5 rounded transition-colors"
                  >
                    Ver archivo
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
