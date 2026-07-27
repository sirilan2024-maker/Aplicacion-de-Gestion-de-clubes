import React, { useState } from "react";
import { useFormContext, useWatch, useFieldArray } from "react-hook-form";
import { Save, UploadCloud, CheckCircle, Image as ImageIcon, X, Plus, Trash2, GraduationCap, Briefcase, Home, FileText, UserCircle } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RegistrationFormData } from "../schema";
import imageCompression from "browser-image-compression";

export function Step2Documents() {
  const { register, control, setValue, getValues } = useFormContext<RegistrationFormData>();
  
  const isForeign = useWatch({ control, name: "isForeign" });
  const neverFederated = useWatch({ control, name: "neverFederated" });
  const birthDate = useWatch({ control, name: "birthDate" });
  
  const isSenior = birthDate ? new Date(birthDate).getFullYear() <= 2007 : false;

  const { fields: escolarizacionFields, append: appendEscolarizacion, remove: removeEscolarizacion } = useFieldArray({
    control,
    name: "escolarizacion"
  });

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
        
        // Convert to base64 to send in JSON payload
        const reader = new FileReader();
        reader.readAsDataURL(compressedFile);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          
          // Update the array of uploaded files
          const currentFiles = getValues("uploadedFiles") || [];
          // Replace if label already exists, else push
          const existingIndex = currentFiles.findIndex(f => f.label === label);
          if (existingIndex >= 0) {
            currentFiles[existingIndex] = { label, base64: base64data };
          } else {
            currentFiles.push({ label, base64: base64data });
          }
          setValue("uploadedFiles", currentFiles);
          setValue("docsUploaded", true);
          
          // Mantener los campos originales para retrocompatibilidad
          if (label.includes("DNI") || label.includes("NIE") || label.includes("Pasaporte") || label.includes("Libro")) {
             setValue("dniFileBase64", base64data);
          } else if (label.includes("Foto Carnet")) {
             setValue("photoFileBase64", base64data);
          }
        };
      } catch (error) {
        console.error("Error comprimiendo imagen:", error);
      } finally {
        setIsCompressing(false);
      }
    } else {
      // Para PDFs y otros documentos no-imagen: leer directamente como base64 sin compresión
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => {
        const base64data = reader.result as string;
        
        const currentFiles = getValues("uploadedFiles") || [];
        const existingIndex = currentFiles.findIndex(f => f.label === label);
        if (existingIndex >= 0) {
          currentFiles[existingIndex] = { label, base64: base64data };
        } else {
          currentFiles.push({ label, base64: base64data });
        }
        setValue("uploadedFiles", currentFiles);
        setValue("docsUploaded", true);
      };
      reader.onerror = () => {
        console.error("Error leyendo el archivo:", file.name);
      };
    }
  };

  const FileUploadField = ({ label, description, className = "" }: { label: string, description?: string, className?: string }) => (
    <div className={`border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 transition-colors relative group overflow-hidden ${className}`}>
      {isCompressing ? (
        <div className="text-blue-500 font-semibold text-sm flex flex-col items-center gap-2">
          <span className="animate-pulse">Comprimiendo...</span>
        </div>
      ) : (
        <>
          <UploadCloud className="w-8 h-8 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold text-gray-700 text-center leading-tight">{label}</span>
          {description && <span className="text-xs text-gray-500 text-center mt-1 mb-2 leading-tight">{description}</span>}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <FileUploadField label="DNI/NIE del Jugador (Anverso)" />
          <FileUploadField label="DNI/NIE del Jugador (Reverso)" />
          {!isSenior && (
            <>
              <FileUploadField label="DNI/NIE del Tutor (Anverso)" />
              <FileUploadField label="DNI/NIE del Tutor (Reverso)" />
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
            <Checkbox id="isForeign" checked={isForeign} onCheckedChange={(val) => register("isForeign").onChange({ target: { value: val, name: "isForeign" } })} />
            <label htmlFor="isForeign" className="text-sm font-medium text-gray-700 cursor-pointer">
              El jugador tiene nacionalidad Extranjera
            </label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="neverFederated" checked={neverFederated} onCheckedChange={(val) => register("neverFederated").onChange({ target: { value: val, name: "neverFederated" } })} />
            <label htmlFor="neverFederated" className="text-sm font-medium text-gray-700 cursor-pointer">
              El jugador nunca ha estado federado
            </label>
          </div>
        </div>
      </div>

      {/* Documentación Extra Dinámica (FFCV) */}
      {(isForeign || neverFederated) && (
        <div className="space-y-8 animate-in fade-in zoom-in duration-300 bg-orange-50/30 p-6 rounded-xl border border-orange-100 shadow-sm">
          <div className="border-b border-orange-200 pb-2">
            <h4 className="font-semibold text-orange-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              Documentación Extra Requerida (Expediente FFCV)
            </h4>
            <p className="text-sm text-orange-700 mt-1">
              Al cumplir alguna de las condiciones, la Federación requiere adjuntar los siguientes bloques de documentación para tramitar la ficha correctamente.
            </p>
          </div>

          <div className="space-y-8">
            
            {neverFederated && !isForeign && (
              <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-blue-500" /> Documentación por primera vez
                </h5>
                <p className="text-xs text-gray-500 mb-4">Obligatorio al no haber estado federado nunca antes.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {isSenior || (birthDate && new Date().getFullYear() - new Date(birthDate).getFullYear() >= 14) ? (
                    <>
                      <FileUploadField label="DNI/NIE del Jugador (Anverso)" description="Obligatorio al tener 14 años o más" />
                      <FileUploadField label="DNI/NIE del Jugador (Reverso)" description="Obligatorio al tener 14 años o más" />
                    </>
                  ) : (
                    <>
                      <FileUploadField label="Libro de Familia" description="Si no tiene DNI" />
                      <FileUploadField label="Certificado de nacimiento" description="Alternativa al Libro de Familia" />
                    </>
                  )}
                  <FileUploadField label="Foto Carnet (Reciente)" description="Importante: tiene que ser actual" />
                </div>
              </div>
            )}

            {isForeign && (
              <>
                {/* Bloque 1: Jugador */}
                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                  <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <UserCircle className="w-4 h-4 text-blue-500" /> A) Jugador Extranjero
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <FileUploadField label="Pasaporte" description="En vigor" />
                    <FileUploadField label="DNI/NIE" />
                    <FileUploadField label="Libro de familia" />
                    <FileUploadField label="Certificado de nacimiento" />
                  </div>
                </div>

            {/* Bloque 2: Escolarización */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h5 className="font-semibold text-gray-800 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-purple-500" /> B) Escolarización
                </h5>
                <p className="text-xs text-gray-500">Desde que comenzó su escolarización</p>
              </div>
              
              <div className="space-y-4">
                {escolarizacionFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-gray-50 p-3 rounded border border-gray-200 relative">
                    <div className="md:col-span-5 space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Centro educativo</label>
                      <Input placeholder="Ej: CEIP Manuel de Falla" {...register(`escolarizacion.${index}.centro`)} />
                    </div>
                    <div className="md:col-span-3 space-y-1">
                      <label className="text-xs font-semibold text-gray-600">Curso académico</label>
                      <Input placeholder="Ej: 2022-2023" {...register(`escolarizacion.${index}.curso`)} />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-xs font-semibold text-gray-600 mb-1 block">Certificado</label>
                      <FileUploadField label="Subir Certificado" className="!p-2 !bg-white" />
                    </div>
                    <div className="md:col-span-1 flex justify-end md:mt-6">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeEscolarizacion(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => appendEscolarizacion({ centro: "", curso: "" })}
                  className="w-full border-dashed border-2 text-blue-600 hover:bg-blue-50"
                >
                  <Plus className="w-4 h-4 mr-2" /> Añadir curso académico
                </Button>
              </div>
            </div>

            {/* Bloque 3: Progenitores */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <UserCircle className="w-4 h-4 text-green-500" /> C) Padre, madre o tutor
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FileUploadField label="Pasaporte" description="En vigor" />
                <FileUploadField label="DNI/NIE" />
                <FileUploadField label="Documento de tutela" description="En su caso" />
              </div>
            </div>

            {/* Bloque 4: Residencia */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Home className="w-4 h-4 text-orange-500" /> D) Residencia
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FileUploadField label="Empadronamiento" description="Histórico y familiar" />
                <FileUploadField label="Contrato de alquiler" description="Si existe" />
                <FileUploadField label="Documento acreditativo del domicilio" description="Recibos, escrituras, etc." />
              </div>
            </div>

            {/* Bloque 5: Situación Laboral */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-teal-500" /> E) Situación Laboral
              </h5>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FileUploadField label="Contrato de trabajo" description="De los progenitores (cuando exista)" />
                <FileUploadField label="Otra documentación" description="Justificativa (Nóminas, alta SS, etc.)" />
              </div>
            </div>

            {/* Bloque 6: Carta Explicativa */}
            <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
              <h5 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-500" /> F) Carta Explicativa
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="text-sm text-gray-600 space-y-2">
                  <p>La familia deberá adjuntar un escrito <strong>firmado</strong> explicando detalladamente:</p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li>Situación familiar.</li>
                    <li>Motivo por el que reside en España.</li>
                    <li>Situación laboral.</li>
                    <li>Situación escolar.</li>
                    <li>Cualquier otra circunstancia relevante para la tramitación federativa.</li>
                  </ul>
                </div>
                <FileUploadField label="Carta Explicativa Firmada" />
              </div>
            </div>
            </>
            )}

          </div>
        </div>
      )}
    </div>
  );
}
