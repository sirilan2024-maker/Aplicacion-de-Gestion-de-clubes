"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { FFCVStandings } from "@/components/features/matches/FFCVStandings"
import { GlobalMatchesView } from "@/components/features/matches/GlobalMatchesView"
import { TeamDisciplineView } from "@/components/features/matches/TeamDisciplineView"
import { Trophy, AlertCircle } from "lucide-react"

export function TeamMatchesView({ teamId }: { teamId: string }) {
  const searchParams = useSearchParams()
  const initialView = (searchParams.get('view') as any) || 'partidos'
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'partidos' | 'clasificacion' | 'disciplina'>(initialView)
  const [ffcvUrl, setFfcvUrl] = useState<string | null>(null)
  const [teamName, setTeamName] = useState<string>("")
  const [globalTeamId, setGlobalTeamId] = useState<string | null>(null)
  const [apercibidosCount, setApercibidosCount] = useState<number>(0)

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
        .from('teams')
        .select("name, ffcv_url")
        .eq("id", teamId)
        .single()
        
      if (!equipoCoach) {
        setLoading(false)
        return
      }

      setTeamName(equipoCoach.name)
      setFfcvUrl(equipoCoach.ffcv_url || null)

      setGlobalTeamId(teamId);

      // 3. Fetch all needed for GlobalMatchesView
      const [
        { data: partidosData },
        { data: equiposData },
        { data: playersData },
        { data: convocatoriasData }
      ] = await Promise.all([
        supabase.from("partidos").select(`*, equipo:teams(id, name, color)`).order("fecha_hora", { ascending: false }),
        supabase.from('teams').select("*"),
        supabase.from("players").select("*").neq("status", "inactive"),
        supabase.from("convocatorias").select("*")
      ])

      setData({
        matches: partidosData || [],
        teams: equiposData || [],
        equipos: equiposData || [],
        players: playersData || [],
        convocatorias: convocatoriasData || []
      })
      
      // Calculate apercibidos
      const validPlayers = (playersData || []).filter((p: any) => p.team_id === teamId && !(p.posicion || '').toLowerCase().includes('entrenador') && !(p.posicion || '').toLowerCase().includes('delegado'))
      let localApercibidosCount = 0;
      
      validPlayers.forEach((player: any) => {
        const playerConvs = (convocatoriasData || []).filter((c: any) => c.player_id === player.id)
        const rawEvents: any[] = []
        playerConvs.forEach((conv: any) => {
          const match = (partidosData || []).find((m: any) => m.id === conv.partido_id)
          if (match && (conv.yellow_cards > 0 || conv.red_cards > 0)) {
            rawEvents.push({ match, yellow: conv.yellow_cards || 0 })
          }
        })
        const chrono = [...rawEvents].sort((a, b) => new Date(a.match.fecha_hora).getTime() - new Date(b.match.fecha_hora).getTime())
        let cycleCards = 0;
        chrono.forEach(evt => {
          if (evt.yellow === 1) {
            cycleCards += 1;
            if (cycleCards === 5) cycleCards = 0;
          }
        })
        if (cycleCards === 4) localApercibidosCount++;
      })
      
      setApercibidosCount(localApercibidosCount);
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
            className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl sm:rounded-full text-sm font-bold transition-all flex items-center justify-center gap-2 relative ${
              viewMode === 'disciplina'
                ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-200/50'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <AlertCircle size={16} /> Disciplina
            {apercibidosCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                !
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Banner de Apercibidos */}
      {viewMode === 'partidos' && apercibidosCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl p-4 gap-4 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-full">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h4 className="font-bold text-orange-900 text-sm sm:text-base">Jugadores Apercibidos</h4>
              <p className="text-xs sm:text-sm text-orange-700">
                Tienes {apercibidosCount} jugador{apercibidosCount > 1 ? 'es' : ''} a punto de cumplir ciclo de tarjetas amarillas.
              </p>
            </div>
          </div>
          <button
            onClick={() => setViewMode('disciplina')}
            className="w-full sm:w-auto px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold rounded-xl transition-colors shadow-sm"
          >
            Ver Detalles
          </button>
        </div>
      )}

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
