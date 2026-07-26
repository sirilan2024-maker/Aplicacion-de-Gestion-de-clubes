"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, Shirt, CheckCircle2, Clock, X } from "lucide-react"
import toast from "react-hot-toast"
import { getApparelForPlayerAction } from "@/app/actions/apparel-actions"

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

export default function PlayerApparelPage() {
  const params = useParams()
  const playerId = typeof params.playerId === 'string' ? params.playerId : ''

  const [loading, setLoading] = useState(true)
  const [apparel, setApparel] = useState<{ [itemName: string]: { size: string, delivered: boolean, delivered_at: string | null } }>({})
  const [dorsal, setDorsal] = useState("")
  const [showGuide, setShowGuide] = useState(false)
  const [activeTab, setActiveTab] = useState<'junior' | 'unisex' | 'mujer'>('junior')

  useEffect(() => {
    if (playerId) loadApparel()
  }, [playerId])

  const loadApparel = async () => {
    setLoading(true)
    const res = await getApparelForPlayerAction(playerId)
    if (res.success && res.data) {
      setApparel(res.data)
      setDorsal(res.dorsal || "")
    } else {
      toast.error('Error al cargar tallas: ' + res.error)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  const items = Object.values(apparel)
  const deliveredCount = items.filter(i => i.delivered).length
  const totalCount = APPAREL_ITEMS.length
  const percentDelivered = totalCount > 0 ? Math.round((deliveredCount / totalCount) * 100) : 0

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 animate-in fade-in duration-300">
      {/* CABECERA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Shirt size={22} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight">Equipación y Tallas de Ropa</h1>
            <p className="text-slate-500 text-sm mt-0.5">Tallas solicitadas y estado de entrega. Los cambios son gestionados por el utillero del club.</p>
          </div>
        </div>
        <button
          onClick={() => setShowGuide(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-all shadow-sm shrink-0"
        >
          📏 Ver Guía de Tallas
        </button>
      </div>

      {/* PROGRESO DE ENTREGA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              📦 Estado de Entrega de Equipación
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">El utillero del club irá marcando los artículos conforme los entregue.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-600 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl">
              {deliveredCount} de {totalCount} entregados
            </span>
            <span className="text-xs font-black text-blue-700 bg-blue-50 border border-blue-100 px-3 py-1 rounded-xl">
              {percentDelivered}%
            </span>
          </div>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${percentDelivered}%` }}
          />
        </div>
      </div>

      {/* ARTÍCULOS POR GRUPO */}
      <div className="space-y-6">
        {GROUPS.map(group => {
          const groupItems = APPAREL_ITEMS.filter(item => item.group === group)
          return (
            <div key={group} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <h3 className="font-bold text-sm text-slate-700 uppercase tracking-wider">{group}</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {groupItems.map(item => {
                  const info = apparel[item.key] || { size: '', delivered: false, delivered_at: null }
                  const isDelivered = info.delivered

                  return (
                    <div key={item.key} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-0.5">
                        <span className="font-bold text-sm text-slate-800">{item.label}</span>
                        {isDelivered && (
                          <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                            <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                            Entregado{info.delivered_at ? ` el ${new Date(info.delivered_at).toLocaleDateString('es-ES')}` : ''}
                          </p>
                        )}
                        {!isDelivered && info.size && (
                          <p className="text-[11px] text-amber-600 flex items-center gap-1">
                            <Clock size={12} className="shrink-0" />
                            Pendiente de entrega por el utillero
                          </p>
                        )}
                        {!isDelivered && !info.size && (
                          <p className="text-[11px] text-slate-400">Sin talla registrada</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {info.size ? (
                          <span className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-sm font-bold">
                            Talla: {info.size}
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 text-sm">
                            Sin asignar
                          </span>
                        )}
                        {isDelivered ? (
                          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1">
                            <CheckCircle2 size={12} /> Entregado
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold rounded-lg flex items-center gap-1">
                            <Clock size={12} /> Pendiente
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

      {dorsal && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-600 text-white flex items-center justify-center text-2xl font-black shadow">
            {dorsal}
          </div>
          <div>
            <p className="font-bold text-blue-900 text-sm">Número de Dorsal Asignado</p>
            <p className="text-xs text-blue-700 mt-0.5">Este número será impreso en tu equipación oficial.</p>
          </div>
        </div>
      )}

      {/* MODAL DE GUIA DE TALLAS */}
      {showGuide && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xl">📏</span>
                <h3 className="font-bold text-lg text-slate-800">Guía de Tallas Oficial (Hummel)</h3>
              </div>
              <button onClick={() => setShowGuide(false)} className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex border-b border-slate-100 bg-slate-50/20">
              {(['junior', 'unisex', 'mujer'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
                    activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'junior' ? '👦 Junior (Niños)' : tab === 'unisex' ? '👕 Hombre / Unisex' : '👚 Mujer'}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {activeTab === 'junior' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">El tallaje infantil se basa directamente en la estatura total en centímetros del niño.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[['116', '5-6 años (~116 cm)'], ['128', '7-8 años (~128 cm)'], ['140', '9-10 años (~140 cm)'], ['152', '11-12 años (~152 cm)'], ['164', '13-14 años (~164 cm)'], ['176', '15-16 años (~176 cm)']].map(([t, d]) => (
                      <div key={t} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                        <span className="font-bold text-slate-700">Talla {t}</span>
                        <span className="text-slate-500 text-xs">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {activeTab === 'unisex' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">Corresponde a la estructura estándar para camisetas, sudaderas, chaquetas y pantalones de corte masculino o recto.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead><tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200"><th className="py-2.5 px-3">Talla EU</th><th className="py-2.5 px-3">Pecho (cm)</th><th className="py-2.5 px-3">Cintura (cm)</th><th className="py-2.5 px-3">Cadera (cm)</th></tr></thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {[['S','94','82','97'],['M','99','87','102'],['L','104','92','107'],['XL','110','98','113'],['2XL','116','104','119'],['3XL','~122','~110','~125']].map(([t,p,c,ca]) => (
                          <tr key={t}><td className="py-2.5 px-3 font-bold">{t}</td><td className="py-2.5 px-3">{p} cm</td><td className="py-2.5 px-3">{c} cm</td><td className="py-2.5 px-3">{ca} cm</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {activeTab === 'mujer' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">Diseñado con un patrón entallado específico para jugadoras de corte femenino.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead><tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200"><th className="py-2.5 px-3">Talla EU</th><th className="py-2.5 px-3">Pecho (cm)</th><th className="py-2.5 px-3">Cintura (cm)</th><th className="py-2.5 px-3">Cadera (cm)</th></tr></thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {[['XS','84','64','88'],['S','88','68','92'],['M','92','72','96'],['L','96','76','100'],['XL','101','80','104']].map(([t,p,c,ca]) => (
                          <tr key={t}><td className="py-2.5 px-3 font-bold">{t}</td><td className="py-2.5 px-3">{p} cm</td><td className="py-2.5 px-3">{c} cm</td><td className="py-2.5 px-3">{ca} cm</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="font-bold text-sm text-slate-800 block mb-1">🧦 Tallas de Calzado para Medias</span>
                <p className="text-xs text-slate-600">Las medias oficiales utilizan las siguientes correspondencias de número de pie: <span className="font-bold text-blue-600 ml-1">28-32, 33-35, 36-38, 39-42 y 43-46</span>.</p>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setShowGuide(false)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-sm transition-colors">
                Cerrar Guía
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
