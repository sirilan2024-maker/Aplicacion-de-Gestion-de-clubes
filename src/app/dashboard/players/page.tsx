import { createClient } from "@/lib/supabase/server"
import { User, Edit2, Trash2, Search, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { CreatePlayerButton } from "@/components/features/players/create-player-button"
import { DeletePlayerButton } from "@/components/features/players/delete-player-button"
import { formatDate, calculateAge } from "@/lib/utils"

export default async function PlayersPage() {
  const supabase = await createClient()
  
  // Fetch players and teams in parallel
  const [playersRes, teamsRes] = await Promise.all([
    supabase
      .from('players')
      .select(`
        id,
        first_name,
        last_name,
        birth_date,
        relacion_familias(tutor1_nombre, tutor1_telefono),
        team:teams(id, name, color)
      `)
      .order('first_name'),
    supabase.from('teams').select('id, name')
  ])

  const players = playersRes.data?.map(p => {
    const teamData = p.team as any
    const families = p.relacion_familias as any[]
    const firstTutor = families && families.length > 0 ? families[0] : null
    
    return {
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      birthDate: p.birth_date,
      age: calculateAge(p.birth_date),
      team: teamData ? teamData.name : 'Sin equipo',
      teamColor: teamData ? (teamData.color || '#1E40AF') : '#9CA3AF', // default gray for no team
      contact: firstTutor ? `${firstTutor.tutor1_nombre} - ${firstTutor.tutor1_telefono}` : 'Sin contacto'
    }
  }) || []

  const teamsList = teamsRes.data || []

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Jugadores</h1>
          <p className="mt-2 text-gray-500">
            Administra los perfiles de los jugadores y su información de contacto.
          </p>
        </div>
        <CreatePlayerButton teamsList={teamsList} />
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar jugador por nombre o equipo..." className="pl-10" />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Jugador
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Equipo
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Edad
                </th>
                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Contacto (Tutor)
                </th>
                <th scope="col" className="relative px-6 py-4">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {players.map((player) => (
                <tr key={player.id} className="transition-colors hover:bg-gray-50/50 group">
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-medium text-sm">
                        {player.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{player.name}</div>
                        <div className="text-xs text-gray-500">{formatDate(player.birthDate)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: player.teamColor }} 
                      />
                      <span className="text-sm font-medium text-gray-700">{player.team}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {player.age} años
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                    {player.contact}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <DeletePlayerButton id={player.id} name={player.name} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {players.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
              <User className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No hay jugadores</h3>
            <p className="text-gray-500 max-w-sm mt-2 mb-6">
              Aún no hay jugadores registrados en el club. Añade el primer jugador para empezar.
            </p>
            <CreatePlayerButton teamsList={teamsList} />
          </div>
        )}
      </Card>
    </div>
  )
}
