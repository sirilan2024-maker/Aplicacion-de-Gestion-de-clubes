"use client"

import React, { useState, useEffect, useRef } from "react"
import { UploadCloud, CheckCircle2, AlertCircle, FileText, Search, RefreshCw, Eye, Edit3, ArrowRight, ShieldCheck, ChevronRight, ExternalLink, Maximize2, X, Trophy, Dumbbell, Sparkles, Layers } from "lucide-react"
import { ActaConciliationModal } from "./ActaConciliationModal"
import { createClient } from "@/lib/supabase/client"

interface ActasViewProps {
  matches: any[];
  teams: any[];
  players?: any[];
  convocatorias?: any[];
  isReadOnly?: boolean;
  userRole?: string;
  userTeamIds?: string[];
}

export function ActasView({ matches, teams, players = [], convocatorias = [], isReadOnly = false, userRole = '', userTeamIds = [] }: ActasViewProps) {
  const isAdmin = userRole.toLowerCase() === 'admin' || userRole.toLowerCase() === 'coordinador'
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados de carga masiva
  const [uploading, setUploading] = useState(false)
  const [classifiedResults, setClassifiedResults] = useState<any[]>([])
  const [pendingResults, setPendingResults] = useState<any[]>([])
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Filtros de visualización
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all")
  const [selectedMatchId, setSelectedMatchId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")

  // Estado del visor y conciliación
  const [activeSignedUrl, setActiveSignedUrl] = useState<string | null>(null)
  const [loadingSignedUrl, setLoadingSignedUrl] = useState(false)
  const [signedUrlError, setSignedUrlError] = useState<string | null>(null)
  const [conciliatingMatch, setConciliatingMatch] = useState<any>(null)

  // Estados optimización móvil
  const [isMobileFullscreen, setIsMobileFullscreen] = useState(false)
  const [showIncidencias, setShowIncidencias] = useState(true)
  const [matchEvents, setMatchEvents] = useState<any[]>([])

  // Filtrar partidos del entrenador si no es Admin
  const availableMatches = matches.filter((m) => {
    if (isAdmin || userTeamIds.length === 0) {
      if (selectedTeamId === "all") return true
      return m.equipo_id === selectedTeamId
    }
    // Entrenador ver sólo partidos de sus equipos
    return userTeamIds.includes(m.equipo_id)
  })

  // Buscar coincidencia al escribir
  const searchedMatches = availableMatches.filter((m) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (m.rival_nombre && m.rival_nombre.toLowerCase().includes(q)) ||
      (m.equipo?.name && m.equipo.name.toLowerCase().includes(q))
    )
  })

  // Auto-seleccionar primer partido si hay disponible y ninguno seleccionado
  useEffect(() => {
    if (searchedMatches.length > 0 && !selectedMatchId) {
      setSelectedMatchId(searchedMatches[0].id)
    }
  }, [searchedMatches, selectedMatchId])

  // Cargar Signed URL del partido seleccionado
  const loadSignedUrlForMatch = async (matchId: string) => {
    if (!matchId) return
    setLoadingSignedUrl(true)
    setSignedUrlError(null)
    setActiveSignedUrl(null)
    try {
      const res = await fetch(`/api/partidos/get-acta-url?partidoId=${matchId}`)
      const data = await res.json()
      if (data.signedUrl) {
        setActiveSignedUrl(data.signedUrl)
      } else {
        setSignedUrlError(data.error || "El partido seleccionado no tiene un acta oficial adjunta.")
      }
    } catch (err: any) {
      setSignedUrlError("Error de conexión al consultar el acta del partido.")
    } finally {
      setLoadingSignedUrl(false)
    }
  }

  const fetchMatchEvents = async (matchId: string) => {
    if (!matchId) return
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('match_events')
        .select('*, player:players(first_name, last_name)')
        .eq('partido_id', matchId)
        .order('minuto', { ascending: true })

      setMatchEvents(data || [])
    } catch (err) {
      console.warn("Error buscando eventos del partido:", err)
    }
  }

  useEffect(() => {
    if (selectedMatchId) {
      loadSignedUrlForMatch(selectedMatchId)
      fetchMatchEvents(selectedMatchId)
    }
  }, [selectedMatchId])

  // Manejador de subida masiva de archivos
  const handleFilesUpload = async (filesList: FileList | File[]) => {
    const files = Array.from(filesList).filter((f) => f.type === "application/pdf")
    if (files.length === 0) {
      alert("Por favor selecciona únicamente archivos en formato PDF.")
      return
    }

    setUploading(true)
    setUploadError(null)
    setClassifiedResults([])
    setPendingResults([])

    try {
      const formData = new FormData()
      files.forEach((file) => formData.append("files", file))

      const res = await fetch("/api/partidos/clasificar-actas", {
        method: "POST",
        body: formData
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al procesar el lote de actas")
      }

      setClassifiedResults(data.classified || [])
      setPendingResults(data.pending || [])
    } catch (err: any) {
      console.error(err)
      setUploadError(err.message || "Error al subir y clasificar las actas")
    } finally {
      setUploading(false)
    }
  }

  // Asignar partido manualmente a un PDF pendiente
  const handleAssignPending = async (pendingPath: string, partidoId: string, pendingIdx: number) => {
    try {
      const res = await fetch("/api/partidos/asignar-acta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingPath, partidoId })
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "Error al asignar acta")

      // Mover de pendientes a clasificados en el estado local
      const item = pendingResults[pendingIdx]
      const targetMatch = matches.find((m) => m.id === partidoId)

      setPendingResults((prev) => prev.filter((_, idx) => idx !== pendingIdx))
      setClassifiedResults((prev) => [
        ...prev,
        {
          fileName: item.fileName,
          teamName: targetMatch?.equipo?.name || "Asignado Manualmente",
          partidoId
        }
      ])

      // Cargar acta si es el seleccionado
      if (partidoId === selectedMatchId) {
        loadSignedUrlForMatch(partidoId)
      }
    } catch (err: any) {
      alert(err.message || "Error asignando el acta")
    }
  }

  const selectedMatch = matches.find((m) => m.id === selectedMatchId)

  return (
    <div className="space-y-6">
      {/* ─── Encabezado y Dropzone de Subida ──────────────────────────────── */}
      {!isReadOnly && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-slate-700/50">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 font-bold rounded-lg text-xs border border-blue-400/30 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Módulo de Actas FFCV
                </span>
                <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-bold rounded-lg text-xs border border-emerald-400/30">
                  Clasificación Inteligente IA
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Gestor y Visor de Actas Oficiales</h2>
              <p className="text-slate-300 text-xs md:text-sm mt-1 max-w-2xl">
                Sube los PDFs de las actas de la federación para clasificarlas automáticamente por equipo y fecha. Concilia las estadísticas definitivas de cada partido.
              </p>
            </div>

            {/* Botón de Carga Masiva */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf"
                className="hidden"
                onChange={(e) => e.target.files && handleFilesUpload(e.target.files)}
              />
              <button
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="w-full sm:w-auto px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 text-sm"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-slate-950" /> Clasificando Actas...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-5 h-5" /> Subir Actas PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Feedback de Subida / Error */}
          {uploadError && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {/* Resultados de Clasificación */}
          {(classifiedResults.length > 0 || pendingResults.length > 0) && (
            <div className="mt-4 pt-4 border-t border-slate-700/60 space-y-3">
              {/* 🟢 Lista Clasificados */}
              {classifiedResults.map((item, idx) => (
                <div key={idx} className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-900">Acta clasificada automáticamente: </span>
                      <span className="text-emerald-700">{item.fileName}</span>
                    </div>
                  </div>
                  <span className="bg-emerald-200 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                    {item.teamName}
                  </span>
                </div>
              ))}

              {/* 🟡 Lista Pendientes */}
              {pendingResults.map((item, idx) => (
                <div key={idx} className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-900 block">Acta sin clasificar: {item.fileName}</span>
                      <span className="text-amber-700 text-[11px]">{item.reason}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      onChange={(e) => handleAssignPending(item.pendingPath, e.target.value, idx)}
                      defaultValue=""
                      className="py-1.5 px-3 border border-amber-300 rounded-lg text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                    >
                      <option value="" disabled>Selecciona el partido...</option>
                      {matches.map((m) => (
                        <option key={m.id} value={m.id}>
                          {new Date(m.fecha_hora).toLocaleDateString('es-ES')} - {m.equipo?.name} vs {m.rival_nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visor y Buscador Global / Selector de Partidos */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Panel Selector Lateral (4 Cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Partidos del Club
            </h3>
            <span className="text-xs text-slate-400 font-semibold">{searchedMatches.length} partidos</span>
          </div>

          {/* Filtro Equipo (Si Admin) */}
          {isAdmin && (
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Filtrar por Equipo</label>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="w-full py-2 px-3 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos los equipos</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Buscador Rápido */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por rival o equipo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          {/* Lista Seleccionable de Partidos */}
          <div className="flex-1 max-h-[450px] overflow-y-auto space-y-2 custom-scrollbar pr-1">
            {searchedMatches.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No se encontraron partidos.</div>
            ) : (
              searchedMatches.map((m) => {
                const isSelected = m.id === selectedMatchId
                const hasActa = Boolean(m.acta_oficial_url)

                const isUsLocal = m.lugar === 'Local'
                const localName = isUsLocal ? (m.equipo?.name || 'Mi Equipo') : m.rival_nombre
                const visitanteName = isUsLocal ? m.rival_nombre : (m.equipo?.name || 'Mi Equipo')

                const golesLocal = (m.resultado_propio !== null && m.resultado_rival !== null && m.resultado_propio !== undefined)
                  ? (isUsLocal ? m.resultado_propio : m.resultado_rival)
                  : null
                const golesVisitante = (m.resultado_propio !== null && m.resultado_rival !== null && m.resultado_propio !== undefined)
                  ? (isUsLocal ? m.resultado_rival : m.resultado_propio)
                  : null

                const hasScore = golesLocal !== null && golesVisitante !== null

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMatchId(m.id)}
                    className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-500 shadow-sm"
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span className="font-extrabold text-slate-900">{localName}</span>
                        {hasScore ? (
                          <span className="px-1.5 py-0.5 bg-slate-900 text-emerald-400 font-black rounded text-[11px]">
                            {golesLocal} - {golesVisitante}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-bold text-[11px]">vs</span>
                        )}
                        <span className="font-extrabold text-slate-700">{visitanteName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span>{new Date(m.fecha_hora).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                        <span>•</span>
                        <span className={`font-semibold ${m.estado === 'Finalizado' ? 'text-emerald-600' : 'text-slate-500'}`}>
                          {m.estado} ({isUsLocal ? 'Local' : 'Visitante'})
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasActa ? (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Acta Oficial adjuntada" />
                      ) : (
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-300" title="Sin acta adjunta" />
                      )}
                      <ChevronRight className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-300'}`} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Panel Visor de Acta PDF (8 Cols) */}
        <div className="lg:col-span-8 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between min-h-[550px]">
          {selectedMatch ? (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Header Partido Seleccionado */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>{selectedMatch.lugar === 'Local' ? (selectedMatch.equipo?.name || 'Sporting Saladar') : selectedMatch.rival_nombre}</span>
                      {selectedMatch.resultado_propio !== null && selectedMatch.resultado_rival !== null && selectedMatch.resultado_propio !== undefined ? (
                        <span className="px-2.5 py-0.5 bg-slate-900 text-emerald-400 font-black rounded-lg text-sm shadow-sm">
                          {selectedMatch.lugar === 'Local' ? selectedMatch.resultado_propio : selectedMatch.resultado_rival} - {selectedMatch.lugar === 'Local' ? selectedMatch.resultado_rival : selectedMatch.resultado_propio}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-bold text-xs">vs</span>
                      )}
                      <span>{selectedMatch.lugar === 'Local' ? selectedMatch.rival_nombre : (selectedMatch.equipo?.name || 'Sporting Saladar')}</span>
                    </h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                      selectedMatch.estado === 'Finalizado' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {selectedMatch.estado} ({selectedMatch.lugar === 'Local' ? 'Local' : 'Visitante'})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Fecha: {new Date(selectedMatch.fecha_hora).toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {!isReadOnly && (
                    <button
                      onClick={() => setConciliatingMatch(selectedMatch)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                    >
                      <Edit3 className="w-4 h-4" />
                      Conciliar Estadísticas
                    </button>
                  )}
                </div>
              </div>

              {/* BARRA DE ACCIÓN RÁPIDA MÓVIL Y DESKTOP PARA PDF */}
              {activeSignedUrl && (
                <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Acta Oficial Adjuntada</span>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Botón Pantalla Completa Móvil */}
                    <button
                      onClick={() => setIsMobileFullscreen(true)}
                      className="flex-1 sm:flex-none text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> Pantalla Completa
                    </button>

                    {/* Botón Abrir PDF Nativo en Teléfono / Pestaña Nueva */}
                    <a
                      href={activeSignedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 sm:flex-none text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Abrir PDF Nativo
                    </a>

                    {/* Toggle Incidencias Rápidas */}
                    <button
                      onClick={() => setShowIncidencias(!showIncidencias)}
                      className={`text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition-colors ${
                        showIncidencias ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" /> Incidencias
                    </button>
                  </div>
                </div>
              )}

              {/* TARJETA MÓVIL Y DESKTOP DE RESUMEN DE INCIDENCIAS POR EQUIPO LOCAL Y VISITANTE */}
              {showIncidencias && (() => {
                const isLocalEvent = (e: any) => {
                  if (e.notas?.startsWith('[LOCAL]')) return true;
                  if (e.notas?.startsWith('[VISITANTE]')) return false;
                  return selectedMatch.lugar === 'Local' ? Boolean(e.player_id) : !e.player_id;
                };

                const isVisitanteEvent = (e: any) => {
                  if (e.notas?.startsWith('[VISITANTE]')) return true;
                  if (e.notas?.startsWith('[LOCAL]')) return false;
                  return selectedMatch.lugar === 'Local' ? !e.player_id : Boolean(e.player_id);
                };

                const cleanEventName = (e: any) => {
                  const raw = e.notas || (e.player ? `${e.player.first_name} ${e.player.last_name}` : '');
                  return (raw || '').replace(/^\[LOCAL\]\s*/i, '').replace(/^\[VISITANTE\]\s*/i, '').replace(/^Gol:\s*/i, '').replace(/^Gol marcado por\s*/i, '').replace(/^Tarjeta Amarilla:\s*/i, '').replace(/^Tarjeta Roja:\s*/i, '').replace(/^(Tarjeta Amarilla|Tarjeta Roja) a\s*/i, '').trim();
                };

                const localGoals = matchEvents.filter(e => (e.tipo_evento === 'Gol' || e.tipo_evento === 'Gol en propia puerta' || e.tipo_evento === 'Penalti') && isLocalEvent(e));
                const visitanteGoals = matchEvents.filter(e => (e.tipo_evento === 'Gol' || e.tipo_evento === 'Gol en propia puerta' || e.tipo_evento === 'Penalti') && isVisitanteEvent(e));

                const localCards = matchEvents.filter(e => (e.tipo_evento === 'Tarjeta Amarilla' || e.tipo_evento === 'Tarjeta Roja') && isLocalEvent(e));
                const visitanteCards = matchEvents.filter(e => (e.tipo_evento === 'Tarjeta Amarilla' || e.tipo_evento === 'Tarjeta Roja') && isVisitanteEvent(e));

                return (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white space-y-4 shadow-lg">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" /> Resumen Oficial de Incidencias Extraídas del Acta
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded border border-blue-500/30">
                        {selectedMatch.lugar === 'Local' ? "Partido en Casa (Local)" : "Partido Fuera (Visitante)"}
                      </span>
                    </div>

                    {/* ⚽ SECCIÓN 1: GOLES MARCADOS */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                        <Trophy className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">
                          GOLES MARCADOS
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1">
                        {/* 1. PRIMER EQUIPO EN ACTA: EQUIPO LOCAL */}
                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                          <div className="text-[11px] font-black text-amber-400 uppercase tracking-wider mb-2 border-b border-slate-800/80 pb-1 flex justify-between">
                            <span>1. EQUIPO LOCAL: {selectedMatch.lugar === 'Local' ? (selectedMatch.equipo?.name || "Sporting Saladar") : selectedMatch.rival_nombre}</span>
                            <span className="text-emerald-400 font-bold">{localGoals.length} goles</span>
                          </div>
                          {localGoals.length === 0 ? (
                            <span className="text-xs text-slate-500 italic">Sin goles registrados</span>
                          ) : (
                            <div className="space-y-1.5">
                              {localGoals.map((g, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                                  <span className="font-bold text-slate-200">
                                    {cleanEventName(g)}
                                  </span>
                                  <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                                    Min {g.minuto}' ⚽ {g.tipo_evento !== 'Gol' ? `(${g.tipo_evento})` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 2. SEGUNDO EQUIPO EN ACTA: EQUIPO VISITANTE */}
                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                          <div className="text-[11px] font-black text-blue-400 uppercase tracking-wider mb-2 border-b border-slate-800/80 pb-1 flex justify-between">
                            <span>2. EQUIPO VISITANTE: {selectedMatch.lugar === 'Local' ? selectedMatch.rival_nombre : (selectedMatch.equipo?.name || "Sporting Saladar")}</span>
                            <span className="text-emerald-400 font-bold">{visitanteGoals.length} goles</span>
                          </div>
                          {visitanteGoals.length === 0 ? (
                            <span className="text-xs text-slate-500 italic">Sin goles registrados</span>
                          ) : (
                            <div className="space-y-1.5">
                              {visitanteGoals.map((g, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                                  <span className="font-bold text-slate-200">
                                    {cleanEventName(g)}
                                  </span>
                                  <span className="text-[10px] font-black bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/30">
                                    Min {g.minuto}' ⚽ {g.tipo_evento !== 'Gol' ? `(${g.tipo_evento})` : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 🟨 🟥 SECCIÓN 2: TARJETAS Y AMONESTACIONES */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
                          TARJETAS Y AMONESTACIONES
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-1">
                        {/* 1. PRIMER EQUIPO EN ACTA: EQUIPO LOCAL */}
                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                          <div className="text-[11px] font-black text-amber-400 uppercase tracking-wider mb-2 border-b border-slate-800/80 pb-1 flex justify-between">
                            <span>1. EQUIPO LOCAL: {selectedMatch.lugar === 'Local' ? (selectedMatch.equipo?.name || "Sporting Saladar") : selectedMatch.rival_nombre}</span>
                            <span className="text-amber-400 font-bold">{localCards.length} amonestaciones</span>
                          </div>
                          {localCards.length === 0 ? (
                            <span className="text-xs text-slate-500 italic">Sin tarjetas registradas</span>
                          ) : (
                            <div className="space-y-1.5">
                              {localCards.map((t, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                                  <span className="font-bold text-slate-200">
                                    {cleanEventName(t)}
                                  </span>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                    t.tipo_evento === 'Tarjeta Amarilla' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  }`}>
                                    Min {t.minuto}' {t.tipo_evento === 'Tarjeta Amarilla' ? '🟨 Amarilla' : '🟥 Roja'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* 2. SEGUNDO EQUIPO EN ACTA: EQUIPO VISITANTE */}
                        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                          <div className="text-[11px] font-black text-blue-400 uppercase tracking-wider mb-2 border-b border-slate-800/80 pb-1 flex justify-between">
                            <span>2. EQUIPO VISITANTE: {selectedMatch.lugar === 'Local' ? selectedMatch.rival_nombre : (selectedMatch.equipo?.name || "Sporting Saladar")}</span>
                            <span className="text-amber-400 font-bold">{visitanteCards.length} amonestaciones</span>
                          </div>
                          {visitanteCards.length === 0 ? (
                            <span className="text-xs text-slate-500 italic">Sin tarjetas registradas</span>
                          ) : (
                            <div className="space-y-1.5">
                              {visitanteCards.map((t, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs bg-slate-900 px-2.5 py-1.5 rounded border border-slate-800">
                                  <span className="font-bold text-slate-200">
                                    {cleanEventName(t)}
                                  </span>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                    t.tipo_evento === 'Tarjeta Amarilla' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                  }`}>
                                    Min {t.minuto}' {t.tipo_evento === 'Tarjeta Amarilla' ? '🟨 Amarilla' : '🟥 Roja'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Visor de PDF incorporado */}
              <div className="flex-1 bg-slate-900 rounded-xl overflow-hidden min-h-[450px] md:min-h-[550px] flex flex-col items-center justify-center relative border border-slate-800">
                <div className="flex-1 w-full h-full flex items-center justify-center relative bg-slate-950 p-1">
                  {loadingSignedUrl ? (
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                      <span className="text-xs font-medium">Cargando visor seguro de PDF...</span>
                    </div>
                  ) : signedUrlError ? (
                    <div className="flex flex-col items-center gap-3 p-6 text-center max-w-sm">
                      <AlertCircle className="w-10 h-10 text-amber-500" />
                      <h4 className="font-bold text-slate-200 text-sm">Sin Acta Oficial Disponible</h4>
                      <p className="text-xs text-slate-400">{signedUrlError}</p>
                      {!isReadOnly && (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="mt-3 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-md transition-all"
                        >
                          <UploadCloud className="w-4 h-4" /> Añadir / Subir Acta Ahora
                        </button>
                      )}
                    </div>
                  ) : activeSignedUrl ? (
                    <iframe
                      src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(activeSignedUrl)}`}
                      className="w-full h-full min-h-[450px] md:min-h-[550px] border-0 bg-white rounded-lg shadow-inner"
                      title="Visor de Acta Oficial PDF"
                    />
                  ) : null}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-12">
              <FileText className="w-12 h-12 text-slate-300 mb-2" />
              <p className="text-sm font-medium">Selecciona un partido para visualizar su acta oficial.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── VISOR MODAL DE PANTALLA COMPLETA MÓVIL ─────────────────────────────────── */}
      {isMobileFullscreen && activeSignedUrl && selectedMatch && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-200">
          {/* Header Barra Superior */}
          <div className="bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between shrink-0">
            <div>
              <h3 className="font-extrabold text-white text-sm">
                {selectedMatch.lugar === 'Local' 
                  ? `${selectedMatch.equipo?.name || 'Sporting Saladar'} vs ${selectedMatch.rival_nombre}`
                  : `${selectedMatch.rival_nombre} vs ${selectedMatch.equipo?.name || 'Sporting Saladar'}`
                }
              </h3>
              <p className="text-[11px] text-slate-400">Visor Inmersivo de Acta Oficial PDF (1. Local vs 2. Visitante)</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={activeSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center gap-1"
              >
                Abrir Nativo <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() => setIsMobileFullscreen(false)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Visor PDF 100% Pantalla */}
          <div className="flex-1 w-full bg-slate-950 relative">
            <iframe
              src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(activeSignedUrl)}`}
              className="w-full h-full border-0 bg-white"
              title="Acta Oficial Pantalla Completa"
            />
          </div>
        </div>
      )}

      {/* Modal de Conciliación */}
      {conciliatingMatch && (
        <ActaConciliationModal
          match={conciliatingMatch}
          players={players.filter((p) => p.team_id === conciliatingMatch.equipo_id)}
          convocatorias={convocatorias.filter((c) => c.partido_id === conciliatingMatch.id)}
          onClose={() => setConciliatingMatch(null)}
          onSaveSuccess={() => {
            loadSignedUrlForMatch(conciliatingMatch.id)
            fetchMatchEvents(conciliatingMatch.id)
          }}
        />
      )}
    </div>
  )
}
