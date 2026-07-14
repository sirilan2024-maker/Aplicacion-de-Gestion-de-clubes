import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import { ShieldCheck, HeartHandshake, UploadCloud, Info } from "lucide-react";
import { RegistrationFormData } from "../schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LegalModal } from "@/components/ui/LegalModal";

type LegalItem = 'rgpd' | 'tutela' | 'medical' | 'imagen';

const LEGAL_TEXTS: Record<LegalItem, { title: string; content: React.ReactNode }> = {
  rgpd: {
    title: "Política de Privacidad (RGPD y LOPDGDD)",
    content: (
      <div className="space-y-4 text-sm">
        <p><strong>Responsable:</strong> CLUB SPORTING SALADAR<br />
        <strong>CIF:</strong> G03671971<br />
        <strong>Domicilio:</strong> La Cruz, 7 - Saladar (Almoradí, Alicante, C.P. 03160)<br />
        <strong>Email:</strong> csportingsaladar@gmail.com | <strong>Tel:</strong> 672463398</p>
        <p>De conformidad con el Reglamento (UE) 2016/679 (RGPD) y la LOPDGDD 3/2018, los datos personales recogidos serán tratados de forma estrictamente confidencial para la gestión deportiva, administrativa, federativa y contable del club.</p>
        <p>Los datos no serán cedidos a terceros salvo obligación legal (Federaciones deportivas, Mutuas o Seguros Médicos). Puede ejercer en cualquier momento sus derechos de acceso, rectificación, supresión, limitación y portabilidad escribiendo a nuestro email.</p>
        <p className="pt-32 text-xs text-gray-400 text-center">-- Fin del documento legal --</p>
      </div>
    )
  },
  tutela: {
    title: "Declaración de Tutela y Aceptación Normativa",
    content: (
      <div className="space-y-4 text-sm">
        <p>Declaro bajo mi responsabilidad que soy mayor de edad y ostento la patria potestad o tutela legal del menor inscrito, o bien soy el propio jugador mayor de edad.</p>
        <p>Solicito formalmente la inscripción en el CLUB SPORTING SALADAR para la temporada en vigor. Al realizar esta solicitud, declaro conocer y aceptar íntegramente los estatutos, el reglamento de régimen interno y las normativas deportivas y disciplinarias del club.</p>
        <p className="pt-32 text-xs text-gray-400 text-center">-- Fin del documento legal --</p>
      </div>
    )
  },
  medical: {
    title: "Tratamiento de Datos Médicos Especiales",
    content: (
      <div className="space-y-4 text-sm">
        <p>Otorgo mi consentimiento expreso para que el club trate los datos de salud (alergias, enfermedades crónicas, lesiones) declarados, con la única finalidad de proteger la integridad física del jugador durante la práctica deportiva.</p>
        <p>Asimismo, autorizo al cuerpo técnico y responsables del club a realizar el traslado urgente a un centro médico en caso de accidente o lesión, así como a consentir intervenciones médicas de urgencia extrema si no fuera posible localizar a los familiares de manera inmediata.</p>
        <p className="pt-32 text-xs text-gray-400 text-center">-- Fin del documento legal --</p>
      </div>
    )
  },
  imagen: {
    title: "Cesión de Derechos de Imagen (Opcional)",
    content: (
      <div className="space-y-4 text-sm">
        <p>De acuerdo con la Ley Orgánica 1/1982 sobre protección del derecho al honor, a la intimidad personal y familiar y a la propia imagen, <strong>autorizo</strong> al Club a la captación de fotografías y vídeos del jugador durante la actividad deportiva oficial (entrenamientos, partidos, torneos).</p>
        <p>Dichas imágenes podrán ser publicadas en los medios de comunicación oficiales del club (página web, redes sociales institucionales y cartelería) con el <strong>único y exclusivo fin de promocionar las actividades deportivas y sociales del club</strong>, sin fines lucrativos ni comerciales hacia terceros.</p>
        <p>Este consentimiento es revocable en cualquier momento desde su perfil de usuario.</p>
        <p className="pt-32 text-xs text-gray-400 text-center">-- Fin del documento legal --</p>
      </div>
    )
  }
};

export function Step5Consent() {
  const { register, setValue, watch, formState: { errors } } = useFormContext<RegistrationFormData>();
  const [activeLegalModal, setActiveLegalModal] = useState<LegalItem | null>(null);

  // Estados locales para saber si se ha leído el modal y habilitar el checkbox
  const [legalRead, setLegalRead] = useState<Record<LegalItem, boolean>>({
    rgpd: false,
    tutela: false,
    medical: false,
    imagen: false
  });

  const handleLegalAccept = () => {
    if (activeLegalModal) {
      setLegalRead(prev => ({...prev, [activeLegalModal]: true}));
      // Enlazar con React Hook Form
      if (activeLegalModal === 'rgpd') setValue("consentRgpd", true, { shouldValidate: true });
      if (activeLegalModal === 'tutela') setValue("consentTutela", true, { shouldValidate: true });
      if (activeLegalModal === 'medical') setValue("consentMedical", true, { shouldValidate: true });
      if (activeLegalModal === 'imagen') setValue("consentImage", true, { shouldValidate: true });
      setActiveLegalModal(null);
    }
  };

  const getFieldId = (id: LegalItem) => {
    switch (id) {
      case 'rgpd': return 'consentRgpd';
      case 'tutela': return 'consentTutela';
      case 'medical': return 'consentMedical';
      case 'imagen': return 'consentImage';
    }
  };

  const renderConsentBox = (id: LegalItem, title: string, subtitle: string, error?: string, optional = false) => {
    const fieldName = getFieldId(id) as keyof RegistrationFormData;
    const isChecked = watch(fieldName) === true;
    
    return (
      <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${isChecked ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-200'} ${error ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
        <div className="mt-1">
          <Checkbox 
            checked={isChecked}
            onCheckedChange={(checked) => {
              if (legalRead[id]) {
                setValue(fieldName, checked === true, { shouldValidate: true });
              }
            }}
            disabled={!legalRead[id]}
            className="checked:bg-green-600 checked:border-green-600 disabled:opacity-50 cursor-pointer" 
          />
          {/* Hidden inputs to register with RHF */}
          <input type="hidden" {...register(fieldName)} />
        </div>
        <div className="space-y-1 w-full">
          <p className="text-sm font-bold text-gray-900 flex flex-wrap items-center gap-2">
            <span>{title} {!optional && <span className="text-red-500">*</span>}</span>
            {!legalRead[id] && (
              <button type="button" onClick={() => setActiveLegalModal(id)} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-2.5 py-1 rounded-md font-semibold transition-colors">
                Leer documento
              </button>
            )}
          </p>
          <p className="text-xs text-gray-500">{subtitle}</p>
          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hospitality / Colaboración */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
          <HeartHandshake className="w-6 h-6 text-orange-500" />
          Colaboración
        </h3>
        <p className="text-sm text-gray-600 mb-6">El club Sporting Saladar es una gran familia. ¿Te gustaría colaborar activamente?</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Opciones de Voluntariado</label>
            <select {...register("volunteerInterest")} className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus-visible:ring-blue-600">
              <option value="">No, en este momento no puedo</option>
              <option value="delegado">Me ofrezco como Delegado de equipo</option>
              <option value="eventos">Ayuda puntual en eventos/torneos</option>
              <option value="mantenimiento">Ayuda en mantenimiento o logística</option>
            </select>
          </div>
          
          <div className="space-y-4 border-l pl-6">
            <label className="text-sm font-semibold text-gray-700">¿Deseas aportar un Patrocinador?</label>
            <Input {...register("sponsorCompanyName")} placeholder="Nombre de la empresa" />
            <Input {...register("sponsorContactName")} placeholder="Persona de contacto" />
            <Input {...register("sponsorPhone")} placeholder="Teléfono" />
            
            <div className="border border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition-colors cursor-pointer relative mt-2">
              <UploadCloud className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-xs font-semibold text-gray-600 text-center">Subir Logotipo de Empresa</span>
              <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="image/*" />
            </div>
          </div>
        </div>
      </div>

      {/* Consentimientos Legales (RGPD) */}
      <div>
        <div className="mb-6 border-b pb-4 mt-8">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-green-600" />
            Consentimientos y Legal
          </h3>
          <p className="text-sm text-gray-500 mt-1">Lectura y aceptación obligatoria. Las firmas se registrarán con su respectiva IP y marca de tiempo (Firma Electrónica Simple) para cumplir el RGPD.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderConsentBox('rgpd', 'Política de Privacidad', 'Tratamiento de datos personales (RGPD)', errors.consentRgpd?.message)}
          {renderConsentBox('tutela', 'Declaración de Tutela', 'Mayoría de edad y normativas', errors.consentTutela?.message)}
          {renderConsentBox('medical', 'Tratamiento Médico Especial', 'Alergias y traslados de urgencia', errors.consentMedical?.message)}
          {renderConsentBox('imagen', 'Derechos de Imagen', 'Consentimiento opcional para fotos', errors.consentImage?.message, true)}
        </div>
      </div>

      {/* Información Básica sobre Protección de Datos */}
      <div className="mt-8 bg-blue-50/50 p-4 rounded-lg border border-blue-100 text-xs text-blue-900">
        <h4 className="font-bold flex items-center gap-1 mb-2">
          <Info className="w-4 h-4 text-blue-600" /> 
          Información Básica sobre Protección de Datos
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <div className="border border-blue-200 bg-white p-2 rounded">
            <strong>Responsable:</strong><br />CLUB SPORTING SALADAR
          </div>
          <div className="border border-blue-200 bg-white p-2 rounded">
            <strong>Finalidad:</strong><br />Gestión administrativa y deportiva de la inscripción.
          </div>
          <div className="border border-blue-200 bg-white p-2 rounded">
            <strong>Legitimación:</strong><br />Ejecución de un contrato/acuerdo y consentimiento del interesado.
          </div>
          <div className="border border-blue-200 bg-white p-2 rounded">
            <strong>Destinatarios:</strong><br />Federaciones deportivas, mutuas de seguros. No se cederán datos salvo obligación legal.
          </div>
          <div className="border border-blue-200 bg-white p-2 rounded">
            <strong>Derechos:</strong><br />Acceder, rectificar y suprimir los datos, solicitándolo en csportingsaladar@gmail.com.
          </div>
        </div>
      </div>

      <LegalModal 
        isOpen={activeLegalModal !== null} 
        onClose={() => setActiveLegalModal(null)}
        title={activeLegalModal ? LEGAL_TEXTS[activeLegalModal].title : ''}
        content={activeLegalModal ? LEGAL_TEXTS[activeLegalModal].content : null}
        onAccept={handleLegalAccept}
      />
    </div>
  );
}
