"use client"

import React, { useState, useEffect, useRef } from "react"
import { FileText, RefreshCw, AlertCircle, ExternalLink, Edit3, UploadCloud } from "lucide-react"
import { ActaConciliationModal } from "../ActaConciliationModal"

interface MatchActaTabProps {
  matchId: string;
  match: any;
  players?: any[];
  convocatorias?: any[];
  isReadOnly?: boolean;
}

export function MatchActaTab({ matchId, match, players = [], convocatorias = [], isReadOnly = false }: MatchActaTabProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showConciliation, setShowConciliation] = useState(false)
  const [uploadingDirect, setUploadingDirect] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchSignedUrl = async () => {
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await fetch(`/api/partidos/get-acta-url?partidoId=${matchId}`)
      const data = await res.json()
      if (data.signedUrl) {
        setSignedUrl(data.signedUrl)
      } else {
        setErrorMsg("Este partido aún no dispone de un acta oficial de la federación subida.")
      }
    } catch (err: any) {
      setErrorMsg("Error al obtener la URL del acta oficial.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (matchId) {
      fetchSignedUrl()
    }
  }, [matchId])

  const handleDirectUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") {
      alert("Por favor selecciona un archivo PDF válido.")
      return
    }

    setUploadingDirect(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("partidoId", matchId)

      const res = await fetch("/api/partidos/asignar-acta", {
        method: "POST",
        body: formData
      })

      const data = await res.json()
      if (res.ok && data.success) {
        alert("🟢 Acta subida y vinculada correctamente a este partido.")
        fetchSignedUrl()
      } else {
        alert("Error al subir el acta: " + (data.error || "Error desconocido"))
      }
    } catch (err: any) {
      console.error(err)
      alert("Ocurrió un error al subir el acta oficial.")
    } finally {
      setUploadingDirect(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleDirectUpload}
      />

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-2xl shadow-sm border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white">Acta Oficial del Partido</h3>
            <p className="text-xs text-slate-400">Documento PDF oficial cargado desde la federación</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              Abrir PDF <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {!isReadOnly && !signedUrl && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDirect}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              {uploadingDirect ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <UploadCloud className="w-3.5 h-3.5" />
              )}
              {uploadingDirect ? "Subiendo..." : "Añadir Acta"}
            </button>
          )}

          {!isReadOnly && (
            <button
              onClick={() => setShowConciliation(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all border border-slate-700"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              Conciliar Estadísticas
            </button>
          )}

          <button
            onClick={fetchSignedUrl}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            title="Refrescar acta"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* PDF Container */}
      <div className="bg-slate-950 rounded-2xl overflow-hidden min-h-[550px] border border-slate-800 flex items-center justify-center relative">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs font-medium">Generando URL firmada del acta...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl">
            <AlertCircle className="w-10 h-10 text-amber-500" />
            <h4 className="font-bold text-slate-200 text-sm">Sin Acta Oficial Disponible</h4>
            <p className="text-xs text-slate-400 leading-relaxed">{errorMsg}</p>
            
            {!isReadOnly && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingDirect}
                className="mt-3 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all"
              >
                {uploadingDirect ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> Subiendo y Vinculando...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" /> Añadir / Subir Acta Oficial Ahora
                  </>
                )}
              </button>
            )}

            <button
              onClick={fetchSignedUrl}
              className="mt-1 text-[11px] text-slate-500 hover:text-slate-300 font-semibold underline"
            >
              Reintentar Carga
            </button>
          </div>
        ) : signedUrl ? (
          <object
            data={signedUrl}
            type="application/pdf"
            className="w-full h-full min-h-[600px] border-0 rounded-2xl bg-white"
          >
            <iframe
              src={`https://docs.google.com/viewer?url=${encodeURIComponent(signedUrl)}&embedded=true`}
              className="w-full h-full min-h-[600px] border-0 rounded-2xl bg-white"
              title="Visor Acta Oficial"
            />
          </object>
        ) : null}
      </div>

      {/* Modal de Conciliación */}
      {showConciliation && (
        <ActaConciliationModal
          match={match}
          players={players}
          convocatorias={convocatorias}
          onClose={() => setShowConciliation(false)}
          onSaveSuccess={fetchSignedUrl}
        />
      )}
    </div>
  )
}
