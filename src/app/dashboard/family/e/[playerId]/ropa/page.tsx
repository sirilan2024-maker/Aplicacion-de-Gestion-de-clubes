"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2, Shirt, Info, CheckCircle2, Clock, X } from "lucide-react"
import toast from "react-hot-toast"
import { getApparelForPlayerAction, updatePlayerApparelSizesAction } from "@/app/actions/apparel-actions"

const CLOTHING_SIZES = [
  'Talla 116',
  'Talla 128',
  'Talla 140',
  'Talla 152',
  'Talla 164',
  'Talla 176',
  'XS',
  'S',
  'M',
  'L',
  'XL',
  '2XL',
  '3XL'
]

const SOCKS_SIZES = [
  '28-32',
  '33-35',
  '36-38',
  '39-42',
  '43-46'
]

const APPAREL_ITEMS = [
  { key: 'Camiseta de Juego', label: '👕 Camiseta de Juego', isSocks: false },
  { key: 'Pantalón de Juego', label: '🩳 Pantalón de Juego', isSocks: false },
  { key: 'Medias', label: '🧦 Medias', isSocks: true },
  { key: 'Chándal Oficial', label: '🧥 Chándal Oficial', isSocks: false },
  { key: 'Camiseta de Entrenamiento', label: '👕 Camiseta de Entrenamiento', isSocks: false },
  { key: 'Pantalón de Entrenamiento', label: '🩳 Pantalón de Entrenamiento', isSocks: false },
  { key: 'Sudadera', label: '🧥 Sudadera', isSocks: false },
  { key: 'Camiseta de paseo', label: '👕 Camiseta de paseo', isSocks: false },
  { key: 'Pantalón de paseo', label: '🩳 Pantalón de paseo', isSocks: false },
  { key: 'Mochila', label: '🎒 Mochila', isSocks: false }
]

export default function PlayerApparelPage() {
  const params = useParams()
  const playerId = typeof params.playerId === 'string' ? params.playerId : ''

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [apparel, setApparel] = useState<{ [itemName: string]: { size: string, delivered: boolean, delivered_at: string | null } }>({})
  const [formSizes, setFormSizes] = useState<{ [itemName: string]: string }>({})
  const [dorsal, setDorsal] = useState("")
  const [formDorsal, setFormDorsal] = useState("")
  const [showGuide, setShowGuide] = useState(false)
  const [activeTab, setActiveTab] = useState<'junior' | 'unisex' | 'mujer'>('junior')

  useEffect(() => {
    if (playerId) {
      loadApparel()
    }
  }, [playerId])

  const loadApparel = async () => {
    setLoading(true)
    const res = await getApparelForPlayerAction(playerId)
    if (res.success && res.data) {
      setApparel(res.data)
      const initialSizes: { [key: string]: string } = {}
      Object.entries(res.data).forEach(([key, val]) => {
        initialSizes[key] = val.size
      })
      setFormSizes(initialSizes)
      setDorsal(res.dorsal || "")
      setFormDorsal(res.dorsal || "")
    } else {
      toast.error('Error al cargar tallas: ' + res.error)
    }
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const res = await updatePlayerApparelSizesAction(playerId, formSizes, formDorsal)
    if (res.success) {
      toast.success('Información de equipación guardada correctamente')
      loadApparel()
    } else {
      toast.error('Error al guardar: ' + res.error)
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    )
  }

  // Comprobar si hay cambios
  const isJerseyDelivered = apparel['Camiseta de Juego']?.delivered || false
  const hasChanges = formDorsal !== dorsal || APPAREL_ITEMS.some(item => {
    const original = apparel[item.key]?.size || ''
    const current = formSizes[item.key] || ''
    const isDelivered = apparel[item.key]?.delivered || false
    return !isDelivered && original !== current
  })

  // Estadísticas del checklist de entrega
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
            <p className="text-slate-500 text-sm mt-0.5">Introduce tus tallas y número de camiseta y sigue el progreso de la entrega.</p>
          </div>
        </div>
        
        <button
          onClick={() => setShowGuide(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-all shadow-sm shrink-0"
        >
          📏 Ver Guía de Tallas
        </button>
      </div>

      {/* CHECKLIST DE ENTREGA */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              📦 Checklist de Entrega de Ropa
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">Tus artículos oficiales son entregados por el utillero del club de forma individual.</p>
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

        {/* PROGRESS BAR */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div 
            className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
            style={{ width: `${percentDelivered}%` }}
          ></div>
        </div>

        {/* CHECKLIST ITEMS GRID */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
          {APPAREL_ITEMS.map(item => {
            const info = apparel[item.key] || { size: '', delivered: false, delivered_at: null }
            const isDelivered = info.delivered

            return (
              <div 
                key={item.key} 
                className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                  isDelivered 
                    ? 'bg-emerald-50/40 border-emerald-200 text-emerald-800' 
                    : 'bg-slate-50/40 border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold truncate">{item.label}</span>
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                    isDelivered ? 'bg-emerald-600 text-white' : 'border border-slate-300 bg-white text-transparent'
                  }`}>
                    ✓
                  </span>
                </div>
                <span className="text-[10px] font-black uppercase mt-1">
                  {info.size ? `Talla: ${info.size}` : 'Sin definir'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FORMULARIO */}
        <form onSubmit={handleSave} className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                📋 Registro de Tallas e Información
              </h2>
              <span className="text-xs text-slate-500 font-medium">10 artículos oficiales</span>
            </div>

            {/* DORSAL / NUMERO */}
            <div className="p-4 md:p-6 bg-blue-50/30 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="font-bold text-sm text-blue-900 block">🔢 Número de Camiseta (Dorsal)</span>
                <p className="text-[11px] text-blue-700/80 mt-0.5">Elige tu dorsal para la impresión de la equipación.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={3}
                  value={formDorsal}
                  onChange={(e) => setFormDorsal(e.target.value.replace(/[^0-9]/g, ''))}
                  disabled={isJerseyDelivered}
                  placeholder="Ej: 10"
                  className="w-24 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-black text-blue-900 placeholder-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                {isJerseyDelivered && (
                  <span className="text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-200 font-extrabold uppercase px-2 py-1 rounded-md shrink-0">
                    Bloqueado
                  </span>
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-100 p-4 md:p-6 space-y-4 md:space-y-0">
              {APPAREL_ITEMS.map(item => {
                const info = apparel[item.key] || { size: '', delivered: false, delivered_at: null }
                const isDelivered = info.delivered

                return (
                  <div key={item.key} className="py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="space-y-0.5">
                      <span className="font-bold text-sm text-slate-800">{item.label}</span>
                      {isDelivered && (
                        <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                          Entregado el {new Date(info.delivered_at || '').toLocaleDateString('es-ES')}
                        </p>
                      )}
                      {!isDelivered && info.size && (
                        <p className="text-[11px] text-amber-600 flex items-center gap-1">
                          <Clock size={12} className="shrink-0" />
                          Pendiente de entrega por el utillero
                        </p>
                      )}
                      {!isDelivered && !info.size && (
                        <p className="text-[11px] text-slate-400">Sin talla seleccionada</p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {isDelivered ? (
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 text-sm font-bold">
                            Talla: {info.size}
                          </span>
                          <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold rounded-lg flex items-center gap-1">
                            <CheckCircle2 size={12} /> Entregado
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 w-full md:w-auto">
                          <select
                            value={formSizes[item.key] || ''}
                            onChange={(e) => setFormSizes({ ...formSizes, [item.key]: e.target.value })}
                            className="w-full md:w-40 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700 font-semibold"
                          >
                            <option value="">Selecciona talla...</option>
                            {(item.isSocks ? SOCKS_SIZES : CLOTHING_SIZES).map(sz => (
                              <option key={sz} value={sz}>{sz}</option>
                            ))}
                          </select>
                          <span className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-extrabold uppercase tracking-wider rounded-md flex items-center gap-0.5 shrink-0">
                            <Clock size={10} /> Pendiente
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* BOTON DE GUARDAR */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/10"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar Tallas y Dorsal
            </button>
          </div>
        </form>

        {/* COLUMNA DE INFORMACIÓN */}
        <div className="space-y-6">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-2 text-slate-800">
              <Info className="w-5 h-5 text-blue-600 shrink-0" />
              <h3 className="font-bold text-sm">Información Importante</h3>
            </div>
            
            <ul className="space-y-3 text-xs text-slate-600 leading-relaxed list-disc list-inside">
              <li>Elige tu número de camiseta preferido antes de que la equipación de juego sea estampada y entregada.</li>
              <li>Una vez que el utillero marque la <strong>Camiseta de Juego 👕</strong> como entregada, no se podrá modificar tu número de dorsal en este panel.</li>
              <li>Configura las tallas lo antes posible para que el utillero pueda gestionar el pedido oficial del club.</li>
              <li>Si necesitas un cambio una vez entregado, deberás contactar directamente con el utillero.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* MODAL DE GUIA DE TALLAS */}
      {showGuide && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="p-4 md:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="text-xl">📏</span>
                <h3 className="font-bold text-lg text-slate-800">Guía de Tallas Oficial (Hummel)</h3>
              </div>
              <button 
                onClick={() => setShowGuide(false)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Selector de Pestañas del Modal */}
            <div className="flex border-b border-slate-100 bg-slate-50/20">
              <button
                onClick={() => setActiveTab('junior')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'junior' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                👦 Junior (Niños)
              </button>
              <button
                onClick={() => setActiveTab('unisex')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'unisex' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                👕 Hombre / Unisex
              </button>
              <button
                onClick={() => setActiveTab('mujer')}
                className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'mujer' 
                    ? 'border-blue-600 text-blue-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                👚 Mujer
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="p-5 overflow-y-auto space-y-4">
              {activeTab === 'junior' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">El tallaje infantil se basa directamente en la estatura total en centímetros del niño.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-700">Talla 116</span>
                      <span className="text-slate-500 text-xs">5-6 años (Altura ~116 cm)</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-700">Talla 128</span>
                      <span className="text-slate-500 text-xs">7-8 años (Altura ~128 cm)</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-700">Talla 140</span>
                      <span className="text-slate-500 text-xs">9-10 años (Altura ~140 cm)</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-700">Talla 152</span>
                      <span className="text-slate-500 text-xs">11-12 años (Altura ~152 cm)</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-700">Talla 164</span>
                      <span className="text-slate-500 text-xs">13-14 años (Altura ~164 cm)</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center text-sm">
                      <span className="font-bold text-slate-700">Talla 176</span>
                      <span className="text-slate-500 text-xs">15-16 años (Altura ~176 cm)</span>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'unisex' && (
                <div className="space-y-4">
                  <p className="text-xs text-slate-500">Corresponde a la estructura estándar para camisetas, sudaderas, chaquetas y pantalones de corte masculino o recto.</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <th className="py-2.5 px-3">Talla EU</th>
                          <th className="py-2.5 px-3">Pecho (cm)</th>
                          <th className="py-2.5 px-3">Cintura (cm)</th>
                          <th className="py-2.5 px-3">Cadera (cm)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="py-2.5 px-3 font-bold">S</td>
                          <td className="py-2.5 px-3">94 cm</td>
                          <td className="py-2.5 px-3">82 cm</td>
                          <td className="py-2.5 px-3">97 cm</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold">M</td>
                          <td className="py-2.5 px-3">99 cm</td>
                          <td className="py-2.5 px-3">87 cm</td>
                          <td className="py-2.5 px-3">102 cm</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold">L</td>
                          <td className="py-2.5 px-3">104 cm</td>
                          <td className="py-2.5 px-3">92 cm</td>
                          <td className="py-2.5 px-3">107 cm</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold">XL</td>
                          <td className="py-2.5 px-3">110 cm</td>
                          <td className="py-2.5 px-3">98 cm</td>
                          <td className="py-2.5 px-3">113 cm</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold">2XL / XXL</td>
                          <td className="py-2.5 px-3">116 cm</td>
                          <td className="py-2.5 px-3">104 cm</td>
                          <td className="py-2.5 px-3">119 cm</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold">3XL</td>
                          <td className="py-2.5 px-3">~122 cm</td>
                          <td className="py-2.5 px-3">~110 cm</td>
                          <td className="py-2.5 px-3">~125 cm</td>
                        </tr>
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
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                          <th className="py-2.5 px-3">Talla EU</th>
                          <th className="py-2.5 px-3">Pecho (cm)</th>
                          <th className="py-2.5 px-3">Cintura (cm)</th>
                          <th className="py-2.5 px-3">Cadera (cm)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        <tr>
                          <td className="py-2.5 px-3 font-bold">XS</td>
                          <td className="py-2.5 px-3">84 cm</td>
                          <td className="py-2.5 px-3">64 cm</td>
                          <td className="py-2.5 px-3">88 cm</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold">S</td>
                          <td className="py-2.5 px-3">88 cm</td>
                          <td className="py-2.5 px-3">68 cm</td>
                          <td className="py-2.5 px-3">92 cm</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold">M</td>
                          <td className="py-2.5 px-3">92 cm</td>
                          <td className="py-2.5 px-3">72 cm</td>
                          <td className="py-2.5 px-3">96 cm</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold">L</td>
                          <td className="py-2.5 px-3">96 cm</td>
                          <td className="py-2.5 px-3">76 cm</td>
                          <td className="py-2.5 px-3">100 cm</td>
                        </tr>
                        <tr>
                          <td className="py-2.5 px-3 font-bold">XL</td>
                          <td className="py-2.5 px-3">101 cm</td>
                          <td className="py-2.5 px-3">80 cm</td>
                          <td className="py-2.5 px-3">104 cm</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Talla Medias footer */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="font-bold text-sm text-slate-800 block mb-1">🧦 Tallas de Calzado para Medias</span>
                <p className="text-xs text-slate-600">
                  Las medias oficiales utilizan las siguientes correspondencias de número de pie:
                  <span className="font-bold text-blue-600 ml-1">28-32, 33-35, 36-38, 39-42 y 43-46</span>.
                </p>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowGuide(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-sm transition-colors"
              >
                Cerrar Guía
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
