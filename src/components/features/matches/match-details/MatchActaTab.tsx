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
  const [pdfZoomScale, setPdfZoomScale] = useState<number>(100)
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
    <div className="space-y-4 sm:space-y-6 animate-in fade-in -mx-4 sm:mx-0">
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleDirectUpload}
      />

      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-slate-900 text-white sm:rounded-2xl shadow-sm border-y sm:border border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 sm:p-2.5 bg-blue-600/30 text-blue-400 rounded-xl border border-blue-500/30 shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h3 className="font-bold text-xs sm:text-sm text-white">Acta Oficial del Partido</h3>
            <p className="text-[10px] sm:text-xs text-slate-400">Documento PDF oficial cargado desde la federación</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-none justify-center px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
            >
              Abrir PDF <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {!isReadOnly && !signedUrl && (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingDirect}
              className="flex-1 sm:flex-none justify-center px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all"
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
              className="flex-1 sm:flex-none justify-center px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all border border-slate-700"
            >
              <Edit3 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="truncate">Conciliar Estadísticas</span>
            </button>
          )}

          <button
            onClick={fetchSignedUrl}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors shrink-0"
            title="Refrescar acta"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* PDF Container (100% de la pantalla en móvil con scroll horizontal/vertical desbloqueado) */}
      <div className="bg-white sm:rounded-2xl overflow-hidden w-full h-[78vh] sm:h-[80vh] min-h-[450px] border-y sm:border border-slate-200 flex flex-col relative shadow-sm">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-xs font-medium">Generando URL firmada del acta...</p>
          </div>
        ) : errorMsg ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="flex flex-col items-center gap-3 p-8 text-center max-w-md bg-white border border-slate-200 rounded-2xl shadow-xl">
              <AlertCircle className="w-10 h-10 text-amber-500" />
              <h4 className="font-bold text-slate-800 text-sm">Sin Acta Oficial Disponible</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{errorMsg}</p>
              
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
                className="mt-1 text-[11px] text-slate-500 hover:text-slate-700 font-semibold underline"
              >
                Reintentar Carga
              </button>
            </div>
          </div>
        ) : signedUrl ? (
          <div className="w-full h-full bg-white flex flex-col overflow-hidden">
            {/* Controls bar con botones de Zoom */}
            <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between text-slate-300 text-xs font-bold shrink-0 z-20">
              <span className="text-slate-400 text-[11px]">Zoom: <strong className="text-blue-400">{pdfZoomScale}%</strong></span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPdfZoomScale(prev => Math.max(75, prev - 25))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-mono text-xs shadow-xs"
                  title="Alejar"
                >
                  🔍 -
                </button>
                <button
                  onClick={() => setPdfZoomScale(100)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono text-[10px]"
                  title="Restablecer"
                >
                  100%
                </button>
                <button
                  onClick={() => setPdfZoomScale(prev => Math.min(200, prev + 25))}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-mono text-xs shadow-xs"
                  title="Acercar"
                >
                  🔍 +
                </button>
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  Abrir <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
            
            {/* Scrollable Viewport sin iframe gview con barra gris propia */}
            <div 
              className="flex-1 w-full h-full bg-white overflow-y-auto overflow-x-hidden p-0 relative hide-scrollbar"
              style={{ 
                touchAction: 'pan-y pan-x', 
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none'
              }}
            >
              <style jsx>{`
                div::-webkit-scrollbar, iframe::-webkit-scrollbar, object::-webkit-scrollbar {
                  display: none !important;
                  width: 0px !important;
                  height: 0px !important;
                }
              `}</style>
              <div 
                className="w-full bg-white overflow-hidden transition-transform duration-200"
                style={{
                  transform: `scale(${pdfZoomScale / 100})`,
                  transformOrigin: "top center",
                  width: "100%",
                  height: `${1850 * (pdfZoomScale / 100)}px`
                }}
              >
                <iframe
                  src={`${signedUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-[calc(100%+24px)] h-full border-0 bg-white -mr-6"
                  style={{
                    overflow: 'hidden',
                    scrollbarWidth: 'none'
                  }}
                  title="Visor Acta Oficial"
                />
              </div>
            </div>
          </div>
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
