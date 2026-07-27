"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Download, FileText, Loader2, AlertCircle, Image as ImageIcon,
  CheckCircle2, XCircle, Clock, Eye, RefreshCw, Shield, ShieldCheck, ShieldX
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPlayerExpedienteAction,
  updateDocumentStatusAction
} from "@/app/actions/secretaria-actions";
import toast from "react-hot-toast";

interface DocumentManagerProps {
  playerId: string;
  playerName: string;
}

type DocStatus = 'pendiente' | 'recibido' | 'validado' | 'rechazado' | 'caducado';

interface PlayerDocument {
  id: string;
  document_type: string;
  file_url: string | null;
  signedUrl: string | null;
  status: DocStatus;
  rejection_reason: string | null;
  created_at: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  foto_carnet: "Foto Carnet",
  foto_medio_cuerpo: "Foto Medio Cuerpo",
  foto_cuerpo_entero: "Foto Cuerpo Entero",
  foto_horizontal: "Foto Horizontal",
  pasaporte: "DNI / NIE / Pasaporte",
  empadronamiento: "Empadronamiento",
  contrato_laboral: "Contrato Laboral",
  certificado_escolar: "Certificado Escolar",
  carta_explicativa: "Carta Explicativa",
};

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pendiente: {
    label: "Pendiente",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  recibido: {
    label: "Recibido",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: <Eye className="w-3.5 h-3.5" />,
  },
  validado: {
    label: "Validado",
    color: "bg-emerald-100 text-emerald-800 border-emerald-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  rechazado: {
    label: "Rechazado",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  caducado: {
    label: "Caducado",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

function StatusBadge({ status }: { status: DocStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pendiente;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

function DocumentCard({
  doc,
  onStatusChange,
}: {
  doc: PlayerDocument;
  onStatusChange: (id: string, status: DocStatus, reason?: string) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>(doc.rejection_reason || "");

  const isImage = doc.document_type.startsWith("foto_");

  const handleValidate = async () => {
    setUpdating(true);
    setShowRejectInput(false);
    await onStatusChange(doc.id, "validado");
    setUpdating(false);
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("Especifica el motivo del rechazo");
      return;
    }
    setUpdating(true);
    await onStatusChange(doc.id, "rechazado", rejectReason.trim());
    setUpdating(false);
    setShowRejectInput(false);
  };

  return (
    <div className={`border rounded-xl overflow-hidden shadow-sm transition-all ${
      doc.status === "validado" ? "border-emerald-200 bg-emerald-50/30" :
      doc.status === "rechazado" ? "border-red-200 bg-red-50/30" :
      "border-gray-200 bg-white"
    }`}>
      {/* Cabecera del documento */}
      <div className="flex items-center justify-between p-3 border-b border-inherit bg-white/60">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 shrink-0">
            {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {DOC_TYPE_LABELS[doc.document_type] || doc.document_type}
            </p>
            <p className="text-xs text-gray-400">{new Date(doc.created_at).toLocaleDateString('es-ES')}</p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      {/* Previsualización */}
      {doc.signedUrl ? (
        <div className="relative">
          {isImage ? (
            <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={doc.signedUrl}
                alt={DOC_TYPE_LABELS[doc.document_type]}
                className="object-contain w-full h-full"
              />
            </div>
          ) : (
            <div className="p-4 flex justify-center">
              <a
                href={doc.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 font-medium hover:underline"
              >
                <Download className="w-4 h-4" />
                Descargar / Ver documento
              </a>
            </div>
          )}

          {/* Botón de abrir en nueva pestaña para imágenes */}
          {isImage && (
            <a
              href={doc.signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-2 right-2 bg-white/90 text-gray-700 px-2 py-1 rounded-md text-xs font-semibold shadow hover:bg-white flex items-center gap-1 transition-colors"
            >
              <Eye className="w-3 h-3" />
              Ampliar
            </a>
          )}
        </div>
      ) : (
        <div className="p-4 flex items-center justify-center text-gray-400 text-sm italic bg-gray-50">
          URL expirada — recarga para generar un nuevo enlace seguro
        </div>
      )}

      {/* Motivo de rechazo si existe */}
      {doc.status === "rechazado" && doc.rejection_reason && (
        <div className="px-3 py-2 bg-red-50 border-t border-red-200">
          <p className="text-xs text-red-700">
            <span className="font-semibold">Motivo: </span>
            {doc.rejection_reason}
          </p>
        </div>
      )}

      {/* Acciones de validación */}
      <div className="p-3 border-t border-inherit bg-white/60 space-y-2">
        {showRejectInput ? (
          <div className="space-y-2">
            <input
              type="text"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo (obligatorio)..."
              className="w-full text-sm border border-red-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-300 bg-red-50"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={updating}
                className="flex-1 flex justify-center items-center gap-1 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                Confirmar rechazo
              </button>
              <button
                onClick={() => setShowRejectInput(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {doc.status !== "validado" && (
              <button
                onClick={handleValidate}
                disabled={updating}
                className="flex-1 flex justify-center items-center gap-1 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                Validar
              </button>
            )}
            {doc.status !== "rechazado" && (
              <button
                onClick={() => setShowRejectInput(true)}
                disabled={updating}
                className="flex-1 flex justify-center items-center gap-1 py-1.5 rounded-lg border border-red-200 text-red-600 bg-red-50 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors"
              >
                <ShieldX className="w-3 h-3" />
                Rechazar
              </button>
            )}
            {(doc.status === "validado" || doc.status === "rechazado") && (
              <button
                onClick={async () => {
                  setUpdating(true);
                  await onStatusChange(doc.id, "pendiente");
                  setUpdating(false);
                }}
                disabled={updating}
                className="flex-1 flex justify-center items-center gap-1 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Restablecer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function DocumentManager({ playerId, playerName }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<PlayerDocument[]>([]);
  const [tutorDniUrl, setTutorDniUrl] = useState<string | null>(null);
  const [sipNumber, setSipNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPlayerExpedienteAction(playerId);
      if (res.success) {
        setDocuments(res.documents as PlayerDocument[]);
        setTutorDniUrl(res.tutorDniUrl || null);
        setSipNumber(res.sipNumber || null);
      } else {
        setError(res.error || "Error al cargar documentos");
      }
    } catch (e: any) {
      setError(e.message || "Error de red");
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleStatusChange = async (
    docId: string,
    status: DocStatus,
    reason?: string
  ) => {
    const res = await updateDocumentStatusAction(docId, status, reason);
    if (res.success) {
      toast.success(`Documento marcado como "${STATUS_CONFIG[status].label}"`);
      // Actualizar el estado localmente sin recargar
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, status, rejection_reason: reason || null }
            : d
        )
      );
    } else {
      toast.error(`Error al actualizar: ${res.error}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-2 border border-red-200">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <div>
          <p className="font-semibold">Error al cargar el expediente</p>
          <p className="text-sm">{error}</p>
        </div>
        <button
          onClick={fetchDocuments}
          className="ml-auto text-xs underline hover:no-underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const validatedCount = documents.filter((d) => d.status === "validado").length;
  const pendingCount = documents.filter((d) => d.status === "pendiente" || d.status === "recibido").length;
  const rejectedCount = documents.filter((d) => d.status === "rechazado").length;

  return (
    <div className="space-y-6">
      {/* Cabecera con resumen */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Centro de Mando Documental
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            Expediente de <strong>{playerName}</strong> · {documents.length} documentos
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 text-xs font-medium">
            <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" /> {validatedCount} validados
            </span>
            <span className="flex items-center gap-1 text-amber-700 bg-amber-100 px-2 py-1 rounded-full border border-amber-200">
              <Clock className="w-3 h-3" /> {pendingCount} pendientes
            </span>
            {rejectedCount > 0 && (
              <span className="flex items-center gap-1 text-red-700 bg-red-100 px-2 py-1 rounded-full border border-red-200">
                <XCircle className="w-3 h-3" /> {rejectedCount} rechazados
              </span>
            )}
          </div>
          <button
            onClick={fetchDocuments}
            title="Recargar (las URLs expiran en 15 min)"
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* DNI del Tutor (viene de families.tutor_1_dni_url) */}
      {tutorDniUrl && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4" /> DNI / NIE del Tutor
          </h4>
          <a
            href={tutorDniUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-700 font-semibold hover:underline"
          >
            <Eye className="w-4 h-4" />
            Ver DNI del Tutor (enlace seguro, 15 min)
          </a>
        </div>
      )}

      {/* Número SIP */}
      {sipNumber && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-teal-900">
            Número SIP / Tarjeta Sanitaria: <span className="font-bold">{sipNumber}</span>
          </p>
        </div>
      )}

      {/* Grid de documentos */}
      {documents.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-12 flex flex-col items-center justify-center text-gray-500 bg-gray-50">
          <FileText className="w-12 h-12 mb-3 text-gray-300" />
          <p className="font-medium text-gray-700">No hay documentos subidos</p>
          <p className="text-sm mt-1">El jugador todavía no ha adjuntado ningún archivo a su expediente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        🔒 Todos los archivos están almacenados de forma segura en un bucket privado RGPD. Los enlaces expiran en 15 minutos.
      </p>
    </div>
  );
}
