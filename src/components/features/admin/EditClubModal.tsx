"use client"

import { useState, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { X, Upload, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { updateClubSettingsAction } from "@/app/actions/club-actions"

interface EditClubModalProps {
  open: boolean;
  onClose: () => void;
  clubId: string;
  currentName: string;
  currentLogoUrl: string | null;
  onSuccess: () => void;
}

export function EditClubModal({ open, onClose, clubId, currentName, currentLogoUrl, onSuccess }: EditClubModalProps) {
  const [name, setName] = useState(currentName);
  const [logoPreview, setLogoPreview] = useState<string | null>(currentLogoUrl);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("La imagen no puede superar los 2MB.");
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error("El archivo debe ser una imagen válida.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("El nombre del club no puede estar vacío");
      return;
    }

    setUploading(true);
    const toastId = toast.loading("Guardando cambios...");

    try {
      const formData = new FormData();
      formData.append('name', name);
      if (currentLogoUrl) formData.append('currentLogoUrl', currentLogoUrl);
      
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        formData.append('logo', file);
      }

      const res = await updateClubSettingsAction(clubId, formData);

      if (!res.success) throw new Error(res.error);

      toast.success("Ajustes del club guardados", { id: toastId });
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error(error);
      toast.error("Error al guardar: " + error.message, { id: toastId });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="animate-in fade-in-0 zoom-in-95 duration-200 bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="font-bold text-gray-900">Ajustes del Club</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-32 h-32 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all bg-gray-50 shadow-inner"
            >
              {logoPreview ? (
                <>
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Upload size={24} className="text-white" />
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center text-gray-400 group-hover:text-blue-500">
                  <Upload size={28} className="mb-1" />
                  <span className="text-[11px] font-medium uppercase tracking-wide">Subir Logo</span>
                </div>
              )}
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              disabled={uploading}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Nombre del Club</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 font-medium"
              placeholder="E.g. C.S.S. SPORTING SALADAR"
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={uploading}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {uploading && <Loader2 size={16} className="animate-spin" />}
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}
