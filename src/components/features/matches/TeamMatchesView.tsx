"use client"

import { useState, useEffect, use } from "react"
import { createClient } from "@/lib/supabase/client"
import { Trophy, Calendar, MapPin, Plus, ChevronRight, Search, Filter, Edit2, X, Save } from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/Skeleton"
import { updateMatchDetails } from "@/app/actions/match-actions"
import { FFCVStandings } from "@/components/features/matches/FFCVStandings"

export function TeamMatchesView({ teamId }: { teamId: string }) {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingMatch, setEditingMatch] = useState<any | null>(null)
  const [viewMode, setViewMode] = useState<'partidos' | 'clasificacion'>('partidos')
  const [ffcvUrl, setFfcvUrl] = useState<string | null>(null)
  const [teamName, setTeamName] = useState<string>("")
  const supabase = createClient()

  useEffect(() => {
    const fetchPartidos = async () => {
      // 1. Obtener el nombre del equipo del coach (tabla equipos)
      const { data: equipoCoach } = await supabase
        .from("equipos")
        .select("name, ffcv_url")
        .eq("id", teamId)
        .single()
        
      if (!equipoCoach) {
        setLoading(false)
        return
      }

      setTeamName(equipoCoach.name)
      setFfcvUrl(equipoCoach.ffcv_url || null)

      // 2. Buscar TODOS los equivalentes en tabla teams (porque puede haber varios)
      const { data: globalTeams } = await supabase
        .from("teams")
        .select("id")
        .ilike("name", equipoCoach.name)
        
      const globalTeamIds = globalTeams?.map(t => t.id) || []
      
      // Añadimos también el ID local por si acaso
      if (!globalTeamIds.includes(teamId)) {
        globalTeamIds.push(teamId)
      }

      // 3. Buscar los partidos
      const { data, error } = await supabase
        .from("partidos")
        .select(`
          *,
          equipo:teams(id, name, color)
        `)
        .in("equipo_id", globalTeamIds)
        .order("fecha_hora", { ascending: false })
      
      if (data) setMatches(data)
      setLoading(false)
    }
    fetchPartidos()
  }, [teamId])

  const filteredMatches = matches.filter(m => 
    m.rival_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.equipo?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const enDirecto = filteredMatches.filter(m => m.estado === 'En Curso' || m.estado === 'Descanso')
  const programados = filteredMatches.filter(m => m.estado === 'Programado')
  const finalizados = filteredMatches.filter(m => m.estado === 'Finalizado')

  const renderMatchCard = (match: any) => (
    <Link href={`/dashboard/equipos/${teamId}/partidos/${match.id}`} key={match.id}>
      <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-gray-200 transition-all hover:shadow-md hover:ring-blue-300 group cursor-pointer">
        <div className="p-5 flex-1 space-y-4">
          <div className="flex justify-between items-start mb-2 relative">
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
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-gray-500 flex items-center">
                <Calendar className="w-4 h-4 mr-1.5" />
                {new Date(match.fecha_hora).toLocaleDateString()} {new Date(match.fecha_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
              <button 
                onClick={(e) => { e.preventDefault(); setEditingMatch(match); }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                title="Editar fecha y hora"
              >
                <Edit2 className="w-4 h-4" />
              </button>
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
    <div className="w-full max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div className="flex items-center gap-3">
          <Trophy className="text-amber-500" size={32} />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Partidos</h1>
            <p className="mt-2 text-sm text-gray-500">
              Gestiona el calendario de competición, convocatorias y resultados.
            </p>
          </div>
        </div>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          Nuevo Partido
        </Button>
      </div>

      {/* Toggle View */}
      <div className="flex justify-center mb-6">
        <div className="bg-slate-100 p-1.5 rounded-full inline-flex">
          <button
            onClick={() => setViewMode('partidos')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
              viewMode === 'partidos'
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Calendario y Resultados
          </button>
          <button
            onClick={() => setViewMode('clasificacion')}
            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
              viewMode === 'clasificacion'
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Clasificación
          </button>
        </div>
      </div>

      {viewMode === 'clasificacion' ? (
        <FFCVStandings ffcvUrl={ffcvUrl} teamName={teamName} />
      ) : (
        <>
          {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Buscar por equipo o rival..." 
            className="pl-10 bg-white" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 bg-white rounded-xl shadow-sm space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="col-span-full bg-slate-50 p-12 text-center rounded-xl border border-dashed border-gray-300">
          <Trophy className="mx-auto text-slate-300 mb-3" size={48} />
          <h3 className="text-lg font-bold text-slate-700">No hay partidos registrados</h3>
          <p className="text-slate-500 mt-1">Pide al administrador que importe los calendarios o crea uno manualmente.</p>
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
      </>
      )}

      {/* MODAL DE EDICIÓN */}
      {editingMatch && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const dateStr = formData.get("date") as string;
              const timeStr = formData.get("time") as string;
              const placeStr = formData.get("place") as string;
              const rivalStr = formData.get("rival") as string;
              
              if (dateStr && timeStr) {
                const combinedISO = new Date(`${dateStr}T${timeStr}`).toISOString();
                
                await updateMatchDetails(editingMatch.id, teamId, {
                  fecha_hora: combinedISO,
                  lugar: placeStr,
                  rival_nombre: rivalStr
                });
                
                // Optimistic update
                setMatches(prev => prev.map(m => m.id === editingMatch.id ? { 
                  ...m, 
                  fecha_hora: combinedISO, 
                  lugar: placeStr,
                  rival_nombre: rivalStr
                } : m));
                
                setEditingMatch(null);
              }
            }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800">Editar Partido</h3>
              <button 
                type="button" 
                onClick={() => setEditingMatch(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rival</label>
                <Input name="rival" defaultValue={editingMatch.rival_nombre} className="font-semibold text-slate-800" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Día</label>
                  <Input type="date" name="date" defaultValue={new Date(editingMatch.fecha_hora).toISOString().split('T')[0]} required className="font-semibold text-slate-800 bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora</label>
                  <Input type="time" name="time" defaultValue={new Date(editingMatch.fecha_hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} required className="font-semibold text-slate-800 bg-white" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lugar</label>
                <Input name="place" defaultValue={editingMatch.lugar} className="font-semibold text-slate-800 bg-white" />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setEditingMatch(null)}>
                Cancelar
              </Button>
              <Button type="submit" className="gap-2 bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4" />
                Guardar Cambios
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
