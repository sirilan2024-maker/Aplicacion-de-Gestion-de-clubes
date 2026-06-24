"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Search, Loader2, ArrowLeft, RefreshCw, User as UserIcon, Trash2 } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"
import { deletePlayerAction, reactivatePlayerAction } from "@/app/actions/player-actions"
import Link from "next/link"
import { Dialog } from "@/components/ui/dialog"

interface ArchivedMember {
  id: string
  first_name: string
  last_name: string
  email: string | null
  team_id?: string | null
  team_name?: string | null
  team_color?: string | null
  season_id?: string | null
}

export default function ArchivedMembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<ArchivedMember[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [reactivatingPlayer, setReactivatingPlayer] = useState<ArchivedMember | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<string>("unassigned")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [seasons, setSeasons] = useState<any[]>([])
  const [seasonFilter, setSeasonFilter] = useState<string>("all")

  useEffect(() => {
    fetchArchived()
  }, [])

  async function fetchArchived() {
    setLoading(true)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("No autenticado")

      const { data: profile } = await supabase
        .from("profiles")
        .select("club_id")
        .eq("id", user.id)
        .single()

      if (!profile?.club_id) throw new Error("Usuario sin club asignado")

      // Fetch all seasons for the club
      const { data: seasonsData } = await supabase
        .from("seasons")
        .select("id, name, is_active")
        .eq("club_id", profile.club_id)
        .order("start_date", { ascending: false })
      
      if (seasonsData) {
        setSeasons(seasonsData)
      }

      // Fetch active season teams
      const activeSeason = seasonsData?.find(s => s.is_active)
      if (activeSeason?.id) {
        const { data: teamsData } = await supabase.from('teams').select('id, name').eq('season_id', activeSeason.id).order('name')
        setTeams(teamsData || [])
      }

      const { data: playersData } = await supabase
        .from("players")
        .select(`
          id, first_name, last_name, email, team_id,
          teams (name, color, season_id)
        `)
        .eq("club_id", profile.club_id)
        .in("status", ["inactive", "archived"]) // Incluimos ambos por si acaso

      const { data: historyData } = await supabase
        .from("player_season_history")
        .select(`
          player_id, 
          season_id,
          team_id,
          teams (name, color)
        `)
        .eq("club_id", profile.club_id)

      const playerHistory = new Map<string, any>()
      if (historyData) {
        historyData.forEach((h: any) => {
          const team = Array.isArray(h.teams) ? h.teams[0] : h.teams;
          playerHistory.set(h.player_id, {
            season_id: h.season_id,
            team_id: h.team_id,
            team_name: team?.name,
            team_color: team?.color
          })
        })
      }

      const archivedList: ArchivedMember[] = []

      if (playersData) {
        playersData.forEach((p: any) => {
          const hist = playerHistory.get(p.id);
          archivedList.push({
            id: p.id,
            first_name: p.first_name || '',
            last_name: p.last_name || '',
            email: p.email,
            team_id: hist?.team_id || p.team_id,
            team_name: hist?.team_name || p.teams?.name,
            team_color: hist?.team_color || p.teams?.color,
            season_id: hist?.season_id || p.teams?.season_id || null,
          })
        })
      }

      archivedList.sort((a, b) => a.last_name.localeCompare(b.last_name))
      setMembers(archivedList)

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReactivate = async () => {
    if (!reactivatingPlayer) return
    setIsSubmitting(true)
    
    const teamId = selectedTeam === "unassigned" ? null : selectedTeam
    const result = await reactivatePlayerAction(reactivatingPlayer.id, teamId)
    
    if (result.success) {
      toast.success("Jugador reactivado correctamente")
      setMembers(members.filter(m => m.id !== reactivatingPlayer.id))
      setReactivatingPlayer(null)
    } else {
      toast.error("Error al reactivar: " + (result.error?.message || "Error desconocido"))
    }
    
    setIsSubmitting(false)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm("⚠️ ATENCIÓN: ¿Seguro que quieres eliminar definitivamente a este jugador? Desaparecerá del archivo histórico, aunque sus estadísticas pasadas seguirán contanto para no romper el historial del equipo.")) return
    
    setDeletingId(id)
    const result = await deletePlayerAction(id)
    
    if (result.success) {
      toast.success("Jugador eliminado definitivamente")
      setMembers(members.filter(m => m.id !== id))
    } else {
      toast.error(result.error?.message || "Error al eliminar")
    }
    setDeletingId(null)
  }

  const filteredMembers = members.filter(m => {
    if (m.first_name.includes("[ELIMINADO]")) return false
    const searchMatch = `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase()))
    if (!searchMatch) return false
    
    if (seasonFilter !== "all") {
      if (m.season_id !== seasonFilter) return false
    }

    return true
  })

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Toaster />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/club/miembros" className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-900">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Archivo Histórico</h1>
            <p className="text-gray-500 mt-1">Jugadores inactivos o dados de baja temporalmente.</p>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar en el archivo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <select 
          value={seasonFilter}
          onChange={e => setSeasonFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
        >
          <option value="all">Todas las temporadas</option>
          {seasons.map(s => (
            <option key={s.id} value={s.id}>{s.name} {s.is_active ? '(Activa)' : ''}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Último Equipo</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Buscando en el archivo...</p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-16 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <UserIcon className="w-12 h-12 text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">El archivo está vacío</p>
                      <p className="text-sm">No hay jugadores archivados en este momento.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr 
                    key={member.id} 
                    className={`hover:bg-gray-50/80 transition-colors ${member.team_id ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (member.team_id) {
                        router.push(`/dashboard/equipos/${member.team_id}/jugador/${member.id}`)
                      }
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <Link 
                          href={`/dashboard/club/jugador/${member.id}`}
                          className="font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {member.first_name} {member.last_name}
                        </Link>
                        <span className="text-xs text-gray-500 mt-0.5">{member.email || "Sin email"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {member.team_name ? (
                        <div className="flex items-center gap-2 opacity-70">
                          {member.team_color && (
                            <div className="w-2.5 h-2.5 rounded-full grayscale" style={{ backgroundColor: member.team_color }}></div>
                          )}
                          <span className="font-medium text-gray-700">{member.team_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">Sin asignar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setReactivatingPlayer(member)
                            setSelectedTeam("unassigned")
                          }}
                          disabled={deletingId === member.id}
                          className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 font-medium text-sm px-3 py-1.5 rounded-md hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Reactivar
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, member.id)}
                          disabled={deletingId === member.id}
                          className="inline-flex items-center gap-1.5 text-red-500 hover:text-red-700 font-medium text-sm px-2 py-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                          title="Eliminar definitivamente"
                        >
                          {deletingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog 
        isOpen={!!reactivatingPlayer} 
        onClose={() => setReactivatingPlayer(null)}
        title={`Reactivar a ${reactivatingPlayer?.first_name || ''}`}
        description="Selecciona el equipo de la temporada actual al que quieres asignar a este jugador."
      >
        <div className="py-4">
          <select 
            value={selectedTeam} 
            onChange={(e) => setSelectedTeam(e.target.value)}
            className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="unassigned" className="font-semibold">Sin Equipo (Dejar global)</option>
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button 
            className="px-4 py-2 border border-slate-200 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors"
            onClick={() => setReactivatingPlayer(null)}
          >
            Cancelar
          </button>
          <button 
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            onClick={handleReactivate} 
            disabled={isSubmitting}
          >
            {isSubmitting ? "Guardando..." : "Confirmar Reactivación"}
          </button>
        </div>
      </Dialog>
    </div>
  )
}
