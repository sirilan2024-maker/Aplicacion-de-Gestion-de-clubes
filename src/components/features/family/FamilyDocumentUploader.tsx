"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  FileText, UploadCloud, CheckCircle2, XCircle, Clock, AlertTriangle, 
  Eye, RefreshCw, Plus, Trash2, Camera, Download, ShieldCheck, Info, Loader2,
  ExternalLink, FileUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  getPlayerExpedienteAction, 
  uploadPlayerDocumentAction, 
  deletePlayerDocumentAction 
} from "@/app/actions/secretaria-actions";
import imageCompression from "browser-image-compression";
import toast from "react-hot-toast";

export interface FamilyDocumentUploaderProps {
  playerId: string;
  playerName?: string;
  isSenior?: boolean;
}

type DocStatus = 'pendiente' | 'recibido' | 'validado' | 'rechazado' | 'caducado';

interface DocumentItem {
  id: string;
  document_type: string;
  file_url: string | null;
  signedUrl: string | null;
  status: DocStatus;
  rejection_reason: string | null;
  created_at: string;
}

const STANDARD_DOC_TYPES = [
  { key: "DNI/NIE del Jugador (Anverso)", label: "DNI/NIE del Jugador (Anverso)", required: true, senior: true },
  { key: "DNI/NIE del Jugador (Reverso)", label: "DNI/NIE del Jugador (Reverso)", required: true, senior: true },
  { key: "Foto Carnet", label: "Foto Carnet (Fondo blanco)", required: true, senior: true },
  { key: "DNI/NIE del Tutor (Anverso)", label: "DNI/NIE del Tutor (Anverso)", required: true, senior: false },
  { key: "DNI/NIE del Tutor (Reverso)", label: "DNI/NIE del Tutor (Reverso)", required: true, senior: false },
  { key: "Libro de Familia", label: "Libro de Familia", required: false, senior: false },
  { key: "Certificado de Empadronamiento", label: "Empadronamiento Histórico", required: false, senior: true },
  { key: "Certificado Escolar", label: "Certificado Escolar / Matrícula", required: false, senior: false },
  { key: "Contrato Laboral de los Padres", label: "Contrato Laboral / Permiso de Residencia", required: false, senior: false },
  { key: "Impreso Oficial CTI Menores RFEF", label: "Impreso CTI / FIFA Art. 19", required: false, senior: false },
  { key: "Carta Explicativa Firmada", label: "Carta Explicativa / Declaración Jurada", required: false, senior: false },
  { key: "Otro Documento", label: "Otro Documento Oficial", required: false, senior: true }
];

export function FamilyDocumentUploader({ playerId, playerName, isSenior = false }: FamilyDocumentUploaderProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customDocType, setCustomDocType] = useState("");
  const [customDocName, setCustomDocName] = useState("");

  const loadExpediente = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getPlayerExpedienteAction(playerId);
      if (res.success && res.documents) {
        setDocuments(res.documents as DocumentItem[]);
      } else {
        toast.error(res.error || "No se pudo cargar el expediente");
      }
    } catch (err: any) {
      console.error("Error loading expediente:", err);
      toast.error("Error al cargar la documentación");
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    loadExpediente();
  }, [loadExpediente]);

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>, docType: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDocType(docType);
      let base64ToSend = "";

      if (file.type.startsWith("image/")) {
        // Comprimir imagen a menos de 200KB
        const options = {
          maxSizeMB: 0.2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        base64ToSend = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(compressedFile);
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
      } else {
        // PDF u otros
        base64ToSend = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
        });
      }

      const res = await uploadPlayerDocumentAction({
        playerId,
        documentType: docType,
        fileBase64: base64ToSend,
        fileName: file.name,
      });

      if (res.success) {
        toast.success(`Documento "${docType}" subido correctamente`);
        setShowAddCustomModal(false);
        setCustomDocName("");
        await loadExpediente();
      } else {
        toast.error(res.error || "Error al subir el archivo");
      }
    } catch (err: any) {
      console.error("Error en subida:", err);
      toast.error("Error al procesar el archivo");
    } finally {
      setUploadingDocType(null);
      // Limpiar input file
      e.target.value = "";
    }
  };

  const handleDelete = async (docId: string, docLabel: string) => {
    if (!confirm(`¿Estás seguro de eliminar el documento "${docLabel}"?`)) return;
    try {
      setLoading(true);
      const res = await deletePlayerDocumentAction(docId);
      if (res.success) {
        toast.success("Documento eliminado");
        await loadExpediente();
      } else {
        toast.error(res.error || "Error al eliminar");
      }
    } catch (err: any) {
      toast.error("Error al eliminar documento");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar tipos de documentos según si es senior o menor
  const applicableStandardTypes = STANDARD_DOC_TYPES.filter(t => isSenior ? t.senior : true);

  // Documentos con incidencias o rechazados
  const rejectedDocs = documents.filter(d => d.status === 'rechazado');

  // Helper para normalizar coincidencias de nombres
  const findUploadedDoc = (typeKey: string) => {
    const cleanKey = typeKey.toLowerCase().replace(/[^a-z0-9]/g, "");
    return documents.find(d => {
      const cleanDocType = d.document_type.toLowerCase().replace(/[^a-z0-9]/g, "");
      return cleanDocType === cleanKey || cleanDocType.includes(cleanKey) || cleanKey.includes(cleanDocType);
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. ALERTA DE SUBSANACIÓN (DOCUMENTOS RECHAZADOS POR SECRETARÍA) */}
      {rejectedDocs.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-red-100 rounded-xl text-red-700 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2 flex-1">
              <h4 className="font-bold text-red-950 text-base">
                Documentación pendiente de subsanar ({rejectedDocs.length})
              </h4>
              <p className="text-xs text-red-800 leading-relaxed">
                Secretaría del club ha revisado el expediente y ha indicado incidencias en los siguientes documentos. Por favor, sube una nueva copia correcta para tramitar la ficha federativa:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                {rejectedDocs.map((doc) => (
                  <div key={doc.id} className="bg-white p-3.5 rounded-xl border border-red-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-gray-900 text-sm">{doc.document_type}</span>
                        <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Rechazado
                        </span>
                      </div>
                      {doc.rejection_reason ? (
                        <p className="text-xs text-red-700 mt-1 font-medium bg-red-50/80 p-2 rounded border border-red-100">
                          <strong>Motivo:</strong> {doc.rejection_reason}
                        </p>
                      ) : (
                        <p className="text-xs text-red-600 mt-1">El documento no cumple con los requisitos del club o federación.</p>
                      )}
                    </div>

                    <div className="mt-3 flex gap-2">
                      <label className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-2 px-3 rounded-lg text-center cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1.5">
                        {uploadingDocType === doc.document_type ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <UploadCloud className="w-3.5 h-3.5" />
                        )}
                        Subsanar Archivo
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*,.pdf" 
                          onChange={(e) => handleUploadFile(e, doc.document_type)}
                          disabled={uploadingDocType === doc.document_type}
                        />
                      </label>
                      <label className="bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold py-2 px-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-center" title="Hacer foto con la cámara">
                        <Camera className="w-3.5 h-3.5" />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*" 
                          capture="environment" 
                          onChange={(e) => handleUploadFile(e, doc.document_type)}
                          disabled={uploadingDocType === doc.document_type}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CABECERA Y ACCIÓN PARA SUBIR CUALQUIER DOCUMENTO EXTRA */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Expediente Digital de Documentos
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Consulta los archivos entregados, el estado de validación de Secretaría y aporta cualquier documento que falte.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={loadExpediente} 
            variant="outline" 
            size="sm" 
            className="text-gray-700 hover:text-blue-600"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>

          <Button 
            onClick={() => setShowAddCustomModal(true)} 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Añadir Documento
          </Button>
        </div>
      </div>

      {/* 3. MODAL / SELECTOR PARA SUBIR UN DOCUMENTO ADICIONAL */}
      {showAddCustomModal && (
        <div className="bg-blue-50/70 border border-blue-200 p-5 rounded-2xl shadow-sm space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center border-b border-blue-100 pb-2">
            <h4 className="font-bold text-blue-950 text-sm flex items-center gap-2">
              <FileUp className="w-4 h-4 text-blue-600" /> Subir Documento al Expediente
            </h4>
            <button 
              onClick={() => setShowAddCustomModal(false)}
              className="text-gray-400 hover:text-gray-700 text-xs font-bold"
            >
              ✕ Cerrar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-gray-700 block mb-1">Tipo de Documento:</label>
              <select 
                value={customDocType} 
                onChange={(e) => setCustomDocType(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Selecciona el tipo de documento --</option>
                {STANDARD_DOC_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>

            {customDocType === "Otro Documento" && (
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Nombre / Descripción del Documento:</label>
                <Input 
                  placeholder="Ej: Certificado Médico, Autorización Especial..." 
                  value={customDocName} 
                  onChange={(e) => setCustomDocName(e.target.value)}
                  className="bg-white text-xs"
                />
              </div>
            )}
          </div>

          {customDocType && (
            <div className="flex gap-2 pt-2">
              <label className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2.5 px-4 rounded-xl text-center cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-2">
                {uploadingDocType ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                Seleccionar y Subir Archivo (PDF / Imagen)
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*,.pdf" 
                  onChange={(e) => handleUploadFile(e, customDocType === "Otro Documento" && customDocName ? customDocName : customDocType)}
                  disabled={!!uploadingDocType}
                />
              </label>
              <label className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-semibold py-2.5 px-3 rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1" title="Hacer foto con la cámara">
                <Camera className="w-4 h-4" />
                <input 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={(e) => handleUploadFile(e, customDocType === "Otro Documento" && customDocName ? customDocName : customDocType)}
                  disabled={!!uploadingDocType}
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* 4. GRID DE DOCUMENTOS ESTÁNDAR Y ENTREGADOS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {applicableStandardTypes.map((item) => {
          const uploadedDoc = findUploadedDoc(item.key);
          const isUploaded = !!uploadedDoc?.file_url;
          const status = uploadedDoc?.status || 'pendiente';

          return (
            <div 
              key={item.key} 
              className={`border-2 rounded-2xl p-4 flex flex-col justify-between transition-all bg-white shadow-xs ${
                status === 'validado' 
                  ? 'border-emerald-400 bg-emerald-50/20' 
                  : status === 'recibido'
                  ? 'border-blue-400 bg-blue-50/20'
                  : status === 'rechazado'
                  ? 'border-red-400 bg-red-50/30'
                  : 'border-dashed border-gray-300 hover:border-blue-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <FileText className={`w-4 h-4 ${
                      status === 'validado' ? 'text-emerald-600' :
                      status === 'recibido' ? 'text-blue-600' :
                      status === 'rechazado' ? 'text-red-600' : 'text-gray-400'
                    }`} />
                    <span className="font-bold text-gray-900 text-sm leading-tight">{item.label}</span>
                  </div>

                  {/* Insignia de Estado */}
                  {status === 'validado' && (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Validado
                    </span>
                  )}
                  {status === 'recibido' && (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-blue-600" /> En revisión
                    </span>
                  )}
                  {status === 'rechazado' && (
                    <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <XCircle className="w-3 h-3 text-red-600" /> Rechazado
                    </span>
                  )}
                  {status === 'pendiente' && (
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Pendiente
                    </span>
                  )}
                </div>

                {status === 'rechazado' && uploadedDoc?.rejection_reason && (
                  <p className="text-xs text-red-700 bg-red-50 p-2 rounded-lg border border-red-100 mb-2 font-medium">
                    ⚠️ {uploadedDoc.rejection_reason}
                  </p>
                )}

                {isUploaded && uploadedDoc?.created_at && (
                  <p className="text-[11px] text-gray-400 mb-3">
                    Subido: {new Date(uploadedDoc.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Acciones del Documento */}
              <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                {isUploaded && uploadedDoc?.signedUrl ? (
                  <>
                    <a 
                      href={uploadedDoc.signedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 text-xs font-semibold py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" /> Ver
                    </a>

                    <label className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold py-1.5 px-2.5 rounded-lg text-center cursor-pointer transition-colors flex items-center justify-center gap-1">
                      {uploadingDocType === item.key ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                      Cambiar
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,.pdf" 
                        onChange={(e) => handleUploadFile(e, item.key)}
                        disabled={uploadingDocType === item.key}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => handleDelete(uploadedDoc.id, item.label)}
                      className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      title="Eliminar documento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <div className="flex gap-2 w-full">
                    <label className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 px-3 rounded-lg text-center cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1.5">
                      {uploadingDocType === item.key ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                      Subir archivo
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*,.pdf" 
                        onChange={(e) => handleUploadFile(e, item.key)}
                        disabled={uploadingDocType === item.key}
                      />
                    </label>
                    <label className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold py-2 px-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-center" title="Hacer foto">
                      <Camera className="w-3.5 h-3.5" />
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        capture="environment" 
                        onChange={(e) => handleUploadFile(e, item.key)}
                        disabled={uploadingDocType === item.key}
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. OTROS DOCUMENTOS ADICIONALES SUBIDOS FUERA DEL CATÁLOGO ESTÁNDAR */}
      {(() => {
        const extraDocs = documents.filter(d => !STANDARD_DOC_TYPES.some(s => {
          const cleanS = s.key.toLowerCase().replace(/[^a-z0-9]/g, "");
          const cleanD = d.document_type.toLowerCase().replace(/[^a-z0-9]/g, "");
          return cleanS === cleanD || cleanD.includes(cleanS) || cleanS.includes(cleanD);
        }));

        if (extraDocs.length === 0) return null;

        return (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <Info className="w-4 h-4 text-gray-500" />
              Otros Documentos Adicionales en el Expediente ({extraDocs.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {extraDocs.map((doc) => (
                <div key={doc.id} className="bg-gray-50 p-3.5 rounded-xl border border-gray-200 flex items-center justify-between gap-2 shadow-xs">
                  <div className="overflow-hidden">
                    <p className="font-bold text-gray-900 text-xs truncate">{doc.document_type}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {doc.signedUrl && (
                      <a 
                        href={doc.signedUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-100 text-xs px-2.5 py-1 rounded-md font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3 text-blue-600" /> Ver
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(doc.id, doc.document_type)}
                      className="text-gray-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
