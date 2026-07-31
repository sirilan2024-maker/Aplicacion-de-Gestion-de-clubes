"use client"

import { useState } from "react"
import { updateLiveAd, LiveAd } from "@/app/actions/ad-actions"
import { CheckCircle, Loader2, Save } from "lucide-react"

export function LiveAdManager({ initialAd }: { initialAd: LiveAd | null }) {
  const [ad, setAd] = useState<LiveAd>(initialAd || {
    text: "bet365",
    url: "https://www.bet365.es",
    imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Bet365_Logo.svg/1280px-Bet365_Logo.svg.png",
    isActive: true
  })
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleSave = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    try {
      const result = await updateLiveAd(ad)
      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || "Error al guardar la publicidad")
      }
    } catch (e) {
      setError("Error de red al guardar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-900">Configuración de Publicidad en Directo</h2>
        <p className="text-sm text-slate-500 mt-1">
          Gestiona el banner que aparece encima de los partidos en la página pública de resultados en directo.
        </p>
      </div>
      
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={ad.isActive}
              onChange={(e) => setAd({...ad, isActive: e.target.checked})}
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
          <span className="text-sm font-semibold text-slate-700">
            {ad.isActive ? 'Publicidad Activada' : 'Publicidad Desactivada'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Texto Alternativo / Nombre</label>
            <input 
              type="text"
              value={ad.text}
              onChange={e => setAd({...ad, text: e.target.value})}
              placeholder="Ej: Patrocinador Local"
              className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Enlace (URL)</label>
            <input 
              type="url"
              value={ad.url}
              onChange={e => setAd({...ad, url: e.target.value})}
              placeholder="https://..."
              className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">URL de la Imagen (Logo)</label>
            <input 
              type="url"
              value={ad.imageUrl}
              onChange={e => setAd({...ad, imageUrl: e.target.value})}
              placeholder="https://.../logo.png"
              className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <p className="text-xs text-slate-500">Deja esto en blanco si prefieres mostrar solo el texto.</p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex-1">
            {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
            {success && (
              <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> Guardado correctamente
              </p>
            )}
          </div>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Guardar Cambios
          </button>
        </div>
      </div>
      
      {/* Vista Previa */}
      <div className="bg-slate-100 p-6 border-t border-slate-200">
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Vista Previa</h3>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm inline-block min-w-[250px]">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Gestionado por</span>
            {ad.isActive ? (
              ad.url ? (
                <a href={ad.url} target="_blank" rel="noopener noreferrer" className="shrink-0 pointer-events-none">
                  {ad.imageUrl ? (
                    <img src={ad.imageUrl} alt={ad.text} className="h-6 object-contain" />
                  ) : (
                    <span className="bg-emerald-700 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">{ad.text}</span>
                  )}
                </a>
              ) : (
                <span className="shrink-0">
                  {ad.imageUrl ? (
                    <img src={ad.imageUrl} alt={ad.text} className="h-6 object-contain" />
                  ) : (
                    <span className="bg-emerald-700 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-sm">{ad.text}</span>
                  )}
                </span>
              )
            ) : (
              <span className="text-xs text-slate-400 italic">Desactivado</span>
            )}
            <span className="text-[8px] text-slate-300 font-bold ml-1">AD</span>
          </div>
        </div>
      </div>
    </div>
  )
}
