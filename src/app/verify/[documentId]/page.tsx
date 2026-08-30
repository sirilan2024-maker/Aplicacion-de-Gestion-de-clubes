"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Clock,
  Users,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Lock,
  Search
} from "lucide-react";
import { getPublicDocumentVerificationAction } from "@/app/actions/methodology-actions";
import { PublicDocumentVerificationView } from "@/lib/methodology/export/documentAuditStore";

export default function PublicDocumentVerificationPage() {
  const params = useParams();
  const documentId = typeof params?.documentId === "string" ? params.documentId : "";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PublicDocumentVerificationView | null>(null);

  useEffect(() => {
    async function loadVerification() {
      if (!documentId) {
        setLoading(false);
        return;
      }

      try {
        const res = await getPublicDocumentVerificationAction(documentId);
        if (res.success && res.verification) {
          setData(res.verification);
        } else {
          setData({ found: false, integrityStatus: "NOT_FOUND", error: "Documento no disponible" });
        }
      } catch (err: any) {
        setData({ found: false, integrityStatus: "NOT_FOUND", error: err?.message || "Error al verificar documento" });
      } finally {
        setLoading(false);
      }
    }

    loadVerification();
  }, [documentId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <h2 className="text-lg font-black tracking-tight">Verificando Integridad Documental...</h2>
        <p className="text-xs text-slate-400 font-mono mt-1">{documentId}</p>
      </div>
    );
  }

  const isFound = data?.found && data?.integrityStatus === "VERIFIED_AUTHENTIC";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8 md:p-12">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Institucional */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Lock className="w-3.5 h-3.5" />
              <span>Portal Público de Auditoría y Verificación</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Sporting Saladar Metodología
            </h1>
          </div>
          <div className="text-right sm:text-right">
            <span className="text-[10px] font-mono text-slate-400 block">Identificador Documental:</span>
            <code className="text-xs font-mono font-bold text-indigo-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 inline-block">
              {documentId || "NO ESPECIFICADO"}
            </code>
          </div>
        </div>

        {/* Estado de Verificación */}
        {isFound ? (
          <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                  Documento Auténtico y Verificado
                </span>
                <h2 className="text-xl font-black text-white">
                  {data?.sessionTitle}
                </h2>
                <p className="text-xs text-slate-300 font-medium pt-1">
                  Este documento ha sido generado por el motor de planificación metodológica de Sporting Saladar y su integridad criptográfica está 100% confirmada.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-rose-950/40 border border-rose-500/40 rounded-3xl p-6 shadow-2xl backdrop-blur-md">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <span className="text-xs font-black text-rose-400 uppercase tracking-wider">
                  Documento No Autenticado
                </span>
                <h2 className="text-xl font-black text-white">
                  No se pudo verificar el documento
                </h2>
                <p className="text-xs text-slate-300 font-medium pt-1">
                  {data?.error || "El identificador proporcionado no coincide con ningún registro emitido en la plataforma oficial o el formato es incorrecto."}
                </p>
              </div>
            </div>
          </div>
        )}

        {isFound && data && (
          <>
            {/* Metadatos Generales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Categoría</span>
                <span className="text-sm font-black text-white uppercase">{data.ageCategory}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Duración Total</span>
                <span className="text-sm font-black text-indigo-400">{data.totalDurationMinutes} minutos</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Total Tareas</span>
                <span className="text-sm font-black text-white">{data.exercisesCount} ejercicios</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Fecha Emisión</span>
                <span className="text-xs font-mono text-slate-300">{data.generatedAt?.slice(0, 10)}</span>
              </div>
            </div>

            {/* Hash Criptográfico */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                <span>Firma SHA256 del Contenido</span>
                <span>Motor {data.verifierVersion}</span>
              </div>
              <code className="text-xs font-mono text-indigo-300 break-all block">
                {data.generatedContentHash}
              </code>
            </div>

            {/* Desglose de Ejercicios y Evidencias */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Estructura y Auditoría de Tareas
                </h3>
                <div className="flex items-center gap-2 text-[10px] font-bold">
                  <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800">
                    {data.verifiedExternalCount} Verificados
                  </span>
                  <span className="text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-800">
                    {data.partiallyVerifiedExternalCount} Parciales
                  </span>
                  <span className="text-slate-400 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
                    {data.officialCatalogCount} Oficiales
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {data.exercises?.map((drill, index) => (
                  <div
                    key={index}
                    className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-colors p-4 rounded-2xl space-y-2"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-500">#{index + 1}</span>
                        <span className="text-xs font-bold text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-900">
                          {drill.phase}
                        </span>
                        <h4 className="text-sm font-black text-white">{drill.title}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">⏱️ {drill.durationMin} min</span>
                        {drill.verificationStatus === "VERIFIED" ? (
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-600/50">
                            ✓ VERIFIED
                          </span>
                        ) : drill.isExternal ? (
                          <span className="text-[10px] font-black text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded-md border border-indigo-600/50">
                            ℹ️ {drill.verificationStatus}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700">
                            🏛️ CATÁLOGO OFICIAL
                          </span>
                        )}
                      </div>
                    </div>

                    {drill.isExternal && (
                      <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 text-xs space-y-1.5 mt-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                          <span>Fuente: <strong className="text-slate-200">{drill.source}</strong> ({drill.sourceDomain})</span>
                          <span>Tipo: <strong className="text-indigo-300 font-mono">{drill.evidenceType}</strong></span>
                        </div>

                        {drill.evidenceQuote && (
                          <p className="text-[11px] text-slate-300 italic bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                            "{drill.evidenceQuote}"
                          </p>
                        )}

                        {drill.evidenceUrl && (
                          <div className="pt-1">
                            <a
                              href={drill.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline truncate"
                            >
                              <ExternalLink className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{drill.evidenceUrl}</span>
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Aviso de Limitaciones */}
            {data.hasLimitations && data.limitationNotice && (
              <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 flex items-start gap-3 text-amber-200 text-xs">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-amber-300 uppercase tracking-wider block">
                    Transparencia y Limitaciones Documentales
                  </span>
                  <p className="leading-relaxed text-amber-100/90 font-medium">
                    {data.limitationNotice}
                  </p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="pt-6 border-t border-slate-900 text-center text-xs text-slate-400 space-y-2">
          <p>
            Plataforma Integral de Metodología de Fútbol — Sporting Saladar.
          </p>
          <p className="text-[10px] text-slate-400 font-mono">
            Garantía de inmutabilidad del catálogo y trazabilidad documental externa verificada.
          </p>
        </div>

      </div>
    </div>
  );
}
