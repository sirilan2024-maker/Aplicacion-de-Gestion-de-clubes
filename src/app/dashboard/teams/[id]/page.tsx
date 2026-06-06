import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ChevronLeft, Users, User } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate, calculateAge } from "@/lib/utils"
import { CopyInviteButton } from "@/components/features/teams/CopyInviteButton"

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // Obtener detalles del equipo (incluye invite_code)
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select(`
      *,
      invite_code,
      coach:profiles(first_name, last_name)
    `)
    .eq('id', id)
    .single()

  if (teamError || !team) {
    notFound()
  }

  // Obtener plantilla del equipo
  const { data: players } = await supabase
    .from('players')
    .select(`
      id,
      first_name,
      last_name,
      birth_date,
      posicion_principal,
      num_licencia_fed
    `)
    .eq('team_id', id)
    .order('first_name')

  const coachName = team.coach ? `${(team.coach as any).first_name} ${(team.coach as any).last_name}` : 'Sin entrenador asignado'

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Link 
        href="/dashboard/teams" 
        className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Volver a Equipos
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div 
          className="h-3 w-full" 
          style={{ backgroundColor: team.color || '#1E40AF' }}
        />
        <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div 
              className="w-16 h-16 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: team.color || '#1E40AF' }}
            >
              <Users className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">{team.name}</h1>
                <Badge variant="secondary">{team.category}</Badge>
              </div>
              <p className="text-gray-500 flex items-center gap-2">
                <span className="font-medium">Entrenador:</span> {coachName}
              </p>
            </div>
          </div>
          <div className="flex gap-4 text-center bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase font-semibold">Jugadores</p>
              <p className="text-2xl font-bold text-gray-900">{players?.length || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column layout: players table + invite card ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Players table — ocupa 2/3 en desktop */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            Plantilla
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Jugador
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Edad
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Posición
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Licencia
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {players?.map((player) => (
                <tr key={player.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                        {player.first_name[0]}{player.last_name[0]}
                      </div>
                      <span className="font-medium text-gray-900">
                        {player.first_name} {player.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {calculateAge(player.birth_date)} años
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant="outline" className="bg-gray-50">
                      {player.posicion_principal || 'No definida'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {player.num_licencia_fed || '-'}
                  </td>
                </tr>
              ))}
              
              {(!players || players.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    No hay jugadores en este equipo todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>

        {/* Invite card — ocupa 1/3 en desktop */}
        <div className="space-y-4">
          {team.invite_code ? (
            <CopyInviteButton
              inviteCode={team.invite_code}
              teamName={team.name}
            />
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-center text-sm text-gray-400">
              Este equipo aún no tiene código de invitación. Aplica la migración
              <span className="font-mono font-medium"> 00011_invite_codes.sql</span> en Supabase.
            </div>
          )}
        </div>

      </div>{/* end two-column grid */}
    </div>
  )
}
