"use client"

import { useEffect, useState } from "react"
import { Trophy, AlertCircle, RefreshCw, Calendar } from "lucide-react"
import { matchdayStandings } from "@/data/matchday-standings"

interface FFCVStandingsProps {
  ffcvUrl?: string | null;
  teamName: string;
}

export function FFCVStandings({ ffcvUrl, teamName }: FFCVStandingsProps) {
  const [standings, setStandings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const isCadeteA = teamName?.toUpperCase().includes("CADETE A") || teamName?.toUpperCase().includes("CADETE \"A\"");
  
  // Selector de jornada (por defecto '26' o la última disponible)
  const availableJornadas = Object.keys(matchdayStandings).sort((a, b) => parseInt(a) - parseInt(b))
  const [selectedJornada, setSelectedJornada] = useState<string>("26")
  const [mode, setMode] = useState<'historical' | 'live'>(isCadeteA ? 'historical' : 'live')

  const fetchStandings = async () => {
    if (mode === 'historical' && isCadeteA) {
      const historicalData = matchdayStandings[selectedJornada] || []
      setStandings(historicalData.map(item => ({
        position: item.rank,
        team: item.team,
        points: item.points,
        played: item.played,
        won: item.won,
        drawn: item.drawn,
        lost: item.lost,
        gf: item.goals_for,
        gc: item.goals_against,
        goal_diff: item.goal_diff
      })))
      setLoading(false)
      return
    }

    if (!ffcvUrl) {
      setStandings([])
      setLoading(false)
      return
    }
    
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ffcv-scraper?url=${encodeURIComponent(ffcvUrl)}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Error al cargar la clasificación")
      }
      
      setStandings(data.data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStandings()
  }, [selectedJornada, mode, ffcvUrl])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header con controles */}
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap gap-3 justify-between items-center">
        <div className="flex items-center space-x-3">
          <h3 className="font-bold text-slate-800 flex items-center text-base">
            <Trophy className="w-5 h-5 text-amber-500 mr-2" />
            Clasificación del Grupo
          </h3>

          {/* Selector de modo Histórico vs FFCV En Vivo */}
          {isCadeteA && (
            <div className="inline-flex bg-slate-200 p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setMode('historical')}
                className={`px-3 py-1 rounded-md transition-all ${
                  mode === 'historical' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Por Jornadas
              </button>
              {ffcvUrl && (
                <button
                  onClick={() => setMode('live')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    mode === 'live' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  En Vivo (FFCV)
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Selector de Jornadas (si está en modo histórico) */}
        {mode === 'historical' && (
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">Jornada:</span>
            <select
              value={selectedJornada}
              onChange={(e) => setSelectedJornada(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 text-xs font-bold rounded-lg px-2.5 py-1 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              {availableJornadas.map(j => (
                <option key={j} value={j}>
                  Jornada {j}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'live' && (
          <button 
            onClick={fetchStandings} 
            className="text-xs flex items-center text-slate-500 hover:text-blue-600 transition-colors bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Actualizar FFCV
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-500 font-medium">Cargando clasificación...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-8 text-center border-b border-red-200">
          <AlertCircle className="mx-auto text-red-400 mb-3" size={32} />
          <h3 className="text-lg font-bold text-red-800">Error al obtener datos en vivo</h3>
          <p className="text-red-600 mt-1 text-xs">{error}</p>
          <button 
            onClick={() => setMode('historical')}
            className="mt-4 px-4 py-2 bg-white text-red-600 rounded-md border border-red-200 text-xs font-medium"
          >
            Ver clasificación por Jornadas
          </button>
        </div>
      ) : standings.length === 0 ? (
        <div className="bg-slate-50 p-12 text-center border-b border-gray-200">
          <h3 className="text-lg font-bold text-slate-700">No hay datos para esta jornada</h3>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 uppercase">
              <tr>
                <th className="px-4 py-3 font-semibold text-center w-12">Pos</th>
                <th className="px-4 py-3 font-semibold">Equipo</th>
                <th className="px-4 py-3 font-semibold text-center w-16 text-blue-700">Pts</th>
                <th className="px-4 py-3 font-semibold text-center w-12" title="Jugados">PJ</th>
                <th className="px-4 py-3 font-semibold text-center w-12 hidden md:table-cell" title="Ganados">PG</th>
                <th className="px-4 py-3 font-semibold text-center w-12 hidden md:table-cell" title="Empatados">PE</th>
                <th className="px-4 py-3 font-semibold text-center w-12 hidden md:table-cell" title="Perdidos">PP</th>
                <th className="px-4 py-3 font-semibold text-center w-12 hidden lg:table-cell" title="Goles a Favor">GF</th>
                <th className="px-4 py-3 font-semibold text-center w-12 hidden lg:table-cell" title="Goles en Contra">GC</th>
                <th className="px-4 py-3 font-semibold text-center w-12 hidden lg:table-cell" title="Diferencia de Goles">DG</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {standings.map((row, idx) => {
                const isOurTeam = row.team?.toLowerCase().includes("sporting") || row.team?.toLowerCase().includes("saladar") || row.team?.toLowerCase().includes(teamName.toLowerCase())
                
                return (
                  <tr 
                    key={idx} 
                    className={`hover:bg-slate-50 transition-colors ${isOurTeam ? 'bg-blue-50/70 border-l-4 border-l-blue-600' : ''}`}
                  >
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold text-xs ${
                        (row.position || (idx + 1)) === 1 ? 'bg-amber-400 text-amber-950 shadow-sm' :
                        (row.position || (idx + 1)) === 2 ? 'bg-slate-300 text-slate-900 shadow-sm' :
                        (row.position || (idx + 1)) === 3 ? 'bg-orange-300 text-orange-950 shadow-sm' :
                        isOurTeam ? 'bg-blue-600 text-white shadow-sm' :
                        'text-slate-600'
                      }`}>
                        {row.position || (idx + 1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${isOurTeam ? 'text-blue-900 font-bold' : 'text-slate-800'}`}>
                        {row.team || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-extrabold text-slate-900 text-base bg-slate-50/50">
                      {row.points ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-700">{row.played ?? '-'}</td>
                    <td className="px-4 py-3 text-center text-emerald-700 hidden md:table-cell font-bold">{row.won ?? '-'}</td>
                    <td className="px-4 py-3 text-center text-amber-700 hidden md:table-cell">{row.drawn ?? '-'}</td>
                    <td className="px-4 py-3 text-center text-rose-600 hidden md:table-cell">{row.lost ?? '-'}</td>
                    <td className="px-4 py-3 text-center text-slate-600 hidden lg:table-cell">{row.gf ?? '-'}</td>
                    <td className="px-4 py-3 text-center text-slate-600 hidden lg:table-cell">{row.gc ?? '-'}</td>
                    <td className={`px-4 py-3 text-center hidden lg:table-cell font-bold ${
                      (row.goal_diff || 0) > 0 ? 'text-emerald-600' : (row.goal_diff || 0) < 0 ? 'text-rose-600' : 'text-slate-500'
                    }`}>
                      {(row.goal_diff || 0) > 0 ? `+${row.goal_diff}` : (row.goal_diff ?? 0)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

