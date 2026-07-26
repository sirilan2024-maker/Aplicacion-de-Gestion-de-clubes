"use client"

import React, { useEffect, useState } from "react"
import { Loader2, ShoppingBag, CheckCircle, Clock } from "lucide-react"
import toast from "react-hot-toast"
import { getApparelForPlayerAction } from "@/app/actions/apparel-actions"

const APPAREL_ITEMS = [
  { key: 'Camiseta de Juego', label: '👕 Camiseta Juego', group: 'Competición' },
  { key: 'Pantalón de Juego', label: '🩳 Pantalón Juego', group: 'Competición' },
  { key: 'Medias', label: '🧦 Medias', group: 'Competición' },
  { key: 'Camiseta de Entrenamiento (1/2)', label: '👕 Camiseta Entrenamiento (1/2)', group: 'Entrenamiento' },
  { key: 'Camiseta de Entrenamiento (2/2)', label: '👕 Camiseta Entrenamiento (2/2)', group: 'Entrenamiento' },
  { key: 'Pantalón de Entrenamiento (1/2)', label: '🩳 Pantalón Entrenamiento (1/2)', group: 'Entrenamiento' },
  { key: 'Pantalón de Entrenamiento (2/2)', label: '🩳 Pantalón Entrenamiento (2/2)', group: 'Entrenamiento' },
  { key: 'Chándal Oficial', label: '🧥 Chándal Oficial', group: 'Paseo' },
  { key: 'Sudadera', label: '🧥 Sudadera', group: 'Entrenamiento' },
  { key: 'Camiseta de paseo', label: '👕 Camiseta Paseo', group: 'Paseo' },
  { key: 'Pantalón de paseo', label: '🩳 Pantalón Paseo', group: 'Paseo' },
  { key: 'Mochila', label: '🎒 Mochila', group: 'Accesorios' },
]

const GROUPS = ['Competición', 'Entrenamiento', 'Paseo', 'Accesorios']

export function UtileriaTab({ playerId }: { playerId: string }) {
  const [loading, setLoading] = useState(true)
  const [sizes, setSizes] = useState<{ [key: string]: string }>({})
  const [deliveredStatus, setDeliveredStatus] = useState<{ [key: string]: boolean }>({})

  useEffect(() => {
    loadApparel()
  }, [playerId])

  const loadApparel = async () => {
    setLoading(true)
    const res = await getApparelForPlayerAction(playerId)
    if (res.success && res.data) {
      const loadedSizes: { [key: string]: string } = {}
      const loadedDelivered: { [key: string]: boolean } = {}
      
      APPAREL_ITEMS.forEach(item => {
        const itemData = res.data[item.key]
        if (itemData) {
          loadedSizes[item.key] = itemData.size || ''
          loadedDelivered[item.key] = itemData.delivered || false
        }
      })
      setSizes(loadedSizes)
      setDeliveredStatus(loadedDelivered)
    } else {
      toast.error('Error al cargar tallas: ' + res.error)
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <ShoppingBag className="w-6 h-6 text-indigo-600" />
        <div>
          <h3 className="text-lg font-bold text-gray-900">Equipación y Material</h3>
          <p className="text-sm text-gray-500">
            Tallas solicitadas y estado de entrega. Los cambios se gestionan desde el panel de Utillería.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {GROUPS.map(group => {
            const groupItems = APPAREL_ITEMS.filter(item => item.group === group)
            if (groupItems.length === 0) return null
            return (
              <div key={group}>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{group}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {groupItems.map((item) => (
                    <div
                      key={item.key}
                      className={`p-4 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        deliveredStatus[item.key]
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                        <p className="text-lg font-black text-gray-900 mt-0.5">
                          {sizes[item.key] || <span className="text-gray-400 font-normal text-sm">Sin asignar</span>}
                        </p>
                      </div>
                      <div className="shrink-0">
                        {deliveredStatus[item.key] ? (
                          <span className="flex flex-col items-center gap-1 text-emerald-700">
                            <CheckCircle className="w-6 h-6" />
                            <span className="text-[10px] font-bold uppercase">Entregado</span>
                          </span>
                        ) : (
                          <span className="flex flex-col items-center gap-1 text-amber-500">
                            <Clock className="w-6 h-6" />
                            <span className="text-[10px] font-bold uppercase">Pendiente</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
    </div>
  )
}
