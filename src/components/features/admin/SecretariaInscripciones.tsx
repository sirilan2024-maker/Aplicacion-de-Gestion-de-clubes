"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  UserPlus, CheckCircle, XCircle, Loader2, FileText, Eye,
  AlertCircle, Download, Clock, Search, Filter, ChevronDown,
  ExternalLink, ShieldCheck, Banknote, RefreshCw
} from "lucide-react"
import toast from "react-hot-toast"
import { approveInscriptionAction, rejectInscriptionAction } from "@/app/actions/inscriptions-actions"
import { createAdminFeeForPlayerAction } from "@/app/actions/treasury-actions"

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface DocumentInfo {
  document_type: string
  file_url: string
  status: string
}

interface PlayerRequest {
  id: string
  first_name: string
  last_name: string
  birth_date: string | null
  dni: string | null
  posicion_principal: string | null
  parent1_name: string | null
  parent1_phone: string | null
  parent1_email: string | null
  payment_method: string | null
  payment_plan: string | null
  registration_status: string
  created_at: string
  is_foreign: boolean
  never_federated: boolean
  player_documents: DocumentInfo[]
  teams: { name: string; category: string } | null
}

// Documentos obligatorios mínimos para tramitar la ficha
const REQUIRED_DOCS = ["pasaporte", "foto_carnet"]

// Mapa de etiquetas legibles para los tipos de documentos
const DOC_LABELS: Record<string, string> = {
  pasaporte: "DNI/NIE del Jugador",
  foto_carnet: "Foto Carnet",
  dni_tutor: "DNI/NIE del Tutor",
  dni_nie_del_jugador_anverso: "DNI Jugador (Anverso)",
  dni_nie_del_jugador_reverso: "DNI Jugador (Reverso)",
  dni_nie_del_tutor_anverso: "DNI Tutor (Anverso)",
  dni_nie_del_tutor_reverso: "DNI Tutor (Reverso)",
  foto_medio_cuerpo: "Foto Medio Cuerpo",
  foto_cuerpo_entero: "Foto Cuerpo Entero",
  foto_horizontal: "Foto Horizontal",
  pasaporte_jugador: "Pasaporte (Jugador)",
  libro_de_familia: "Libro de Familia",
  certificado_de_nacimiento: "Certificado de Nacimiento",
  empadronamiento: "Empadronamiento",
  carta_explicativa: "Carta Explicativa FFCV",
}

function getDocLabel(docType: string): string {
  const lower = docType.toLowerCase().replace(/[^a-z0-9]/g, "_")
  return DOC_LABELS[lower] || docType.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

// ─── Badge de estado ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    pending_revision: { label: "Pendiente", className: "bg-amber-100 text-amber-800 border-amber-200", icon: <Clock size={11} /> },
    pending_payment: { label: "Aprobado", className: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: <CheckCircle size={11} /> },
    formalized: { label: "Formalizado", className: "bg-blue-100 text-blue-800 border-blue-200", icon: <ShieldCheck size={11} /> },
    rejected: { label: "Rechazado", className: "bg-red-100 text-red-800 border-red-200", icon: <XCircle size={11} /> },
  }
  const c = config[status] || { label: status, className: "bg-gray-100 text-gray-800 border-gray-200", icon: null }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${c.className}`}>
      {c.icon}{c.label}
    </span>
  )
}

// ─── Semáforo de documentación ────────────────────────────────────────────────

function DocTrafficLight({ docs }: { docs: DocumentInfo[] }) {
  const docTypes = docs.map(d => d.document_type.toLowerCase())
  const hasRequiredAll = REQUIRED_DOCS.every(req => docTypes.some(t => t.includes(req.replace("pasaporte", "pasaporte").replace("foto_carnet", "foto_carnet"))))
  const hasAny = docs.length > 0

  if (hasRequiredAll) {
    return (
      <span title="Documentación completa" className="inline-flex items-center gap-1 text-emerald-600 text-xs font-bold">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30 animate-pulse" />
        {docs.length} doc{docs.length !== 1 ? "s" : ""}
      </span>
    )
  }
  if (hasAny) {
    return (
      <span title="Faltan documentos obligatorios" className="inline-flex items-center gap-1 text-amber-600 text-xs font-bold">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400/30" />
        {docs.length} doc{docs.length !== 1 ? "s" : ""} · Incompleto
      </span>
    )
  }
  return (
    <span title="Sin documentación" className="inline-flex items-center gap-1 text-red-500 text-xs font-bold">
      <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/30" />
      Sin documentos
    </span>
  )
}

// ─── Modal de expediente ──────────────────────────────────────────────────────

function ExpedienteModal({
  player,
  onClose,
  onApprove,
  onReject
}: {
  player: PlayerRequest
  onClose: () => void
  onApprove: (id: string) => Promise<void>
  onReject: (id: string, reason: string) => Promise<void>
}) {
  const [loadingApprove, setLoadingApprove] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [loadingReject, setLoadingReject] = useState(false)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [loadingUrls, setLoadingUrls] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUrls = async () => {
      const urls: Record<string, string> = {}
      for (const doc of player.player_documents) {
        if (doc.file_url) {
          const { data } = await supabase.storage
            .from("expedientes-doc")
            .createSignedUrl(doc.file_url, 3600)
          if (data?.signedUrl) urls[doc.document_type] = data.signedUrl
        }
      }
      setSignedUrls(urls)
      setLoadingUrls(false)
    }
    getUrls()
  }, [player.player_documents])

  const handleApprove = async () => {
    setLoadingApprove(true)
    await onApprove(player.id)
    setLoadingApprove(false)
    onClose()
  }

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error("Indica el motivo del rechazo"); return }
    setLoadingReject(true)
    await onReject(player.id, rejectReason)
    setLoadingReject(false)
    onClose()
  }

  const hasMissingDocs = REQUIRED_DOCS.some(req =>
    !player.player_documents.some(d => d.document_type.toLowerCase().includes(req))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 p-5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-extrabold text-white">{player.first_name} {player.last_name}</h3>
            <p className="text-slate-400 text-xs mt-0.5">
              Inscripción: {new Date(player.created_at).toLocaleDateString("es-ES")}
              {player.teams && ` · ${player.teams.name} (${player.teams.category})`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
            <XCircle size={22} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* Datos del jugador */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm">
            <div><span className="text-slate-500 block text-xs font-semibold uppercase tracking-wide">Fecha Nacimiento</span><span className="font-bold text-slate-800">{player.birth_date ? new Date(player.birth_date).toLocaleDateString("es-ES") : "–"}</span></div>
            <div><span className="text-slate-500 block text-xs font-semibold uppercase tracking-wide">DNI/NIE</span><span className="font-bold text-slate-800">{player.dni || "–"}</span></div>
            <div><span className="text-slate-500 block text-xs font-semibold uppercase tracking-wide">Tutor</span><span className="font-bold text-slate-800">{player.parent1_name || "–"}</span></div>
            <div><span className="text-slate-500 block text-xs font-semibold uppercase tracking-wide">Contacto</span><span className="font-bold text-slate-800">{player.parent1_phone || player.parent1_email || "–"}</span></div>
            <div><span className="text-slate-500 block text-xs font-semibold uppercase tracking-wide">Pago</span><span className="font-bold text-slate-800">{player.payment_method || "–"} {player.payment_plan ? `(${player.payment_plan})` : ""}</span></div>
            <div>
              <span className="text-slate-500 block text-xs font-semibold uppercase tracking-wide">Condición</span>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {player.is_foreign && <span className="text-[10px] bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 font-bold">Extranjero</span>}
                {player.never_federated && <span className="text-[10px] bg-purple-100 text-purple-800 rounded-full px-2 py-0.5 font-bold">1ª Federación</span>}
                {!player.is_foreign && !player.never_federated && <span className="text-slate-400 text-xs">–</span>}
              </div>
            </div>
          </div>

          {/* Alerta si faltan documentos */}
          {hasMissingDocs && (
            <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <span><strong>Documentación incompleta.</strong> Faltan archivos obligatorios para tramitar la ficha federativa (DNI del jugador y/o foto carnet).</span>
            </div>
          )}

          {/* Expediente de documentos */}
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
              <FileText size={15} className="text-slate-500" /> Expediente Digital ({player.player_documents.length} archivos)
            </h4>
            {player.player_documents.length === 0 ? (
              <div className="text-center text-slate-400 py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm">
                No se han adjuntado documentos.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {player.player_documents.map((doc, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={14} className="text-blue-500 shrink-0" />
                      <span className="text-xs font-semibold text-slate-700 truncate">{getDocLabel(doc.document_type)}</span>
                    </div>
                    {loadingUrls ? (
                      <Loader2 size={14} className="animate-spin text-slate-400 shrink-0" />
                    ) : signedUrls[doc.document_type] ? (
                      <a
                        href={signedUrls[doc.document_type]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 shrink-0 ml-2"
                      >
                        <Download size={12} /> Ver
                      </a>
                    ) : (
                      <span className="text-[10px] text-slate-400 shrink-0 ml-2">No disponible</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer de acciones */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
          {showRejectInput ? (
            <div className="space-y-3">
              <textarea
                placeholder="Motivo del rechazo (se notificará a la familia)..."
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                rows={3}
                className="w-full border border-red-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 resize-none"
              />
              <div className="flex flex-col md:flex-row gap-2">
                <button onClick={() => setShowRejectInput(false)} className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-100 transition-colors w-full">
                  Cancelar
                </button>
                <button onClick={handleReject} disabled={loadingReject} className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 w-full">
                  {loadingReject && <Loader2 size={14} className="animate-spin" />} Confirmar Rechazo
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row gap-3">
              <button onClick={() => setShowRejectInput(true)} className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition-colors flex items-center justify-center gap-2 w-full">
                <XCircle size={15} /> Rechazar
              </button>
              <button
                onClick={handleApprove}
                disabled={loadingApprove}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm w-full"
              >
                {loadingApprove ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={15} />}
                Aprobar Inscripción
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function SecretariaInscripciones() {
  const [requests, setRequests] = useState<PlayerRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("approved")
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerRequest | null>(null)

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const { data: authData } = await supabase.auth.getUser()
    if (!authData.user) { setLoading(false); return }

    const { data: profile } = await supabase.from("profiles").select("role, club_id").eq("id", authData.user.id).single()
    if (!profile || !["admin", "secretaria"].includes(profile.role)) { setLoading(false); return }

    const { data, error } = await supabase
      .from("players")
      .select(`
        id, first_name, last_name, birth_date, dni, posicion_principal,
        parent1_name, parent1_phone, parent1_email, payment_method, payment_plan,
        registration_status, created_at, is_foreign, never_federated,
        player_documents(document_type, file_url, status),
        teams(name, category)
      `)
      .eq("club_id", profile.club_id)
      .in("registration_status", ["pending_revision", "pending_payment", "formalized", "rejected"])
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching inscriptions:", error)
      toast.error("Error al cargar inscripciones")
    } else if (data) {
      setRequests(data as any)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const handleApprove = async (playerId: string) => {
    try {
      const res = await approveInscriptionAction(playerId)
      if (res.success) {
        toast.success("✅ Inscripción aprobada — se ha generado la cuota en Tesorería")
        // Create a simulated fee entry for treasury
        await createAdminFeeForPlayerAction(playerId)
        fetchRequests()
      } else {
        toast.error("Error al aprobar: " + (res.error || "desconocido"))
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleReject = async (playerId: string, reason: string) => {
    try {
      const res = await rejectInscriptionAction(playerId)
      if (res.success) {
        toast.success("Inscripción rechazada y eliminada del sistema.")
        fetchRequests()
      } else {
        toast.error("Error al rechazar: " + (res.error || "desconocido"))
      }
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const filtered = requests.filter(r => {
    const matchesSearch = `${r.first_name} ${r.last_name}`.toLowerCase().includes(search.toLowerCase())
    
    let matchesStatus = false
    if (statusFilter === "all") matchesStatus = true
    else if (statusFilter === "pending_revision") matchesStatus = r.registration_status === "pending_revision"
    else if (statusFilter === "approved") matchesStatus = r.registration_status === "pending_payment" || r.registration_status === "formalized"
    else if (statusFilter === "rejected") matchesStatus = r.registration_status === "rejected"

    return matchesSearch && matchesStatus
  })

  const pendingCount = requests.filter(r => r.registration_status === "pending_revision").length
  const approvedCount = requests.filter(r => r.registration_status === "pending_payment" || r.registration_status === "formalized").length
  const rejectedCount = requests.filter(r => r.registration_status === "rejected").length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-300">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-indigo-600" />
            Secretaría — Inscripciones
          </h1>
          <p className="text-slate-500 text-sm mt-1">Gestión y revisión de solicitudes de inscripción. Aprueba expedientes y genera cuotas automáticamente.</p>
        </div>
        <button onClick={fetchRequests} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
          <RefreshCw size={14} /> Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => setStatusFilter("pending_revision")} className={`p-4 rounded-xl border shadow-sm text-left transition-all hover:shadow-md ${statusFilter === "pending_revision" ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white hover:border-amber-300"}`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pendientes</span>
          <span className="text-2xl font-black text-amber-600">{pendingCount}</span>
        </button>
        <button onClick={() => setStatusFilter("approved")} className={`p-4 rounded-xl border shadow-sm text-left transition-all hover:shadow-md ${statusFilter === "approved" ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300"}`}>
          <div className="flex items-center gap-2 mb-2 text-emerald-700"><CheckCircle size={20} /><span className="font-bold text-sm">Aprobadas</span></div>
          <span className="text-2xl font-black text-emerald-600">{approvedCount}</span>
        </button>
        <button onClick={() => setStatusFilter("rejected")} className={`p-4 rounded-xl border shadow-sm text-left transition-all hover:shadow-md ${statusFilter === "rejected" ? "border-red-400 bg-red-50" : "border-slate-200 bg-white hover:border-red-300"}`}>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rechazados</span>
          <span className="text-2xl font-black text-red-500">{rejectedCount}</span>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 border border-slate-200 bg-white px-3 py-2 rounded-xl flex-1 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-400 transition-all shadow-sm">
          <Search size={15} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Buscar jugador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm w-full text-slate-700 placeholder-slate-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm text-slate-700 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        >
          <option value="all">Todos los estados</option>
          <option value="pending_revision">Pendientes</option>
          <option value="approved">Aprobadas</option>
          <option value="rejected">Rechazados</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <UserPlus size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No hay inscripciones que coincidan</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Jugador</th>
                  <th className="px-4 py-3">Equipo</th>
                  <th className="px-4 py-3">Documentación</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Fecha</th>
                  <th className="px-4 py-3">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(req => (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <a href={`/dashboard/club/jugador/${req.id}`} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                        {req.first_name} {req.last_name}
                      </a>
                      <div className="text-xs text-slate-400 mt-0.5">{req.parent1_phone || req.parent1_email || "–"}</div>
                    </td>
                    <td className="px-4 py-3">
                      {req.teams
                        ? <span className="text-xs font-semibold text-slate-700">{req.teams.name} <span className="text-slate-400">({req.teams.category})</span></span>
                        : <span className="text-xs text-slate-400">Sin equipo</span>}
                    </td>
                    <td className="px-4 py-3">
                      <DocTrafficLight docs={req.player_documents} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.registration_status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(req.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedPlayer(req)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                      >
                        <Eye size={12} /> Ver Expediente
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de expediente */}
      {selectedPlayer && (
        <ExpedienteModal
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  )
}
