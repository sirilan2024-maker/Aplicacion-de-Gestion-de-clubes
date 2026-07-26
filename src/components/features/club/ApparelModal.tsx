import { useState } from "react"
import { Shirt, CheckCircle2, Clock, X } from "lucide-react"

interface ApparelModalProps {
  player: { first_name: string; last_name: string; id: string }
  apparelData: { [key: string]: any }
  apparelStats: { total: number; delivered: number }
  onClose: () => void
}

const APPAREL_ITEMS = [
  { key: 'Camiseta de Juego', label: '👕 Camiseta de Juego', group: 'Competición', isSocks: false },
  { key: 'Pantalón de Juego', label: '🩳 Pantalón de Juego', group: 'Competición', isSocks: false },
  { key: 'Medias', label: '🧦 Medias', group: 'Competición', isSocks: true },
  { key: 'Camiseta de Entrenamiento (1/2)', label: '👕 Camiseta de Entrenamiento (1/2)', group: 'Entrenamiento', isSocks: false },
  { key: 'Camiseta de Entrenamiento (2/2)', label: '👕 Camiseta de Entrenamiento (2/2)', group: 'Entrenamiento', isSocks: false },
  { key: 'Pantalón de Entrenamiento (1/2)', label: '🩳 Pantalón de Entrenamiento (1/2)', group: 'Entrenamiento', isSocks: false },
  { key: 'Pantalón de Entrenamiento (2/2)', label: '🩳 Pantalón de Entrenamiento (2/2)', group: 'Entrenamiento', isSocks: false },
  { key: 'Chándal Oficial', label: '🧥 Chándal Oficial', group: 'Paseo', isSocks: false },
  { key: 'Sudadera', label: '🧥 Sudadera', group: 'Entrenamiento', isSocks: false },
  { key: 'Camiseta de paseo', label: '👕 Camiseta de paseo', group: 'Paseo', isSocks: false },
  { key: 'Pantalón de paseo', label: '🩳 Pantalón de paseo', group: 'Paseo', isSocks: false },
  { key: 'Mochila', label: '🎒 Mochila', group: 'Accesorios', isSocks: false },
]

const GROUPS = ['Competición', 'Entrenamiento', 'Paseo', 'Accesorios']

export function ApparelModal({ player, apparelData, apparelStats, onClose }: ApparelModalProps) {
  const percentDelivered = apparelStats.total > 0 ? Math.round((apparelStats.delivered / apparelStats.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Estado de Equipación</h2>
            <p className="text-sm text-slate-500">Equipación de {player.first_name} {player.last_name}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto bg-white">
          {/* PROGRESO DE ENTREGA */}
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 mb-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                  📦 Progreso de Entrega
                </h3>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1 rounded-xl">
                  {apparelStats.delivered} de {apparelStats.total} entregados
                </span>
                <span className="text-xs font-black text-yellow-700 bg-yellow-100 border border-yellow-200 px-3 py-1 rounded-xl">
                  {percentDelivered}%
                </span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-white rounded-full overflow-hidden border border-slate-200">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${percentDelivered}%` }}
              />
            </div>
          </div>

          {/* ARTÍCULOS POR GRUPO */}
          <div className="space-y-4">
            {GROUPS.map(group => {
              const groupItems = APPAREL_ITEMS.filter(item => item.group === group)
              if (groupItems.length === 0) return null;
              
              return (
                <div key={group} className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                    <h3 className="font-bold text-xs text-slate-600 uppercase tracking-wider">{group}</h3>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {groupItems.map(item => {
                      const info = apparelData?.[item.key] || { size: '', delivered: false, delivered_at: null }
                      const isDelivered = info.delivered

                      return (
                        <div key={item.key} className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                          <div className="space-y-1">
                            <span className="font-bold text-sm text-slate-800">{item.label}</span>
                            {isDelivered && (
                              <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
                                <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                Entregado{info.delivered_at ? ` el ${new Date(info.delivered_at).toLocaleDateString('es-ES')}` : ''}
                              </p>
                            )}
                            {!isDelivered && info.size && (
                              <p className="text-[11px] font-medium text-amber-600 flex items-center gap-1">
                                <Clock size={12} className="shrink-0" />
                                Pendiente de entrega
                              </p>
                            )}
                            {!isDelivered && !info.size && (
                              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                Sin talla registrada
                              </p>
                            )}
                          </div>

                          <div className="shrink-0">
                            {info.size ? (
                              <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-xs font-bold shadow-sm">
                                Talla: {info.size}
                              </span>
                            ) : (
                              <span className="px-3 py-1.5 bg-white border border-slate-100 border-dashed rounded-lg text-slate-400 text-xs font-medium">
                                No def.
                              </span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
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
