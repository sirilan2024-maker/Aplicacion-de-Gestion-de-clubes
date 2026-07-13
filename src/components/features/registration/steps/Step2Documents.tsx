import React, { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { Save, UploadCloud, CheckCircle, Image as ImageIcon, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { RegistrationFormData } from "../schema";
import imageCompression from "browser-image-compression";

export function Step2Documents() {
  const { register, control } = useFormContext<RegistrationFormData>();
  
  const isForeign = useWatch({ control, name: "isForeign" });
  const neverFederated = useWatch({ control, name: "neverFederated" });
  const birthDate = useWatch({ control, name: "birthDate" });
  
  const isSenior = birthDate ? new Date(birthDate).getFullYear() <= 2007 : false;

  // Estado para la previsualización de la compresión
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    originalSize: string;
    compressedSize: string;
    fileName: string;
  } | null>(null);

  const [isCompressing, setIsCompressing] = useState(false);

  const formatSize = (bytes: number) => {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, label: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Si es imagen, la comprimimos
    if (file.type.startsWith("image/")) {
      setIsCompressing(true);
      try {
        const options = {
          maxSizeMB: 0.2, // max 200KB
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        
        const compressedFile = await imageCompression(file, options);
        const compressedUrl = URL.createObjectURL(compressedFile);
        
        setPreviewImage({
          url: compressedUrl,
          originalSize: formatSize(file.size),
          compressedSize: formatSize(compressedFile.size),
          fileName: label
        });
        
        // Aquí en un caso real guardaríamos el compressedFile en el estado del formulario 
        // para subirlo luego a Supabase Storage.
        
      } catch (error) {
        console.error("Error comprimiendo imagen:", error);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  const FileUploadField = ({ label, description }: { label: string, description?: string }) => (
    <div className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 transition-colors relative group overflow-hidden">
      {isCompressing ? (
        <div className="text-blue-500 font-semibold text-sm flex flex-col items-center gap-2">
          <span className="animate-pulse">Comprimiendo...</span>
        </div>
      ) : (
        <>
          <UploadCloud className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-gray-700 text-center">{label}</span>
          {description && <span className="text-xs text-gray-500 text-center mt-1 mb-2">{description}</span>}
          <div className="flex gap-2 mt-4 w-full">
            <div className="relative flex-1 bg-white border border-gray-300 rounded-md text-center py-2 text-xs font-semibold hover:bg-gray-100 cursor-pointer shadow-sm overflow-hidden">
              📁 Archivo
              <input 
                type="file" 
                onChange={(e) => handleFileChange(e, label)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                accept="image/*,.pdf" 
              />
            </div>
            <div className="relative flex-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-center py-2 text-xs font-semibold hover:bg-blue-100 cursor-pointer shadow-sm overflow-hidden">
              📷 Foto
              <input 
                type="file" 
                onChange={(e) => handleFileChange(e, label)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                accept="image/*" 
                capture="environment" 
              />
            </div>
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 border-b pb-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Save className="w-6 h-6 text-blue-600" />
          Documentación Requerida
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          Sube los documentos necesarios. Las fotos se comprimirán automáticamente a menos de 200KB para agilizar la subida.
        </p>
      </div>

      {/* Modal de Previsualización de Compresión */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-blue-600" />
                Previsualización Optimizada
              </h3>
              <button onClick={() => setPreviewImage(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm font-semibold mb-2">{previewImage.fileName}</p>
              <div className="bg-gray-100 rounded-lg aspect-video flex items-center justify-center overflow-hidden border border-gray-200 mb-4 relative">
                <img src={previewImage.url} alt="Previsualización" className="object-contain w-full h-full" />
                <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Optimizado
                </div>
              </div>
              <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm">
                <div>
                  <p className="text-gray-500 text-xs">Peso Original</p>
                  <p className="font-semibold text-red-500 line-through">{previewImage.originalSize}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-xs">Peso Comprimido</p>
                  <p className="font-bold text-green-600">{previewImage.compressedSize}</p>
                </div>
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 text-right">
              <Button onClick={() => setPreviewImage(null)} className="bg-blue-600 hover:bg-blue-700 text-white">
                Confirmar y Guardar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Identificación */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800 border-b pb-2">1. Identidad</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {!isSenior ? (
            <>
              <FileUploadField label="DNI/NIE del Tutor (Anverso)" />
              <FileUploadField label="DNI/NIE del Tutor (Reverso)" />
            </>
          ) : (
            <>
              <FileUploadField label="DNI/NIE del Jugador (Anverso)" />
              <FileUploadField label="DNI/NIE del Jugador (Reverso)" />
            </>
          )}
        </div>
      </div>

      {/* Fotografías (Obligatorias según instrucciones) */}
      <div className="space-y-4">
        <h4 className="font-semibold text-gray-800 border-b pb-2">2. Fotografías Deportivas</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FileUploadField label="Foto Carnet" description="Fondo blanco" />
          <FileUploadField label="Foto Medio Cuerpo" description="Con equipación o ropa deportiva" />
          <FileUploadField label="Foto Cuerpo Entero" description="De pie, actitud deportiva" />
          <FileUploadField label="Foto Horizontal Alta Calidad" description="Para grafismos y RRSS" />
        </div>
      </div>

      {/* Condiciones FFCV */}
      <div className="space-y-4 bg-blue-50/50 p-5 rounded-xl border border-blue-100">
        <h4 className="font-semibold text-blue-900 mb-3">Expediente Especial FFCV</h4>
        <p className="text-sm text-blue-800 mb-4">La Federación exige documentación extra en ciertos casos. Marca si cumples alguna condición:</p>
        
        <div className="flex flex-col gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox id="isForeign" {...register("isForeign")} />
            <label htmlFor="isForeign" className="text-sm font-medium text-gray-700 cursor-pointer">
              El jugador tiene nacionalidad Extranjera
            </label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox id="neverFederated" {...register("neverFederated")} />
            <label htmlFor="neverFederated" className="text-sm font-medium text-gray-700 cursor-pointer">
              El jugador NUNCA ha estado federado en España
            </label>
          </div>
        </div>
      </div>

      {/* Documentación Extra Dinámica */}
      {(isForeign || neverFederated) && (
        <div className="space-y-4 animate-in fade-in zoom-in duration-300">
          <h4 className="font-semibold text-orange-800 border-b border-orange-200 pb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            Documentación Extra Requerida (Expediente FFCV)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <FileUploadField label="Pasaporte en vigor" />
            <FileUploadField label="Certificado de Empadronamiento" description="Expedido hace menos de 3 meses" />
            <FileUploadField label="Certificado de Escolarización" description="Del colegio actual" />
            <FileUploadField label="Contratos Laborales" description="De los padres/tutores" />
            <FileUploadField label="Carta Explicativa" description="Motivos de residencia" />
          </div>
        </div>
      )}
    </div>
  );
}
