"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { FFCVStandings } from "@/components/features/matches/FFCVStandings"
import { GlobalMatchesView } from "@/components/features/matches/GlobalMatchesView"
import { TeamDisciplineView } from "@/components/features/matches/TeamDisciplineView"
import { Trophy, AlertCircle } from "lucide-react"

export function TeamMatchesView({ teamId }: { teamId: string }) {
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'partidos' | 'clasificacion' | 'disciplina'>('partidos')
  const [ffcvUrl, setFfcvUrl] = useState<string | null>(null)
  const [teamName, setTeamName] = useState<string>("")
  const [globalTeamId, setGlobalTeamId] = useState<string | null>(null)

  const [data, setData] = useState({
    matches: [] as any[],
    teams: [] as any[],
    equipos: [] as any[],
    players: [] as any[],
    convocatorias: [] as any[]
  })

  const supabase = createClient()

  useEffect(() => {
    const fetchAllData = async () => {
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
      const { data: globalTeamsData } = await supabase
        .from("teams")
        .select("*")
        
      const matchingGlobalTeam = globalTeamsData?.find(t => t.name.toLowerCase() === equipoCoach.name.toLowerCase());
      const gTeamId = matchingGlobalTeam ? matchingGlobalTeam.id : teamId;
      setGlobalTeamId(gTeamId);

      // 3. Fetch all needed for GlobalMatchesView
      const [
        { data: partidosData },
        { data: equiposData },
        { data: playersData },
        { data: convocatoriasData }
      ] = await Promise.all([
        supabase.from("partidos").select(`*, equipo:teams(id, name, color)`).order("fecha_hora", { ascending: false }),
        supabase.from("equipos").select("*"),
        supabase.from("players").select("*").neq("status", "inactive"),
        supabase.from("convocatorias").select("*")
      ])

      setData({
        matches: partidosData || [],
        teams: globalTeamsData || [],
        equipos: equiposData || [],
        players: playersData || [],
        convocatorias: convocatoriasData || []
      })
      
      setLoading(false)
    }
    
    fetchAllData()
  }, [teamId, supabase])

  if (loading) {
    return (
      <div className="w-full max-w-6xl mx-auto p-6 flex justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Toggle View */}
      <div className="flex justify-center mb-6">
        <div className="flex flex-col sm:flex-row bg-slate-100 p-1.5 rounded-2xl sm:rounded-full w-full sm:w-auto gap-1 sm:gap-0">
          <button
            onClick={() => setViewMode('partidos')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl sm:rounded-full text-sm font-bold transition-all ${
              viewMode === 'partidos'
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Calendario y Resultados
          </button>
          <button
            onClick={() => setViewMode('clasificacion')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl sm:rounded-full text-sm font-bold transition-all ${
              viewMode === 'clasificacion'
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Clasificación
          </button>
          <button
            onClick={() => setViewMode('disciplina')}
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl sm:rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              viewMode === 'disciplina'
                ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <AlertCircle size={16} /> Disciplina
          </button>
        </div>
      </div>

      {viewMode === 'clasificacion' ? (
        <FFCVStandings ffcvUrl={ffcvUrl} teamName={teamName} />
      ) : viewMode === 'disciplina' ? (
        <div className="pt-2">
          <TeamDisciplineView 
            matches={data.matches}
            players={data.players}
            convocatorias={data.convocatorias}
            teamId={teamId}
          />
        </div>
      ) : (
        <div className="pt-2">
          {globalTeamId && (
            <GlobalMatchesView 
              initialMatches={data.matches}
              teams={data.teams}
              equipos={data.equipos}
              players={data.players}
              convocatorias={data.convocatorias}
              fixedTeamId={globalTeamId}
            />
          )}
        </div>
      )}
    </div>
  )
}
