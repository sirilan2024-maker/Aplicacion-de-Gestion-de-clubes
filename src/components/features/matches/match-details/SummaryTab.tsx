"use client"

import { useState, useEffect, useTransition, useRef } from "react"
import { LayoutGrid, List, Lock, Unlock, Camera, Upload, Eye, Loader2, Image as ImageIcon } from "lucide-react"
import { uploadTeamPhotoAction } from "@/app/actions/match-actions"
import { toast } from "react-hot-toast"
import { useUserRole } from "@/hooks/useUserRole"
import { useParams } from "next/navigation"
import Link from "next/link"
import { MVPAward } from "./MVPAward"
import { PlayerAvatar } from "./PlayerAvatar"
import { MOCK_LIVE_PLAYERS } from "./LiveTab"

interface PlayerRow {
  id: string
  number: number
  name: string
  pos: string
  titular: boolean
  tactical_x?: number | null
  tactical_y?: number | null
  coachRating: number
  actitud: number
  assists: number
  goals: number
  yellowCards: number
  redCards: number
  avatar: string
  avatarUrl?: string | null
  status: string | null
}

const FORMATIONS: Record<string, { id: string, label: string, x: number, y: number }[]> = {
  "4-3-3": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 73 },
    { id: "slot-3", label: "DFC", x: 62, y: 73 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MC", x: 30, y: 50 },
    { id: "slot-6", label: "MCO", x: 50, y: 53 },
    { id: "slot-7", label: "MC", x: 70, y: 50 },
    { id: "slot-8", label: "EI", x: 25, y: 25 },
    { id: "slot-9", label: "DC", x: 50, y: 20 },
    { id: "slot-10", label: "ED", x: 75, y: 25 }
  ],
  "4-4-2": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 73 },
    { id: "slot-3", label: "DFC", x: 62, y: 73 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MD", x: 15, y: 48 },
    { id: "slot-6", label: "MC", x: 38, y: 50 },
    { id: "slot-7", label: "MC", x: 62, y: 50 },
    { id: "slot-8", label: "MI", x: 85, y: 48 },
    { id: "slot-9", label: "DC", x: 38, y: 22 },
    { id: "slot-10", label: "DC", x: 62, y: 22 }
  ],
  "3-5-2": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "DFC", x: 25, y: 73 },
    { id: "slot-2", label: "DFC", x: 50, y: 75 },
    { id: "slot-3", label: "DFC", x: 75, y: 73 },
    { id: "slot-4", label: "MD", x: 15, y: 48 },
    { id: "slot-5", label: "MC", x: 35, y: 52 },
    { id: "slot-6", label: "MCD", x: 50, y: 56 },
    { id: "slot-7", label: "MC", x: 65, y: 52 },
    { id: "slot-8", label: "MI", x: 85, y: 48 },
    { id: "slot-9", label: "DC", x: 35, y: 22 },
    { id: "slot-10", label: "DC", x: 65, y: 22 }
  ],
  "4-2-3-1": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 73 },
    { id: "slot-3", label: "DFC", x: 62, y: 73 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MCD", x: 38, y: 55 },
    { id: "slot-6", label: "MCD", x: 62, y: 55 },
    { id: "slot-7", label: "MD", x: 20, y: 35 },
    { id: "slot-8", label: "MCO", x: 50, y: 38 },
    { id: "slot-9", label: "MI", x: 80, y: 35 },
    { id: "slot-10", label: "DC", x: 50, y: 20 }
  ],
  "3-4-3": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "DFC", x: 25, y: 73 },
    { id: "slot-2", label: "DFC", x: 50, y: 75 },
    { id: "slot-3", label: "DFC", x: 75, y: 73 },
    { id: "slot-4", label: "MD", x: 15, y: 48 },
    { id: "slot-5", label: "MC", x: 38, y: 50 },
    { id: "slot-6", label: "MC", x: 62, y: 50 },
    { id: "slot-7", label: "MI", x: 85, y: 48 },
    { id: "slot-8", label: "ED", x: 25, y: 25 },
    { id: "slot-9", label: "DC", x: 50, y: 20 },
    { id: "slot-10", label: "EI", x: 75, y: 25 }
  ],
  "4-1-4-1": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "LD", x: 15, y: 70 },
    { id: "slot-2", label: "DFC", x: 38, y: 73 },
    { id: "slot-3", label: "DFC", x: 62, y: 73 },
    { id: "slot-4", label: "LI", x: 85, y: 70 },
    { id: "slot-5", label: "MCD", x: 50, y: 58 },
    { id: "slot-6", label: "MD", x: 20, y: 42 },
    { id: "slot-7", label: "MC", x: 40, y: 45 },
    { id: "slot-8", label: "MC", x: 60, y: 45 },
    { id: "slot-9", label: "MI", x: 80, y: 42 },
    { id: "slot-10", label: "DC", x: 50, y: 20 }
  ],
  "5-3-2": [
    { id: "slot-0", label: "POR", x: 50, y: 88 },
    { id: "slot-1", label: "CAD", x: 10, y: 65 },
    { id: "slot-2", label: "DFC", x: 30, y: 73 },
    { id: "slot-3", label: "DFC", x: 50, y: 75 },
    { id: "slot-4", label: "DFC", x: 70, y: 73 },
    { id: "slot-5", label: "CAI", x: 90, y: 65 },
    { id: "slot-6", label: "MC", x: 35, y: 48 },
    { id: "slot-7", label: "MCD", x: 50, y: 52 },
    { id: "slot-8", label: "MC", x: 65, y: 48 },
    { id: "slot-9", label: "DC", x: 35, y: 22 },
    { id: "slot-10", label: "DC", x: 65, y: 22 }
  ]
}

export function SummaryTab({ matchId, match, players = [], convocatorias = [] }: { matchId: string, match?: any, players?: any[], convocatorias?: any[] }) {
  const { rol } = useUserRole()
  const { teamId } = useParams()
  const isFamilyView = rol === "familia" || rol === "jugador"
  
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const getCoordsStyle = (x: number, y: number) => {
    if (isDesktop) {
      return {
        left: `${y}%`,
        top: `${100 - x}%`
      };
    }
    return {
      left: `${x}%`,
      top: `${y}%`
    };
  };

  const parsedCoachReport = typeof match?.coach_report === 'string'
    ? (() => { try { return JSON.parse(match.coach_report) } catch { return {} } })()
    : (match?.coach_report || {});

  const officialTactic: string = (() => {
    const cand =
      parsedCoachReport?.official_tactic ||
      parsedCoachReport?.ffcv_live?.ourFormation ||
      parsedCoachReport?.liga_brave_live?.ourFormation;
    return cand && FORMATIONS[cand] ? cand : "4-3-3";
  })();

  const activeFormationSlots = FORMATIONS[officialTactic] || FORMATIONS["4-3-3"];

  const mappedPlayers: (PlayerRow & { isConvocado?: boolean })[] = players.map(p => {
    const conv = convocatorias.find(c => c.player_id === p.id);
    const rawFirst = (p.first_name || p.nombre || '').trim();
    const rawLast = (p.last_name || p.apellidos || '').trim();
    const customNickname = (p.nickname || p.apodo || '').trim();
    const fullName = `${rawFirst} ${rawLast}`.trim() || p.name || 'Jugador';
    const init1 = (customNickname && customNickname[0]) || (rawFirst && rawFirst[0]) || 'J';
    const init2 = (rawLast && rawLast[0]) || '';

    let inferredSlotLabel: string | null = null;
    if (conv?.titular && conv?.tactical_x != null && conv?.tactical_y != null) {
      let minDist = Infinity;
      for (const s of activeFormationSlots) {
        const d = Math.hypot(conv.tactical_x - s.x, conv.tactical_y - s.y);
        if (d < minDist) {
          minDist = d;
          inferredSlotLabel = s.label;
        }
      }
    }

    const isConvocado = Boolean(
      conv && (conv.titular || conv.status === 'convocado' || conv.status === 'titular' || conv.status === 'suplente')
    );

    return {
      id: p.id,
      number: p.dorsal || conv?.dorsal || 0,
      name: customNickname || fullName,
      avatar: `${init1}${init2}`.toUpperCase(),
      avatarUrl: p.avatar_url || p.foto_url || p.photo_url || p.foto || null,
      pos: conv?.slotLabel || inferredSlotLabel || p.posicion_principal || p.posicion || "JUG",
      titular: conv?.titular || false,
      isConvocado,
      tactical_x: conv?.tactical_x,
      tactical_y: conv?.tactical_y,
      coachRating: conv?.coach_rating || 0,
      actitud: conv?.actitud || 0,
      goals: conv?.goals || 0,
      assists: conv?.assists || 0,
      yellowCards: conv?.yellow_cards || 0,
      redCards: conv?.red_cards || 0,
      minutes: conv?.minutes_played ?? conv?.minutos_jugados ?? 0,
      status: (conv?.estado_asistencia === 'Ausente' || conv?.estado_asistencia === 'Justificado') ? conv.estado_asistencia : 'Presente'
    };
  })

  // Identificar titulares y suplentes convocados
  const hasAnyConvocatoria = mappedPlayers.some(p => p.isConvocado || p.titular);
  const explicitStarters = mappedPlayers.filter(p => p.titular);
  const explicitBench = hasAnyConvocatoria
    ? mappedPlayers.filter(p => !p.titular && p.isConvocado)
    : mappedPlayers.filter(p => !p.titular);

  // Si hay titulares (guardados o sincronizados del acta), los usamos directamente; sino, los convocados reales
  const startersList = explicitStarters.length > 0 
    ? explicitStarters 
    : (mappedPlayers.length > 0 ? mappedPlayers.slice(0, 11) : []);

  const benchList = explicitStarters.length > 0 
    ? explicitBench 
    : (mappedPlayers.length > 0 ? mappedPlayers.slice(11) : []);

  const playerList = [...startersList, ...benchList];
  const [tactic, setTactic] = useState(officialTactic)
  const [isPrivate, setIsPrivate] = useState(false)
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [isPending, startTransition] = useTransition()

  const [teamPhotoUrl, setTeamPhotoUrl] = useState<string | null>(
    parsedCoachReport?.team_photo_url || match?.team_photo_url || null
  )
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [showPhotoModal, setShowPhotoModal] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor selecciona una imagen válida (JPG, PNG, WebP)")
      return
    }

    setIsUploadingPhoto(true)
    const toastId = toast.loading("Subiendo foto del equipo...")

    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await uploadTeamPhotoAction(matchId, formData)
      if (res.success && res.teamPhotoUrl) {
        setTeamPhotoUrl(res.teamPhotoUrl)
        toast.success("Foto del equipo guardada con éxito", { id: toastId })
      } else {
        toast.error(res.error || "Error al subir la imagen", { id: toastId })
      }
    } catch (err: any) {
      toast.error("Error al procesar la foto", { id: toastId })
    } finally {
      setIsUploadingPhoto(false)
      if (photoInputRef.current) photoInputRef.current.value = ""
    }
  }

  const mvpPlayers = players.map(p => {
    const conv = convocatorias.find((c: any) => c.player_id === p.id);
    return {
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      dorsal: p.dorsal || 0,
      avatarUrl: p.avatar_url,
      posicion: p.posicion_principal || "Jugador",
      goals: conv?.goals || 0,
      assists: conv?.assists || 0
    };
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-12">
        <MVPAward matchId={matchId} players={mvpPlayers} />
      </div>
      
      {/* ── Columna Izquierda: Informe del Cuerpo Técnico ── */}
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
            Informe del Cuerpo Técnico
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nota del Partido</p>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">Valoración global</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-black text-xl flex items-center justify-center border-2 border-white shadow-sm">
                  {match?.coach_rating || "-"}
                </div>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Valoración General</p>
                <p className="text-xs font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">{match?.coach_summary || "Sin valoración general."}</p>
              </div>
              
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Actitud y Observaciones</p>
                <p className="text-xs font-semibold text-slate-700 whitespace-pre-wrap leading-relaxed">{match?.attitude_notes || "Sin observaciones adicionales."}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 h-[calc(50%-0.5rem)]">
                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">Aspectos Positivos</p>
                <p className="text-xs font-semibold text-emerald-800 whitespace-pre-wrap leading-relaxed">{match?.positive_aspects || "No se han especificado."}</p>
              </div>
              
              <div className="bg-orange-50/50 p-4 rounded-xl border border-orange-100 h-[calc(50%-0.5rem)]">
                <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">Aspectos a Mejorar</p>
                <p className="text-xs font-semibold text-orange-800 whitespace-pre-wrap leading-relaxed">{match?.improvement_aspects || "No se han especificado."}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sección: Foto del Equipo ── */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />

          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                Foto del Equipo
              </h3>
            </div>
            {!isFamilyView && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold border border-blue-200 transition-colors disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Upload className="w-3.5 h-3.5" />
                )}
                <span>{teamPhotoUrl ? "Cambiar foto" : "Subir foto"}</span>
              </button>
            )}
          </div>

          {teamPhotoUrl ? (
            <div className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-900 aspect-video max-h-[320px] flex items-center justify-center">
              <img
                src={teamPhotoUrl}
                alt="Foto del equipo del partido"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                <span className="text-xs font-bold text-white tracking-wide">
                  Foto oficial del partido
                </span>
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(true)}
                  className="p-2 bg-white/90 hover:bg-white text-slate-900 rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Ampliar</span>
                </button>
              </div>
            </div>
          ) : (
            <div 
              onClick={() => !isFamilyView && photoInputRef.current?.click()}
              className={`p-8 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center transition-colors ${
                !isFamilyView 
                  ? "border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 cursor-pointer" 
                  : "border-slate-200 bg-slate-50/50 cursor-default"
              }`}
            >
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                <ImageIcon className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700">
                {isFamilyView ? "Sin foto de equipo disponible para este partido" : "Aún no se ha añadido la foto del equipo"}
              </p>
              {!isFamilyView && (
                <p className="text-[11px] font-medium text-slate-400 mt-0.5">
                  Haz clic aquí o pulsa en "Subir foto" para guardar el recuerdo del once
                </p>
              )}
            </div>
          )}
        </div>

        {/* Modal Vista Ampliada de la Foto */}
        {showPhotoModal && teamPhotoUrl && (
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={() => setShowPhotoModal(false)}
          >
            <div 
              className="relative max-w-4xl w-full max-h-[90vh] bg-slate-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-3 bg-slate-900 flex items-center justify-between text-white border-b border-slate-800">
                <span className="text-xs font-bold flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-400" />
                  Foto del Equipo del Partido
                </span>
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(false)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors"
                >
                  Cerrar ✕
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center p-2 bg-black/60 overflow-hidden">
                <img
                  src={teamPhotoUrl}
                  alt="Foto del equipo ampliada"
                  className="max-h-[80vh] w-auto object-contain rounded-lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Columna Derecha: Alineación Idéntica con Fotos y Notas ── */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white rounded-xl border border-slate-150 p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Alineación Táctica</h3>
                <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {officialTactic}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                {isFamilyView ? "VISTA PREVIA TÁCTICA (MODO LECTURA)" : "SINCRONIZACIÓN AUTOMÁTICA · ACTA OFICIAL"}
              </p>
            </div>
            
            {/* View toggle (Grid / List) */}
            <div className="flex rounded-lg border border-slate-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 transition-colors ${viewMode === "grid" ? "bg-slate-100 text-slate-800 font-bold" : "bg-white text-slate-400 hover:text-slate-600"}`}
                title="Vista Campo Táctico"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 transition-colors ${viewMode === "list" ? "bg-slate-100 text-slate-800 font-bold" : "bg-white text-slate-400 hover:text-slate-600"}`}
                title="Vista Lista"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === "list" ? (
            <div className="space-y-2 py-1 max-h-[460px] overflow-y-auto pr-1">
              <h4 className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Titulares ({startersList.length})</h4>
              {startersList.map((player) => (
                <div key={player.id} className="flex items-center justify-between p-2.5 border border-slate-100 rounded-xl bg-slate-50/60">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                      {player.number || "-"}
                    </span>
                    <PlayerAvatar player={{ first_name: player.name, photo_url: player.avatarUrl, posicion: player.pos }} dorsal={player.number} size="sm" showDorsalBadge={false} />
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">{player.name}</h5>
                      <span className="text-[10px] text-slate-400 font-semibold">{player.pos}</span>
                    </div>
                  </div>
                  {player.coachRating > 0 && (
                    <span className="text-xs font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg shadow-2xs">
                      ★ {player.coachRating.toFixed(1)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Pizarra idéntica a Alineación con fotos, dorsales, badges de posición y nota */
            <div 
              className="relative w-full aspect-[3/4.2] max-w-[360px] md:max-w-none md:aspect-auto md:w-full md:h-[480px] mx-auto bg-emerald-700 rounded-xl overflow-hidden border border-emerald-800 shadow-md transition-all select-none"
            >
              {/* Marcajes del campo */}
              <div className="absolute inset-3 sm:inset-4 border border-white/20 pointer-events-none md:-rotate-90 md:origin-center md:scale-[1.3] md:w-[150%] md:-left-[25%]">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20" />
                <div className="absolute top-0 left-1/4 right-1/4 h-12 border-b border-x border-white/20" />
                <div className="absolute bottom-0 left-1/4 right-1/4 h-12 border-t border-x border-white/20" />
              </div>

              {/* Titulares en el campo con coordenadas exactas guardadas */}
              {startersList.map((player, idx) => {
                const fallbackSlot = activeFormationSlots[idx] || { x: 50, y: 50, label: "JUG" };
                const posX = (player.tactical_x != null) ? player.tactical_x : fallbackSlot.x;
                const posY = (player.tactical_y != null) ? player.tactical_y : fallbackSlot.y;

                return (
                  <div
                    key={player.id}
                    style={getCoordsStyle(posX, posY)}
                    className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10 transition-all select-none"
                  >
                    <div className="relative group flex flex-col items-center">
                      {/* Badge superior de demarcación táctica */}
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-blue-600 border border-white text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-tight z-20 pointer-events-none select-none whitespace-nowrap leading-none">
                        {player.pos || fallbackSlot.label || "JUG"}
                      </div>

                      {/* Círculo idéntico a Alineación con foto */}
                      <div className="relative w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-slate-900 border-2 border-white overflow-hidden flex items-center justify-center shadow-md select-none">
                        {player.avatarUrl ? (
                          <img 
                            src={player.avatarUrl} 
                            alt={player.name} 
                            draggable={false}
                            className="w-full h-full object-cover object-[center_20%] pointer-events-none select-none" 
                          />
                        ) : (
                          <span className="text-sm font-black text-white tracking-wider pointer-events-none select-none">
                            {player.avatar}
                          </span>
                        )}

                        {/* Badge de nota del jugador si está calificado */}
                        {player.coachRating > 0 && (
                          <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-black px-1.5 py-0.2 rounded-full border border-white shadow-sm z-30">
                            ★ {player.coachRating.toFixed(1)}
                          </span>
                        )}
                      </div>

                      {/* Pastilla inferior: Dorsal (#) y Nombre */}
                      <span className="text-[9px] sm:text-[9.5px] font-black text-white mt-1 bg-slate-950/90 border border-white/20 px-2 py-0.5 rounded-md shadow-md whitespace-nowrap flex items-center gap-1.5 select-none leading-tight">
                        {player.number != null && player.number !== 0 && (
                          <span className="text-amber-400 font-mono font-black text-[9px] sm:text-[9.5px] shrink-0">
                            #{player.number}
                          </span>
                        )}
                        <span>{player.name.split(" ")[0]}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Banquillo de suplentes */}
          <div className="border-t border-slate-100 pt-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
              Banquillo de Suplentes ({benchList.length})
            </p>
            {benchList.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {benchList.map(supl => (
                  <div key={supl.id} className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 px-2.5 py-1.5 rounded-xl shadow-2xs">
                    <span className="w-5 h-5 rounded-md bg-slate-800 text-white font-mono font-black text-[9px] flex items-center justify-center shrink-0">
                      {supl.number || "-"}
                    </span>
                    <PlayerAvatar player={{ first_name: supl.name, photo_url: supl.avatarUrl, posicion: supl.pos }} dorsal={supl.number} size="sm" showDorsalBadge={false} />
                    <span className="text-xs font-bold text-slate-700">{supl.name.split(" ")[0]}</span>
                    {supl.coachRating > 0 && (
                      <span className="text-[9px] font-extrabold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        ★ {supl.coachRating.toFixed(1)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No hay suplentes convocados</p>
            )}
          </div>
        </div>

        {/* ── Ficha Oficial del Rival y Cuerpo Arbitral (FFCV / Liga Brave) ── */}
        {(() => {
          const officialLive = parsedCoachReport?.ffcv_live || parsedCoachReport?.liga_brave_live;
          const rivalPlayers = Array.isArray(officialLive?.rivalPlayers) ? officialLive.rivalPlayers : [];
          const arbitros: string[] = Array.isArray(officialLive?.arbitros) ? officialLive.arbitros : [];
          const rivalCoach = typeof officialLive?.rivalCoach === 'string' ? officialLive.rivalCoach : officialLive?.rivalCoach?.name;
          const rivalFormation = officialLive?.rivalFormation;

          if (rivalPlayers.length === 0 && arbitros.length === 0) return null;

          const rivalStarters = rivalPlayers.filter((rp: any) => rp.titular);
          const rivalBench = rivalPlayers.filter((rp: any) => !rp.titular);

          return (
            <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider truncate">
                      Rival: {match?.rival_nombre || "Equipo Rival"}
                    </h3>
                    {rivalFormation && (
                      <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
                        {rivalFormation}
                      </span>
                    )}
                  </div>
                  {rivalCoach && (
                    <p className="text-[11px] font-semibold text-slate-500 truncate mt-0.5">
                      👔 Entrenador: <span className="text-slate-700 font-bold">{rivalCoach}</span>
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                  {rivalPlayers.length} convocados
                </span>
              </div>

              {arbitros.length > 0 && (
                <div className="bg-slate-50 border border-slate-150 rounded-lg px-3 py-2 text-[11px] text-slate-600 flex items-center gap-2">
                  <span className="font-black text-slate-700 shrink-0">⚖️ Árbitro:</span>
                  <span className="font-semibold truncate">{arbitros.join(" · ")}</span>
                </div>
              )}

              {rivalStarters.length > 0 && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 mb-1.5">
                    Once Titular Rival ({rivalStarters.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {rivalStarters.map((rp: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-5 h-5 rounded bg-slate-800 text-white font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                            {rp.dorsal ?? "-"}
                          </span>
                          <span className="font-bold text-slate-700 truncate text-[11px]">{rp.nombre || rp.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {(rp.goles ?? rp.goals ?? 0) > 0 && (
                            <span className="text-[10px] font-black text-emerald-700">⚽{rp.goles ?? rp.goals}</span>
                          )}
                          {(rp.amarillas ?? rp.yellowCards ?? 0) > 0 && (
                            <span className="w-2.5 h-3.5 rounded-xs bg-amber-400 border border-amber-500 inline-block" />
                          )}
                          {(rp.rojas ?? rp.redCards ?? 0) > 0 && (
                            <span className="w-2.5 h-3.5 rounded-xs bg-rose-600 border border-rose-700 inline-block" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rivalBench.length > 0 && (
                <div className="pt-1">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                    Suplentes Rival ({rivalBench.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {rivalBench.map((rp: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50/60 border border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-5 h-5 rounded bg-slate-600 text-white font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                            {rp.dorsal ?? "-"}
                          </span>
                          <span className="font-semibold text-slate-600 truncate text-[11px]">{rp.nombre || rp.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {rp.entroMinuto && (
                            <span className="text-[9px] font-bold text-emerald-600">▲{rp.entroMinuto}'</span>
                          )}
                          {(rp.goles ?? rp.goals ?? 0) > 0 && (
                            <span className="text-[10px] font-black text-emerald-700">⚽{rp.goles ?? rp.goals}</span>
                          )}
                          {(rp.amarillas ?? rp.yellowCards ?? 0) > 0 && (
                            <span className="w-2.5 h-3.5 rounded-xs bg-amber-400 border border-amber-500 inline-block" />
                          )}
                          {(rp.rojas ?? rp.redCards ?? 0) > 0 && (
                            <span className="w-2.5 h-3.5 rounded-xs bg-rose-600 border border-rose-700 inline-block" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>



    </div>
  )
}
