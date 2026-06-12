"use client"

import { useEffect, useState } from "react"
import { Trophy, AlertCircle, RefreshCw } from "lucide-react"

interface FFCVStandingsProps {
  ffcvUrl?: string | null;
  teamName: string;
}

export function FFCVStandings({ ffcvUrl, teamName }: FFCVStandingsProps) {
  const [standings, setStandings] = useState<any[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStandings = async () => {
    if (!ffcvUrl) return;
    
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/ffcv-scraper?url=${encodeURIComponent(ffcvUrl)}`)
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || "Error al cargar la clasificación")
      }
      
      setStandings(data.data)
      setHeaders(data.rawHeaders || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (ffcvUrl) {
      fetchStandings()
    } else {
      setLoading(false)
    }
  }, [ffcvUrl])

  if (!ffcvUrl) {
    return (
      <div className="bg-slate-50 p-12 text-center rounded-xl border border-dashed border-gray-300">
        <Trophy className="mx-auto text-slate-300 mb-3" size={48} />
        <h3 className="text-lg font-bold text-slate-700">Enlace FFCV no configurado</h3>
        <p className="text-slate-500 mt-1 max-w-md mx-auto">
          Para ver la clasificación real, ve a la configuración de este equipo en la pestaña "Equipos" y añade el Enlace Público de la competición de la FFCV.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-gray-100 shadow-sm">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Sincronizando con FFCV...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 p-8 text-center rounded-xl border border-red-200">
        <AlertCircle className="mx-auto text-red-400 mb-3" size={32} />
        <h3 className="text-lg font-bold text-red-800">Error al obtener datos</h3>
        <p className="text-red-600 mt-1">{error}</p>
        <button 
          onClick={fetchStandings}
          className="mt-4 px-4 py-2 bg-white text-red-600 rounded-md border border-red-200 font-medium hover:bg-red-50 transition-colors"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (standings.length === 0) {
    return (
      <div className="bg-slate-50 p-12 text-center rounded-xl border border-dashed border-gray-300">
        <h3 className="text-lg font-bold text-slate-700">No se encontraron equipos</h3>
        <p className="text-slate-500 mt-1">Es posible que la competición aún no haya empezado o la URL no sea correcta.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center">
          <Trophy className="w-5 h-5 text-amber-500 mr-2" />
          Clasificación Oficial
        </h3>
        <button 
          onClick={fetchStandings} 
          className="text-xs flex items-center text-slate-500 hover:text-blue-600 transition-colors bg-white px-2 py-1 rounded border border-slate-200"
        >
          <RefreshCw className="w-3 h-3 mr-1" />
          Actualizar
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 font-semibold text-center w-12">Pos</th>
              <th className="px-4 py-3 font-semibold">Equipo</th>
              <th className="px-4 py-3 font-semibold text-center w-16">Puntos</th>
              <th className="px-4 py-3 font-semibold text-center w-12 hidden sm:table-cell" title="Jugados">J</th>
              <th className="px-4 py-3 font-semibold text-center w-12 hidden md:table-cell" title="Ganados">G</th>
              <th className="px-4 py-3 font-semibold text-center w-12 hidden md:table-cell" title="Empatados">E</th>
              <th className="px-4 py-3 font-semibold text-center w-12 hidden md:table-cell" title="Perdidos">P</th>
              <th className="px-4 py-3 font-semibold text-center w-12 hidden lg:table-cell" title="Goles a Favor">GF</th>
              <th className="px-4 py-3 font-semibold text-center w-12 hidden lg:table-cell" title="Goles en Contra">GC</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {standings.map((row, idx) => {
              const isOurTeam = row.team?.toLowerCase().includes(teamName.toLowerCase())
              
              return (
                <tr 
                  key={idx} 
                  className={`hover:bg-slate-50 transition-colors ${isOurTeam ? 'bg-blue-50/50' : ''}`}
                >
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-bold ${
                      idx === 0 ? 'bg-amber-100 text-amber-700' :
                      idx === 1 ? 'bg-slate-200 text-slate-700' :
                      idx === 2 ? 'bg-orange-100 text-orange-800' :
                      isOurTeam ? 'bg-blue-100 text-blue-700' :
                      'text-slate-600'
                    }`}>
                      {row.position || (idx + 1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      {row.logo && (
                        <img src={row.logo} alt="Logo" className="w-6 h-6 mr-3 object-contain" />
                      )}
                      <span className={`font-medium ${isOurTeam ? 'text-blue-700 font-bold' : 'text-slate-700'}`}>
                        {row.team || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-900 text-base">
                    {row.points || '-'}
                  </td>
                  <td className="px-4 py-3 text-center text-slate-600 hidden sm:table-cell">{row.played || '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-600 hidden md:table-cell">{row.won || '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-600 hidden md:table-cell">{row.drawn || '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-600 hidden md:table-cell">{row.lost || '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-600 hidden lg:table-cell">{row.gf || '-'}</td>
                  <td className="px-4 py-3 text-center text-slate-600 hidden lg:table-cell">{row.gc || '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
