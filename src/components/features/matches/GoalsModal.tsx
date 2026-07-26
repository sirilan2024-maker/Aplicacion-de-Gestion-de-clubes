import { X, Trophy, Calendar, MapPin } from "lucide-react"

interface GoalsModalProps {
  player: { first_name: string; last_name: string; id: string }
  matchHistory: any[] // From convocatorias, joined with partidos
  totalGoals: number
  onClose: () => void
}

export function GoalsModal({ player, matchHistory, totalGoals, onClose }: GoalsModalProps) {
  // Filter matches where the player scored goals
  const goalMatches = matchHistory
    .filter(m => (m.goles || 0) > 0)
    .sort((a, b) => new Date((b.partidos as any)?.fecha_hora || 0).getTime() - new Date((a.partidos as any)?.fecha_hora || 0).getTime());

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Trophy size={20} className="text-emerald-500" />
              Informe de Goles
            </h2>
            <p className="text-sm text-slate-500">Historial goleador de {player.first_name} {player.last_name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto bg-white flex-1">
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center">
              <p className="text-sm font-bold text-slate-500 uppercase">Total Goles</p>
              <p className="text-4xl font-black text-emerald-600">{totalGoals}</p>
            </div>
            <div className="w-px h-12 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-sm font-bold text-slate-500 uppercase">Partidos Marcando</p>
              <p className="text-4xl font-black text-emerald-600">{goalMatches.length}</p>
            </div>
          </div>

          {goalMatches.length === 0 ? (
            <div className="text-center p-10 bg-slate-50 rounded-xl border border-slate-100">
              <Trophy size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Aún no hay goles registrados en partidos oficiales.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 text-sm mb-3">Partidos donde ha marcado:</h3>
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Fecha</th>
                      <th className="px-5 py-3">Partido</th>
                      <th className="px-5 py-3 text-center">Goles Marcados</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {goalMatches.map((m: any, idx: number) => {
                      const matchData = m.partidos as any;
                      const isHome = matchData?.lugar === 'Local';
                      const rivalName = matchData?.rival_nombre || 'Desconocido';
                      const matchDate = matchData?.fecha_hora ? new Date(matchData.fecha_hora) : null;
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-5 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                              <Calendar size={14} className="text-slate-400" />
                              {matchDate ? matchDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-bold text-slate-800">
                              {isHome ? `vs ${rivalName}` : `@ ${rivalName}`}
                            </div>
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={12} /> {isHome ? 'Local' : 'Visitante'}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold border border-emerald-200">
                              {m.goles}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition-all text-sm shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
