"use client"

import { useState, useRef } from "react"
import { uploadAdImage, saveLiveAds, LiveAd } from "@/app/actions/ad-actions"
import { CheckCircle, Loader2, Save, Upload, Plus, Trash2, Edit2, MoveUp, MoveDown } from "lucide-react"
import { useRouter } from "next/navigation"

export function LiveAdManager({ initialAds }: { initialAds: LiveAd[] | null }) {
  const router = useRouter()
  const [ads, setAds] = useState<LiveAd[]>(initialAds || [])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Current editing ad state
  const [currentAd, setCurrentAd] = useState<LiveAd>({
    id: Date.now().toString(),
    text: "",
    description: "",
    textLayout: "overlay",
    url: "",
    imageUrl: "",
    isActive: true
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddNew = () => {
    setCurrentAd({
      id: Date.now().toString(),
      text: "",
      description: "",
      textLayout: "overlay",
      url: "",
      imageUrl: "",
      isActive: true
    })
    setLogoPreview(null)
    setEditingIndex(ads.length)
  }

  const handleEdit = (index: number) => {
    setCurrentAd({ ...ads[index] })
    setLogoPreview(ads[index].imageUrl || null)
    setEditingIndex(index)
  }

  const handleDelete = (index: number) => {
    const newAds = [...ads]
    newAds.splice(index, 1)
    setAds(newAds)
  }

  const moveAd = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === ads.length - 1) return
    const newAds = [...ads]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    const temp = newAds[index]
    newAds[index] = newAds[swapIndex]
    newAds[swapIndex] = temp
    setAds(newAds)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("La imagen no puede superar los 2MB.");
      return;
    }
    if (!file.type.startsWith('image/')) {
      setError("El archivo debe ser una imagen válida.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setLogoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveAd = async () => {
    setLoading(true)
    setError(null)
    
    try {
      let finalImageUrl = currentAd.imageUrl
      const file = fileInputRef.current?.files?.[0]
      
      if (file) {
        const formData = new FormData()
        formData.append('logo', file)
        const uploadRes = await uploadAdImage(formData)
        if (!uploadRes.success || !uploadRes.url) {
          throw new Error(uploadRes.error || "Error subiendo imagen")
        }
        finalImageUrl = uploadRes.url
      }

      const updatedAd = { ...currentAd, imageUrl: finalImageUrl }
      const newAds = [...ads]
      if (editingIndex !== null && editingIndex < ads.length) {
        newAds[editingIndex] = updatedAd
      } else {
        newAds.push(updatedAd)
      }
      setAds(newAds)
      setEditingIndex(null)
    } catch (e: any) {
      setError(e.message || "Error al procesar la imagen")
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAll = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const result = await saveLiveAds(ads)
      if (result.success) {
        setSuccess(true)
        router.refresh()
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || "Error al guardar los anuncios")
      }
    } catch (e) {
      setError("Error de red al guardar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Configuración de Múltiples Anuncios</h2>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona los banners que se intercalarán secuencialmente entre los partidos en directo.
          </p>
        </div>
        {editingIndex === null && (
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo Anuncio
          </button>
        )}
      </div>
      
      {editingIndex !== null ? (
        <div className="p-6 space-y-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-800">
              {editingIndex < ads.length ? "Editar Anuncio" : "Crear Anuncio"}
            </h3>
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={currentAd.isActive}
                  onChange={(e) => setCurrentAd({...currentAd, isActive: e.target.checked})}
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
              <span className="text-sm font-semibold text-slate-700">
                {currentAd.isActive ? 'Activado' : 'Desactivado'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 md:col-span-2 flex flex-col sm:flex-row items-center gap-6">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-20 shrink-0 rounded-xl border-2 border-dashed border-indigo-200 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all bg-slate-50 shadow-inner"
              >
                {logoPreview ? (
                  <>
                    <img src={logoPreview} alt="Logo" className="w-full h-full object-cover p-1" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Upload size={20} className="text-white" />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center text-indigo-400 group-hover:text-indigo-600">
                    <Upload size={20} className="mb-1" />
                    <span className="text-[10px] font-medium uppercase tracking-wide">Imagen</span>
                  </div>
                )}
              </div>
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} disabled={loading} />
              
              <div className="flex-1 space-y-4 w-full">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Título / Patrocinador</label>
                    <input 
                      type="text" value={currentAd.text} onChange={e => setCurrentAd({...currentAd, text: e.target.value})}
                      placeholder="Ej: Patrocinador Local"
                      className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Enlace Destino (URL)</label>
                    <input 
                      type="url" value={currentAd.url} onChange={e => setCurrentAd({...currentAd, url: e.target.value})}
                      placeholder="https://..."
                      className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Texto Descriptivo Adicional (Opcional)</label>
              <textarea 
                value={currentAd.description || ""} onChange={e => setCurrentAd({...currentAd, description: e.target.value})}
                placeholder="Ej: Descuento del 20% presentando el carnet del club..."
                className="w-full rounded-xl border-slate-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm h-20 resize-none"
              />
            </div>
            
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">Posición del Título/Texto</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="textLayout" value="overlay" checked={currentAd.textLayout !== 'below'} onChange={() => setCurrentAd({...currentAd, textLayout: 'overlay'})} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-700">Superpuesto en la imagen</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="textLayout" value="below" checked={currentAd.textLayout === 'below'} onChange={() => setCurrentAd({...currentAd, textLayout: 'below'})} className="text-indigo-600 focus:ring-indigo-500" />
                  <span className="text-sm text-slate-700">Bloque blanco debajo de la imagen</span>
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            {error && <p className="text-sm text-red-600 font-medium mr-auto">{error}</p>}
            <button onClick={() => setEditingIndex(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancelar
            </button>
            <button onClick={handleSaveAd} disabled={loading} className="flex items-center gap-2 bg-indigo-100 text-indigo-700 px-5 py-2 rounded-xl font-medium hover:bg-indigo-200 transition-colors disabled:opacity-50">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Aceptar Cambios
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-4">
          {ads.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <p className="text-slate-500 text-sm">No hay anuncios configurados. Añade el primero para empezar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ads.map((adItem, index) => (
                <div key={adItem.id} className={`flex items-center gap-4 p-3 rounded-xl border ${adItem.isActive ? 'border-indigo-100 bg-white' : 'border-slate-200 bg-slate-50 opacity-60'} shadow-sm transition-all`}>
                  <div className="w-16 h-12 bg-slate-100 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                    {adItem.imageUrl ? (
                      <img src={adItem.imageUrl} alt="preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold uppercase">Sin IMG</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{adItem.text || "Anuncio sin título"}</h4>
                    <p className="text-xs text-slate-500 truncate">{adItem.url || "Sin enlace"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => moveAd(index, 'up')} disabled={index === 0} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30">
                      <MoveUp className="w-4 h-4" />
                    </button>
                    <button onClick={() => moveAd(index, 'down')} disabled={index === ads.length - 1} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg disabled:opacity-30">
                      <MoveDown className="w-4 h-4" />
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                    <button onClick={() => handleEdit(index)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex-1">
              {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
              {success && (
                <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> Todos los cambios guardados y publicados
                </p>
              )}
            </div>
            <button 
              onClick={handleSaveAll}
              disabled={loading || ads.length === 0}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Guardar Todos en Vivo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
