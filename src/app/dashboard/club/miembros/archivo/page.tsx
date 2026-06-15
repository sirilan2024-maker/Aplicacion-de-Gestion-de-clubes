"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Search, Loader2, ArrowLeft, RefreshCw, User as UserIcon, Trash2 } from "lucide-react"
import toast, { Toaster } from "react-hot-toast"
import { archivePlayerAction, deletePlayerAction } from "@/app/actions/player-actions"
import Link from "next/link"

interface ArchivedMember {
  id: string
  first_name: string
  last_name: string
  email: string | null
  team_id?: string | null
  team_name?: string | null
  team_color?: string | null
}

export default function ArchivedMembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<ArchivedMember[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
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

        const { data: playersData } = await supabase
          .from("players")
          .select(`
            id, first_name, last_name, email, team_id,
            equipos (name, color)
          `)
          .eq("club_id", profile.club_id)
          .eq("status", "inactive")

        const archivedList: ArchivedMember[] = []

        if (playersData) {
          playersData.forEach((p: any) => {
            archivedList.push({
              id: p.id,
              first_name: p.first_name || '',
              last_name: p.last_name || '',
              email: p.email,
              team_id: p.team_id,
              team_name: p.equipos?.name,
              team_color: p.equipos?.color,
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

    fetchArchived()
  }, [])

  const handleRestore = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm("¿Seguro que quieres restaurar a este jugador? Volverá a aparecer en su equipo y en todas las listas.")) return
    
    setRestoringId(id)
    const result = await archivePlayerAction(id, false)
    
    if (result.success) {
      toast.success("Jugador restaurado correctamente")
      setMembers(members.filter(m => m.id !== id))
    } else {
      toast.error(result.error?.message || "Error al restaurar")
    }
    setRestoringId(null)
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
    return searchMatch
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

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar en el archivo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
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
                        <span className="font-semibold text-gray-900 line-through text-opacity-80">{member.first_name} {member.last_name}</span>
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
                          onClick={(e) => handleRestore(e, member.id)}
                          disabled={restoringId === member.id || deletingId === member.id}
                          className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-800 font-medium text-sm px-3 py-1.5 rounded-md hover:bg-emerald-50 transition-colors disabled:opacity-50"
                        >
                          {restoringId === member.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                          Restaurar
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, member.id)}
                          disabled={deletingId === member.id || restoringId === member.id}
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
    </div>
  )
}
