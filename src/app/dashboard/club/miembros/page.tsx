"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Users, Search, Loader2, Mail, Shield, User as UserIcon, Archive } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"
import { archivePlayerAction } from "@/app/actions/player-actions"
import Link from "next/link"

interface Member {
  id: string
  first_name: string
  last_name: string
  email: string | null
  role: string
  team_name?: string | null
  team_color?: string | null
  team_id?: string | null
  type: 'staff' | 'player'
}

export default function GlobalMembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [archivingId, setArchivingId] = useState<string | null>(null)
  
  // Stats
  const [stats, setStats] = useState({ total: 0, staff: 0, players: 0 })

  useEffect(() => {
    async function fetchMembers() {
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

        // 1. Fetch Staff (profiles)
        const { data: staffData } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email, role")
          .eq("club_id", profile.club_id)

        // Get Active Season
        const { data: activeSeason } = await supabase
          .from("seasons")
          .select("id")
          .eq("club_id", profile.club_id)
          .eq("is_active", true)
          .single()

        // 2. Fetch Players (via player_season_history instead of players.team_id)
        let playersData: any[] = []
        if (activeSeason) {
          const { data: historyData } = await supabase
            .from("player_season_history")
            .select(`
              team_id,
              players!inner (id, first_name, last_name, email),
              teams!inner (name, color, club_id)
            `)
            .eq("teams.club_id", profile.club_id)
            .eq("season_id", activeSeason.id)
            .neq("status", "inactive")

          if (historyData) {
            playersData = historyData.map((h: any) => ({
              id: h.players.id,
              first_name: h.players.first_name,
              last_name: h.players.last_name,
              email: h.players.email,
              team_id: h.team_id,
              equipos: Array.isArray(h.teams) ? h.teams[0] : h.teams
            }))
          }
        }

        const allMembers: Member[] = []

        if (staffData) {
          staffData.forEach(s => {
            allMembers.push({
              id: s.id,
              first_name: s.first_name || '',
              last_name: s.last_name || '',
              email: s.email,
              role: s.role || 'staff',
              type: 'staff'
            })
          })
        }

        if (playersData) {
          playersData.forEach((p: any) => {
            allMembers.push({
              id: p.id,
              first_name: p.first_name || '',
              last_name: p.last_name || '',
              email: p.email,
              role: 'jugador',
              team_name: p.equipos?.name,
              team_color: p.equipos?.color,
              team_id: p.team_id,
              type: 'player'
            })
          })
        }

        // Sort alphabetical
        allMembers.sort((a, b) => a.last_name.localeCompare(b.last_name))
        setMembers(allMembers)
        
        setStats({
          total: allMembers.length,
          staff: staffData?.length || 0,
          players: playersData?.length || 0
        })

      } catch (err: any) {
        toast.error(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMembers()
  }, [])

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm("¿Seguro que quieres archivar a este miembro? Desaparecerá de las listas pero podrás restaurarlo desde el Archivo Histórico.")) return
    
    setArchivingId(id)
    const result = await archivePlayerAction(id, true)
    
    if (result.success) {
      toast.success("Miembro archivado correctamente")
      setMembers(members.filter(m => m.id !== id))
      setStats(prev => ({...prev, total: prev.total - 1, players: prev.players - 1}))
    } else {
      toast.error(result.error?.message || "Error al archivar")
    }
    setArchivingId(null)
  }

  const filteredMembers = members.filter(m => {
    const searchMatch = `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (m.email && m.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    if (roleFilter === 'all') return searchMatch
    if (roleFilter === 'staff') return searchMatch && m.type === 'staff'
    if (roleFilter === 'jugador') return searchMatch && m.type === 'player'
    return searchMatch && m.role === roleFilter
  })

  const getRoleBadge = (role: string) => {
    switch (role.toLowerCase()) {
      case 'admin':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">Administrador</span>
      case 'coach':
      case 'entrenador':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">Entrenador</span>
      case 'jugador':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">Jugador</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200 capitalize">{role}</span>
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Toaster />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Directorio del Club</h1>
          <p className="text-gray-500 mt-1">Gestión global de todos los miembros y permisos.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/dashboard/club/miembros/archivo" className="inline-flex items-center justify-center gap-2 rounded-md bg-white border border-gray-200 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm font-medium">
            <Archive size={18} />
            <span>Archivo Histórico</span>
          </Link>
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-white hover:bg-blue-700 transition-colors shadow-sm font-medium">
            <Mail size={18} />
            <span>Invitar Staff</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <Users className="text-blue-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Total Miembros</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
            <Shield className="text-purple-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Cuerpo Técnico / Directiva</p>
            <p className="text-2xl font-bold text-gray-900">{stats.staff}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
            <UserIcon className="text-emerald-600 w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Jugadores</p>
            <p className="text-2xl font-bold text-gray-900">{stats.players}</p>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <select 
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2.5 bg-white text-gray-700 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-48"
        >
          <option value="all">Todos los roles</option>
          <option value="staff">Solo Staff</option>
          <option value="jugador">Solo Jugadores</option>
          <option value="admin">Administradores</option>
          <option value="coach">Entrenadores</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-700">
            <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4">Usuario</th>
                <th className="px-6 py-4">Rol en Club</th>
                <th className="px-6 py-4">Equipo Asignado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">Cargando directorio...</p>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-gray-500">
                    No se encontraron miembros con esos filtros.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr 
                    key={member.id} 
                    className={`hover:bg-gray-50/80 transition-colors ${member.type === 'player' && member.team_id ? 'cursor-pointer' : ''}`}
                    onClick={() => {
                      if (member.type === 'player' && member.team_id) {
                        router.push(`/dashboard/equipos/${member.team_id}/jugador/${member.id}`)
                      }
                    }}
                  >
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{member.first_name} {member.last_name}</span>
                        <span className="text-xs text-gray-500 mt-0.5">{member.email || "Sin email"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(member.role)}
                    </td>
                    <td className="px-6 py-4">
                      {member.team_name ? (
                        <div className="flex items-center gap-2">
                          {member.team_color && (
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: member.team_color }}></div>
                          )}
                          <span className="font-medium text-gray-700">{member.team_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm italic">Global / Sin asignar</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-blue-600 hover:text-blue-800 font-medium text-sm px-3 py-1 rounded-md hover:bg-blue-50 transition-colors">
                          Gestionar
                        </button>
                        {member.type === 'player' && (
                          <button 
                            onClick={(e) => handleArchive(e, member.id)}
                            disabled={archivingId === member.id}
                            className="text-red-500 hover:text-red-700 p-1.5 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
                            title="Archivar miembro"
                          >
                            {archivingId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
