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
  const uploadedFiles = useWatch({ control, name: "uploadedFiles" }) || [];
  
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

  const removeUploadedFile = (label: string) => {
    const currentFiles = getValues("uploadedFiles") || [];
    const updatedFiles = currentFiles.filter(f => f.label !== label);
    setValue("uploadedFiles", updatedFiles);
    if (updatedFiles.length === 0) {
      setValue("docsUploaded", false);
    }
  };

  const FileUploadField = ({ label, description, className = "", isOptional = false }: { label: string, description?: string, className?: string, isOptional?: boolean }) => {
    const isUploaded = uploadedFiles.some(f => f.label === label);

    return (
      <div className={`border-2 transition-all rounded-xl p-4 flex flex-col items-center justify-center relative group overflow-hidden ${
        isUploaded 
          ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' 
          : 'border-dashed border-gray-300 bg-gray-50/80 hover:bg-gray-50 hover:border-blue-400'
      } ${className}`}>
        
        {/* Leyenda y Badge de Archivo Ya Subido */}
        {isUploaded && (
          <div className="w-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-emerald-300 mb-2 flex items-center justify-between shadow-xs animate-in fade-in">
            <span className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Archivo ya subido</span>
            </span>
            <button
              type="button"
              onClick={() => removeUploadedFile(label)}
              className="text-emerald-700 hover:text-red-600 hover:bg-white/80 p-0.5 rounded transition-colors"
              title="Eliminar archivo"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {isCompressing ? (
          <div className="text-blue-500 font-semibold text-sm flex flex-col items-center gap-2 py-4">
            <span className="animate-pulse">Comprimiendo y procesando...</span>
          </div>
        ) : (
          <>
            <UploadCloud className={`w-8 h-8 ${isUploaded ? 'text-emerald-600' : 'text-blue-500'} mb-1.5 group-hover:scale-105 transition-transform`} />
            <div className="flex items-center gap-1.5 justify-center flex-wrap text-center">
              <span className={`text-sm font-bold leading-tight ${isUploaded ? 'text-emerald-950' : 'text-gray-800'}`}>{label}</span>
              {isOptional && (
                <span className="text-[10px] bg-gray-200 text-gray-700 font-medium px-1.5 py-0.5 rounded">Opcional</span>
              )}
            </div>
            
            {description && (
              <span className="text-xs text-gray-500 text-center mt-1 mb-2 leading-tight">
                {description}
              </span>
            )}

            {isUploaded && (
              <span className="text-[11px] text-emerald-700 font-medium text-center mb-2">
                Documento listo. Puedes cambiarlo pulsando abajo si te equivocaste:
              </span>
            )}

            <div className="flex gap-2 mt-2 w-full">
              <div className={`relative flex-1 ${isUploaded ? 'bg-white text-gray-700 border-emerald-300 hover:bg-emerald-50' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'} border rounded-lg text-center py-2 text-xs font-semibold cursor-pointer shadow-xs transition-colors overflow-hidden`}>
                {isUploaded ? '📁 Cambiar archivo' : '📁 Subir Archivo'}
                <input 
                  type="file" 
                  onChange={(e) => handleFileChange(e, label)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
                  accept="image/*,.pdf" 
                />
              </div>
              <div className={`relative flex-1 ${isUploaded ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'} border rounded-lg text-center py-2 text-xs font-semibold cursor-pointer shadow-xs transition-colors overflow-hidden`}>
                {isUploaded ? '📷 Repetir foto' : '📷 Hacer Foto'}
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
  };

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

      {/* 1. DOCUMENTACIÓN OBLIGATORIA */}
      <div className="space-y-4">
        <div className="border-b pb-2 flex items-center justify-between">
          <h4 className="font-bold text-gray-900 flex items-center gap-2 text-base">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">1</span>
            Documentación Obligatoria
          </h4>
          <span className="text-xs text-red-500 font-semibold">* Requerido para tramitar la ficha</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FileUploadField label="DNI/NIE del Jugador (Anverso)" />
          <FileUploadField label="DNI/NIE del Jugador (Reverso)" />
          {!isSenior && (
            <>
              <FileUploadField label="DNI/NIE del Tutor (Anverso)" />
              <FileUploadField label="DNI/NIE del Tutor (Reverso)" />
            </>
          )}
          <FileUploadField label="Foto Carnet" description="Fondo blanco, tipo carnet" />
          <FileUploadField 
            label="Libro de Familia" 
            description="Si el menor no tiene DNI" 
            className="border-amber-200 bg-amber-50/20"
          />
        </div>
      </div>

      {/* 2. EXPEDIENTE ESPECIAL JUGADORES EXTRANJEROS (FFCV / FIFA ART. 19) */}
      <div className="space-y-6 bg-orange-50/30 p-6 rounded-2xl border border-orange-200 shadow-sm animate-in fade-in duration-300">
        <div className="border-b border-orange-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-700 text-white text-xs font-bold">2</span>
              <h4 className="font-bold text-blue-950 text-base">Expediente Especial Jugadores Extranjeros (FFCV / FIFA)</h4>
            </div>
            <p className="text-sm text-blue-900 font-medium">
              La Federación exige documentación extra si el jugador es extranjero.
            </p>
          </div>
          <span className="text-xs text-orange-800 bg-orange-100 font-semibold px-2.5 py-1 rounded-full border border-orange-200 self-start sm:self-auto">
            FIFA Art. 19
          </span>
        </div>

        {/* Banner Informativo Normativa FIFA Art. 19 */}
        <div className="bg-white p-5 rounded-xl border border-orange-200 space-y-3">
          <div className="flex items-center gap-2 text-orange-900 font-bold text-base border-b border-orange-100 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse"></span>
            Normativa FIFA Art. 19 (Protección de Menores) & Tramitación FFCV
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            Para los jugadores menores de edad de nacionalidad extranjera (tanto comunitarios de la UE como extracomunitarios), la tramitación a través de la FFCV exige justificar que el traslado a España no obedece a motivos deportivos:
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
            <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 space-y-1">
              <span className="font-bold text-blue-900 block">🔹 Caso A: Menores de 10 años</span>
              <p className="text-blue-800 text-[11px]">
                Inscripción directa demostrando arraigo continuado en España, escolarización y residencia de los progenitores por motivos no futbolísticos.
              </p>
            </div>
            <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 space-y-1">
              <span className="font-bold text-amber-900 block">🔸 Caso B: Menores de 10 a 18 años (CTI)</span>
              <p className="text-amber-800 text-[11px]">
                Requiere expediente completo de Certificado de Transferencia Internacional (CTI) y autorización formal de la Subcomisión de la FIFA a través de la RFEF.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200 text-[11px] text-gray-600">
            <strong>Nota sobre Comunitarios vs Extracomunitarios:</strong> Los trámites del Art. 19 aplican a todos los menores. Los comunitarios (UE/EEE) obtienen ficha directa tras el visto bueno de la FIFA sin restricción de cupo, mientras que los extracomunitarios deben contar adicionalmente con sus permisos de residencia legal en vigor.
          </div>
        </div>

        <div className="space-y-8">
          
          {/* Bloque 1: Identificación y Filiación */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="border-b pb-2">
              <h5 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <UserCircle className="w-5 h-5 text-blue-600" /> A) Identificación y Filiación (Menor y Progenitores)
              </h5>
              <p className="text-xs text-gray-500 mt-0.5">Pasaportes completos en vigor y certificados oficiales de filiación.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FileUploadField 
                label="Pasaporte Completo del Menor" 
                description="En vigor (todas las páginas relevantes)" 
              />
              <FileUploadField 
                label="Pasaporte del Padre" 
                description="En vigor, documento completo" 
              />
              <FileUploadField 
                label="Pasaporte de la Madre" 
                description="En vigor, documento completo" 
              />
              <FileUploadField 
                label="DNI/NIE del Jugador" 
                description="NIE o tarjeta de residencia si dispone" 
              />
              <FileUploadField 
                label="Libro de Familia Extranjero" 
                description="Libro de familia oficial o equivalente" 
              />
              <FileUploadField 
                label="Certificado de Nacimiento del Menor" 
                description="Original y con traducción jurada al español si procede" 
              />
            </div>
          </div>

          {/* Bloque 2: Escolarización en España */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <div>
                <h5 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                  <GraduationCap className="w-5 h-5 text-purple-600" /> B) Historial y Certificados de Escolarización
                </h5>
                <p className="text-xs text-gray-500 mt-0.5">Acredita los años escolarizado en España (vital si supera 5 años continuados).</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {escolarizacionFields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-gray-50 p-3 rounded-lg border border-gray-200 relative">
                  <div className="md:col-span-5 space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Centro Educativo en España</label>
                    <Input placeholder="Ej: CEIP / IES Manuel de Falla" {...register(`escolarizacion.${index}.centro`)} />
                  </div>
                  <div className="md:col-span-3 space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Curso Académico</label>
                    <Input placeholder="Ej: 2023-2024" {...register(`escolarizacion.${index}.curso`)} />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Certificado Escolar</label>
                    <FileUploadField label={`Certificado Escolar (${index + 1})`} className="!p-2 !bg-white" />
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
                <Plus className="w-4 h-4 mr-2" /> Añadir año / curso académico
              </Button>

              <div className="pt-2">
                <FileUploadField 
                  label="Certificado de Matrícula y Asistencia Actual" 
                  description="Certificado del colegio/instituto acreditando matrícula y asistencia regular en el curso actual" 
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: Acreditación de Residencia y Arraigo */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="border-b pb-2">
              <h5 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <Home className="w-5 h-5 text-orange-600" /> C) Acreditación de Residencia y Arraigo
              </h5>
              <p className="text-xs text-gray-500 mt-0.5">Demuestra el domicilio efectivo y continuado de la unidad familiar en España.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <FileUploadField 
                label="Empadronamiento Histórico Colectivo" 
                description="Actualizado con menos de 3 meses de emisión, donde conste residencia ininterrumpida" 
              />
              <FileUploadField 
                label="Contrato de Alquiler o Escritura" 
                description="Contrato de arrendamiento en vigor o escritura de propiedad" 
              />
              <FileUploadField 
                label="Justificante del Domicilio Familiar" 
                description="Recibos de suministros (luz, agua, gas, etc.)" 
              />
              <FileUploadField 
                label="Prueba de Arraigo / Distancia Geográfica" 
                description="Certificado de distancia o arraigo (si aplica proximidad geográfica o excepción)" 
                isOptional={true}
              />
              <FileUploadField 
                label="Documento de Tutela Legal" 
                description="Resolución judicial o administrativa de tutela (si no convive con ambos padres)" 
                isOptional={true}
              />
            </div>
          </div>

          {/* Bloque 4: Situación Laboral y Legal de los Padres */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="border-b pb-2">
              <h5 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <Briefcase className="w-5 h-5 text-teal-600" /> D) Situación Laboral y Legal de los Progenitores
              </h5>
              <p className="text-xs text-gray-500 mt-0.5">Acredita que el traslado familiar se debe a motivos laborales o legales ajenos al fútbol.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FileUploadField 
                label="Contrato de Trabajo de los Padres" 
                description="Contrato de trabajo en España de padre, madre o tutor legal" 
              />
              <FileUploadField 
                label="Justificante Laboral / Permiso de Residencia" 
                description="Nóminas, Informe de Vida Laboral, Alta en Seguridad Social o Permiso de Residencia" 
              />
            </div>
          </div>

          {/* Bloque 5: Cartas Explicativas, Declaraciones y Formularios CTI RFEF */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="border-b pb-2">
              <h5 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                <FileText className="w-5 h-5 text-rose-600" /> E) Declaraciones Juradas, Carta Explicativa y CTI
              </h5>
              <p className="text-xs text-gray-500 mt-0.5">Documentos firmados exigidos por la Comisión de Menores de la FIFA y la RFEF.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 text-xs text-gray-600 space-y-2.5 bg-rose-50/40 p-3.5 rounded-lg border border-rose-100">
                <p className="font-semibold text-rose-950">La familia deberá aportar los documentos firmados indicando:</p>
                <ul className="list-disc pl-4 space-y-1 text-gray-700">
                  <li>Situación familiar y motivo exacto del traslado a España.</li>
                  <li>Declaración expresa de que el cambio no guarda relación con motivos deportivos.</li>
                  <li>Situación laboral y escolar de todos los miembros.</li>
                </ul>
              </div>
              
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FileUploadField 
                  label="Carta Explicativa Firmada" 
                  description="Escrito firmado detallado por la familia" 
                />
                <FileUploadField 
                  label="Declaración Jurada de los Padres" 
                  description="Declaración formal sobre el motivo de cambio de residencia" 
                />
                <FileUploadField 
                  label="Impreso Oficial CTI Menores RFEF" 
                  description="Formulario oficial de CTI RFEF/FFCV (menores de 10 a 18 años)" 
                />
                <FileUploadField 
                  label="Declaración de Contactos del Club" 
                  description="Documento del club sobre los primeros contactos (si ya dispone de él)" 
                  isOptional={true}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. DOCUMENTACIÓN OPCIONAL */}
      <div className="space-y-4">
        <div className="border-b pb-2 flex items-center justify-between">
          <h4 className="font-bold text-gray-900 flex items-center gap-2 text-base">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-600 text-white text-xs font-bold">3</span>
            Documentación Opcional
          </h4>
          <span className="text-xs text-gray-500">Puedes adjuntarla ahora o aportarla más adelante</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FileUploadField 
            label="Foto Medio Cuerpo" 
            description="Con equipación o ropa deportiva" 
            isOptional={true} 
          />
          <FileUploadField 
            label="Certificado de Empadronamiento" 
            description="Histórico / familiar o volante de residencia" 
            isOptional={true} 
          />
          <FileUploadField 
            label="Pasaporte" 
            description="Pasaporte en vigor (jugador/tutor)" 
            isOptional={true} 
          />
        </div>
      </div>
    </div>
  );
}
