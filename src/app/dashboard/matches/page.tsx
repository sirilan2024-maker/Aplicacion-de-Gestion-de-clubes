"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter, Calendar, MapPin, Trophy, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Partido } from "@/types/matches"
import { Skeleton } from '@/components/ui/Skeleton';
import Link from "next/link"

export default function MatchesPage() {
  const [matches, setMatches] = useState<Partido[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const supabase = createClient()

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('partidos')
      .select(`
        *,
        equipo:teams(id, name, color)
      `)
      .order('fecha_hora', { ascending: true })
    
    const { data: teamsData } = await supabase.from('equipos').select('id, name')
    
    if (data) {
      setMatches(data as Partido[])
    }
    if (teamsData) {
      setTeams(teamsData)
    }
    setIsLoading(false)
  }

  const filteredMatches = matches.filter(match => {
    const matchesSearch = match.rival_nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (match.equipo?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
                          
    let matchesTeam = selectedTeam === "all";
    if (!matchesTeam && selectedTeam !== "all") {
      const selectedTeamName = teams.find(t => t.id === selectedTeam)?.name;
      // Compatibilidad: Comparamos por nombre porque los partidos antiguos referencian IDs de la tabla vieja 'teams'
      matchesTeam = match.equipo_id === selectedTeam || 
                   (match.equipo?.name && selectedTeamName && match.equipo.name.toLowerCase() === selectedTeamName.toLowerCase());
    }
    
    return matchesSearch && matchesTeam;
  })

  // Simular partidos en directo para la demo (Cualquier partido programado de hoy o los primeros)
  const enDirecto = filteredMatches.filter(m => m.estado === 'Programado').slice(0, 2) // Mostramos 2 simulados si los hay
  const programados = filteredMatches.filter(m => m.estado === 'Programado' && !enDirecto.includes(m))
  const finalizados = filteredMatches.filter(m => m.estado === 'Finalizado').reverse() // Mostrar los más recientes primero

  const renderMatchCard = (match: Partido) => (
    <Link href={`/dashboard/matches/${match.id}`} key={match.id}>
      <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-blue-300 group cursor-pointer">
        <div className="p-5 flex-1 space-y-4">
          <div className="flex justify-between items-start mb-2">
            <Badge 
              variant="outline" 
              className={
                match.estado === 'Programado' 
                  ? "bg-amber-50 text-amber-700 border-amber-200" 
                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
              }
            >
              {match.estado}
            </Badge>
            <div className="text-sm font-medium text-gray-500 flex items-center">
              <Calendar className="w-4 h-4 mr-1.5" />
              {new Date(match.fecha_hora).toLocaleDateString()}
            </div>
          </div>
          
          <div className="flex justify-between items-center py-2">
            <div className="flex flex-col items-center flex-1 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-2 shadow-sm border border-slate-200">
                <div 
                  className="w-4 h-4 rounded-full" 
                  style={{ backgroundColor: match.equipo?.color || '#3b82f6' }}
                />
              </div>
              <span className="font-bold text-gray-900 leading-tight">{match.equipo?.name || 'Mi Equipo'}</span>
            </div>
            
            <div className="flex flex-col items-center px-4">
              {match.estado === 'Finalizado' ? (
                <div className="flex items-center gap-2 text-2xl font-black text-gray-900 bg-gray-50 px-4 py-1.5 rounded-lg border border-gray-100">
                  <span>{match.resultado_propio}</span>
                  <span className="text-gray-400 font-medium">-</span>
                  <span>{match.resultado_rival}</span>
                </div>
              ) : (
                <div className="text-sm font-bold text-gray-400 bg-gray-50 px-3 py-1 rounded-full uppercase tracking-widest border border-gray-100">VS</div>
              )}
            </div>

            <div className="flex flex-col items-center flex-1 text-center">
              <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-2 shadow-sm border border-red-100 text-red-500 font-bold text-lg">
                {match.rival_nombre.substring(0, 1).toUpperCase()}
              </div>
              <span className="font-bold text-gray-900 leading-tight">{match.rival_nombre}</span>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-50 flex justify-between items-center text-sm text-gray-500">
            <div className="flex items-center">
              <MapPin className="w-4 h-4 mr-1.5 text-gray-400" />
              {match.lugar}
            </div>
            <div className="flex items-center text-blue-600 font-medium group-hover:translate-x-1 transition-transform">
              {match.estado === 'Programado' ? 'Gestionar Convocatoria' : 'Ver Estadísticas'}
              <ChevronRight className="w-4 h-4 ml-0.5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Partidos</h1>
          <p className="mt-2 text-sm text-gray-500">
            Gestiona el calendario de competición, convocatorias y resultados.
          </p>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Nuevo Partido
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar por equipo o rival..." 
            className="pl-10 text-slate-900" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="px-4 py-2 bg-white text-slate-900 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
        >
          <option value="all">Todos los equipos</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <Button variant="outline" className="gap-2 bg-white">
          <Filter className="h-4 w-4" />
          Más Filtros
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 bg-white rounded-xl shadow-sm space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-200 shadow-sm flex flex-col items-center justify-center">
          <Trophy className="h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No hay partidos</h3>
          <p className="mt-2 text-sm text-gray-500 max-w-sm">
            {matches.length === 0 
              ? "Aún no se han registrado partidos en el club." 
              : "No se han encontrado partidos para este equipo o criterio de búsqueda."}
          </p>
          <Button className="mt-6 gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Nuevo Partido
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {enDirecto.length > 0 && (
            <section className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black tracking-tight text-slate-900 flex items-center">
                  <span className="relative flex h-3 w-3 mr-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  Simulcast: En Directo
                </h2>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1 rounded-full uppercase tracking-widest border border-red-100">
                  {enDirecto.length} partidos activos
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {enDirecto.map(renderMatchCard)}
              </div>
            </section>
          )}

          {programados.length > 0 && (
            <section>
              <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-4 flex items-center mt-8">
                <span className="w-2 h-6 bg-amber-500 rounded-full mr-2"></span>
                Próximos Partidos
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {programados.map(renderMatchCard)}
              </div>
            </section>
          )}

          {finalizados.length > 0 && (
            <section>
              <h2 className="text-xl font-bold tracking-tight text-gray-900 mb-4 flex items-center mt-8">
                <span className="w-2 h-6 bg-emerald-500 rounded-full mr-2"></span>
                Resultados
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {finalizados.map(renderMatchCard)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
