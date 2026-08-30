"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Download, FileText, Loader2, AlertCircle, Image as ImageIcon,
  CheckCircle2, XCircle, Clock, Eye, RefreshCw, Shield, ShieldCheck, ShieldX,
  PackageOpen, CreditCard
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPlayerExpedienteAction,
  updateDocumentStatusAction,
  updatePlayerSepaAction
} from "@/app/actions/secretaria-actions";
import toast from "react-hot-toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";

function maskIban(iban: string | null): string {
  if (!iban) return '—';
  const clean = iban.replace(/\s+/g, '');
  if (clean.length < 8) return clean;
  return `${clean.slice(0, 4)} **** **** **** **${clean.slice(-4)}`;
}

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

/** Helper: download a single signed URL and trigger browser save */
async function downloadSingleFile(signedUrl: string, fileName: string) {
  const res = await fetch(signedUrl);
  if (!res.ok) throw new Error("No se pudo descargar el archivo");
  const blob = await res.blob();
  saveAs(blob, fileName);
}

/** Helper: infer extension from url or mime */
function getExtension(url: string, mimeType?: string): string {
  const mimeMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "application/pdf": ".pdf",
    "image/tiff": ".tiff",
  };
  if (mimeType && mimeMap[mimeType]) return mimeMap[mimeType];
  const parts = url.split(".");
  const ext = parts[parts.length - 1].split("?")[0];
  return ext && ext.length <= 5 ? `.${ext}` : "";
}

function DocumentCard({
  doc,
  playerName,
  onStatusChange,
}: {
  doc: PlayerDocument;
  playerName: string;
  onStatusChange: (id: string, status: DocStatus, reason?: string) => Promise<void>;
}) {
  const [updating, setUpdating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState<string>(doc.rejection_reason || "");

  const isImage = doc.document_type.startsWith("foto_");
  const docLabel = DOC_TYPE_LABELS[doc.document_type] || doc.document_type;

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

  const handleDownloadSingle = async () => {
    if (!doc.signedUrl) return;
    setDownloading(true);
    try {
      const res = await fetch(doc.signedUrl);
      if (!res.ok) throw new Error("Error al descargar");
      const mime = res.headers.get("content-type") || "";
      const ext = getExtension(doc.file_url || "", mime);
      const fileName = `${playerName} - ${docLabel}${ext}`;
      const blob = await res.blob();
      saveAs(blob, fileName);
      toast.success("Archivo descargado correctamente");
    } catch {
      toast.error("No se pudo descargar el archivo");
    } finally {
      setDownloading(false);
    }
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
              {docLabel}
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
                alt={docLabel}
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
                <Eye className="w-4 h-4" />
                Ver documento
              </a>
            </div>
          )}

          {/* Botones de abrir y descargar para imágenes */}
          {isImage && (
            <div className="absolute top-2 right-2 flex gap-1.5">
              <a
                href={doc.signedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white/90 text-gray-700 px-2 py-1 rounded-md text-xs font-semibold shadow hover:bg-white flex items-center gap-1 transition-colors"
              >
                <Eye className="w-3 h-3" />
                Ampliar
              </a>
              <button
                onClick={handleDownloadSingle}
                disabled={downloading}
                className="bg-blue-600/90 text-white px-2 py-1 rounded-md text-xs font-semibold shadow hover:bg-blue-700 flex items-center gap-1 transition-colors disabled:opacity-60"
              >
                {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                {downloading ? "..." : "Descargar"}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 flex items-center justify-center text-gray-400 text-sm italic bg-gray-50">
          URL expirada — recarga para generar un nuevo enlace seguro
        </div>
      )}

      {/* Download button for non-images */}
      {!isImage && doc.signedUrl && (
        <div className="px-3 pb-2 flex justify-end">
          <button
            onClick={handleDownloadSingle}
            disabled={downloading}
            className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-60"
          >
            {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            {downloading ? "Descargando..." : "Descargar archivo"}
          </button>
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
  const [playerDni, setPlayerDni] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // SEPA state
  const [sepaData, setSepaData] = useState<{ iban: string | null; sepa_mandate_id: string | null; sepa_mandate_date: string | null } | null>(null);
  const [payerInfo, setPayerInfo] = useState<{ type: string; name: string | null; dni: string | null } | null>(null);
  const [isEditingSepa, setIsEditingSepa] = useState(false);
  const [sepaForm, setSepaForm] = useState({ iban: '', sepaMandateId: '', sepaMandateDate: '' });
  const [savingSepa, setSavingSepa] = useState(false);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getPlayerExpedienteAction(playerId);
      if (res.success) {
        setDocuments(res.documents as PlayerDocument[]);
        setTutorDniUrl(res.tutorDniUrl || null);
        setSipNumber(res.sipNumber || null);
        setPlayerDni((res as any).playerDni || null);
        setSepaData((res as any).sepa || null);
        setPayerInfo((res as any).payer || null);
        setSepaForm({
          iban: (res as any).sepa?.iban || '',
          sepaMandateId: (res as any).sepa?.sepa_mandate_id || '',
          sepaMandateDate: (res as any).sepa?.sepa_mandate_date || '',
        });
      } else {
        setError(res.error || "Error al cargar documentos");
      }
    } catch (e: any) {
      setError(e.message || "Error de red");
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  const handleSaveSepa = async () => {
    setSavingSepa(true);
    try {
      const res = await updatePlayerSepaAction(playerId, {
        iban: sepaForm.iban,
        sepaMandateId: sepaForm.sepaMandateId,
        sepaMandateDate: sepaForm.sepaMandateDate,
      });
      if (res.success) {
        toast.success("Datos SEPA actualizados correctamente");
        setIsEditingSepa(false);
        fetchDocuments();
      } else {
        toast.error(res.error || "Error al actualizar datos SEPA");
      }
    } catch {
      toast.error("Error al guardar datos SEPA");
    } finally {
      setSavingSepa(false);
    }
  };

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

  /** Download ALL documents for this player as a ZIP */
  const handleDownloadAll = async () => {
    const docsWithUrl = documents.filter(d => d.signedUrl);
    if (docsWithUrl.length === 0) {
      toast.error("No hay documentos disponibles para descargar");
      return;
    }

    setDownloadingAll(true);
    const toastId = toast.loading(`Preparando expediente de ${playerName}...`);

    try {
      const zip = new JSZip();
      const playerFolder = zip.folder(playerName) as JSZip;

      const usedNames: Record<string, number> = {};

      for (const doc of docsWithUrl) {
        try {
          const res = await fetch(doc.signedUrl!);
          if (!res.ok) continue;
          const mime = res.headers.get("content-type") || "";
          const ext = getExtension(doc.file_url || "", mime);
          const label = DOC_TYPE_LABELS[doc.document_type] || doc.document_type;
          let fileName = `${label}${ext}`;

          // Avoid duplicate filenames in the same folder
          if (usedNames[fileName] !== undefined) {
            usedNames[fileName]++;
            fileName = `${label}_${usedNames[fileName]}${ext}`;
          } else {
            usedNames[fileName] = 0;
          }

          const buf = await res.arrayBuffer();
          playerFolder.file(fileName, buf);
        } catch {
          // Skip files that fail – don't break the whole ZIP
        }
      }

      const blob = await zip.generateAsync({
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });

      saveAs(blob, `Expediente_${playerName}.zip`);
      toast.success(`Expediente de ${playerName} descargado (${docsWithUrl.length} archivos)`, { id: toastId });
    } catch (e: any) {
      toast.error("Error al generar el ZIP: " + e.message, { id: toastId });
    } finally {
      setDownloadingAll(false);
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
  const availableForDownload = documents.filter(d => d.signedUrl).length;

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
        <div className="flex items-center gap-2 flex-wrap">
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

          {/* DOWNLOAD ALL BUTTON */}
          {availableForDownload > 0 && (
            <button
              onClick={handleDownloadAll}
              disabled={downloadingAll}
              title={`Descargar todos los documentos de ${playerName} como ZIP`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {downloadingAll ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <PackageOpen className="w-3.5 h-3.5" />
              )}
              {downloadingAll ? "Generando ZIP..." : `Descargar todo (${availableForDownload})`}
            </button>
          )}

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
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <h4 className="text-sm font-bold text-blue-900 flex items-center gap-2">
            <Shield className="w-4 h-4" /> DNI / NIE del Tutor
          </h4>
          <div className="flex gap-2">
            <a
              href={tutorDniUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-700 font-semibold hover:underline"
            >
              <Eye className="w-4 h-4" />
              Ver
            </a>
            <button
              onClick={async () => {
                try {
                  await downloadSingleFile(tutorDniUrl, `${playerName} - DNI Tutor`);
                  toast.success("DNI del tutor descargado");
                } catch {
                  toast.error("Error al descargar el DNI");
                }
              }}
              className="inline-flex items-center gap-1.5 text-xs bg-blue-700 text-white px-2.5 py-1 rounded-lg font-semibold hover:bg-blue-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Descargar
            </button>
          </div>
        </div>
      )}

      {/* DNI / NIE del Jugador */}
      {playerDni && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <p className="text-sm font-bold text-indigo-900">DNI / NIE del Jugador</p>
          </div>
          <span className="font-mono text-base font-bold text-indigo-800 tracking-widest bg-white border border-indigo-200 px-3 py-1 rounded-lg select-all">
            {playerDni}
          </span>
        </div>
      )}

      {/* Datos Bancarios y Mandato SEPA */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-bold text-slate-800">Datos Bancarios y Mandato SEPA</h4>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              {payerInfo?.type === 'senior' ? 'Pagador: Propio Jugador (Senior)' : `Pagador: Tutor (${payerInfo?.name || 'parent1_*'})`}
            </span>
          </div>
          {!isEditingSepa ? (
            <button
              onClick={() => setIsEditingSepa(true)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              Editar SEPA
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveSepa}
                disabled={savingSepa}
                className="text-xs font-semibold bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
              >
                {savingSepa ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                Guardar
              </button>
              <button
                onClick={() => {
                  setIsEditingSepa(false);
                  setSepaForm({
                    iban: sepaData?.iban || '',
                    sepaMandateId: sepaData?.sepa_mandate_id || '',
                    sepaMandateDate: sepaData?.sepa_mandate_date || ''
                  });
                }}
                disabled={savingSepa}
                className="text-xs text-slate-500 hover:text-slate-700"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>

        {!isEditingSepa ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div>
              <span className="text-slate-400 block font-medium">IBAN</span>
              <span className="font-mono font-bold text-slate-800 text-sm tracking-wider">{maskIban(sepaData?.iban || null)}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Referencia Mandato SEPA</span>
              <span className="font-mono font-bold text-slate-800 text-sm">{sepaData?.sepa_mandate_id || '—'}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Fecha Mandato SEPA</span>
              <span className="font-bold text-slate-800 text-sm">
                {sepaData?.sepa_mandate_date ? new Date(sepaData.sepa_mandate_date).toLocaleDateString('es-ES') : '—'}
              </span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-slate-600 font-semibold mb-1">IBAN</label>
              <input
                type="text"
                value={sepaForm.iban}
                onChange={e => setSepaForm({ ...sepaForm, iban: e.target.value })}
                placeholder="ES00 0000 0000 0000 0000 0000"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-xs focus:ring-1 focus:ring-blue-500 outline-none uppercase"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Referencia Mandato SEPA</label>
              <input
                type="text"
                value={sepaForm.sepaMandateId}
                onChange={e => setSepaForm({ ...sepaForm, sepaMandateId: e.target.value })}
                placeholder="ej: MANDATO-2026-..."
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-1">Fecha Mandato SEPA</label>
              <input
                type="date"
                value={sepaForm.sepaMandateDate}
                onChange={e => setSepaForm({ ...sepaForm, sepaMandateDate: e.target.value })}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Número SIP — oculto visualmente (solo interno) */}

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
              playerName={playerName}
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
