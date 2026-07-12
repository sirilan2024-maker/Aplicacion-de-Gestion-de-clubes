import React, { useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { ShieldCheck, HeartHandshake, UploadCloud } from "lucide-react";
import { RegistrationFormData } from "../schema";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LegalModal } from "@/components/ui/LegalModal";

type LegalItem = 'inscripcion' | 'rgpd' | 'imagen' | 'video' | 'whatsapp' | 'sanitaria';

const LEGAL_TEXTS: Record<LegalItem, { title: string; content: React.ReactNode }> = {
  inscripcion: {
    title: "Solicitud de Inscripción",
    content: (
      <div className="space-y-4 text-sm">
        <p>Solicito la inscripción en el CLUB SPORTING SALADAR para la temporada actual, comprometiéndome a acatar los reglamentos y normativas de régimen interno del club.</p>
        <p className="pt-32 text-xs text-gray-400 text-center">-- Fin del documento legal --</p>
      </div>
    )
  },
  rgpd: {
    title: "Política de Privacidad (RGPD)",
    content: (
      <div className="space-y-4 text-sm">
        <p><strong>Responsable:</strong> CLUB SPORTING SALADAR<br />
        <strong>CIF:</strong> G03671971<br />
        <strong>Domicilio:</strong> La Cruz, 7 - Saladar (Almoradí, Alicante, C.P. 03160)<br />
        <strong>Email:</strong> csportingsaladar@gmail.com | <strong>Tel:</strong> 672463398</p>
        <p>De conformidad con el Reglamento (UE) 2016/679 y la LOPDGDD 3/2018, los datos personales recogidos serán tratados para la gestión deportiva, administrativa y contable del club.</p>
        <p>Los datos no serán cedidos a terceros salvo obligación legal (Federaciones, Seguros Médicos). Puede ejercer sus derechos de acceso, rectificación, supresión y portabilidad escribiendo a nuestro email.</p>
        <p className="pt-32 text-xs text-gray-400 text-center">-- Fin del documento legal --</p>
      </div>
    )
  },
  imagen: {
    title: "Cesión de Derechos de Imagen",
    content: (
      <div className="space-y-4 text-sm">
        <p>Autorizo al Club a la toma de fotografías durante la actividad deportiva (entrenamientos, partidos, torneos) para su publicación en medios oficiales (web, redes sociales, carteles) con el único fin de promocionar al club, sin fines comerciales hacia terceros.</p>
        <p className="pt-32 text-xs text-gray-400 text-center">-- Fin del documento legal --</p>
      </div>
    )
  },
  video: {
    title: "Grabación y Difusión de Vídeo",
    content: (
      <div className="space-y-4 text-sm">
        <p>Autorizo la grabación en vídeo de partidos y entrenamientos con fines técnicos, tácticos y promocionales, incluyendo posibles retransmisiones de eventos deportivos donde participe el jugador.</p>
        <p className="pt-32 text-xs text-gray-400 text-center">-- Fin del documento legal --</p>
      </div>
    )
  },
  whatsapp: {
    title: "Comunicaciones Oficiales por WhatsApp",
    content: (
      <div className="space-y-4 text-sm">
        <p>Autorizo la inclusión de mi número de teléfono móvil en las listas de difusión o grupos de WhatsApp gestionados por los entrenadores, coordinadores o directiva del club, exclusivamente para comunicaciones deportivas, horarios y avisos oficiales.</p>
        <p className="pt-32 text-xs text-gray-400 text-center">-- Fin del documento legal --</p>
      </div>
    )
  },
  sanitaria: {
    title: "Autorización de Traslado Médico",
    content: (
      <div className="space-y-4 text-sm">
        <p>Autorizo al cuerpo técnico y responsables del club a realizar el traslado urgente a un centro médico en caso de accidente o lesión durante la práctica deportiva, así como a consentir intervenciones médicas de urgencia extrema si no fuera posible localizar a los familiares de manera inmediata.</p>
        <p className="pt-32 text-xs text-gray-400 text-center">-- Fin del documento legal --</p>
      </div>
    )
  }
};

export function Step5Consent() {
  const { register, setValue, formState: { errors } } = useFormContext<RegistrationFormData>();
  const [activeLegalModal, setActiveLegalModal] = useState<LegalItem | null>(null);

  // Estados locales para saber si se ha leído el modal y habilitar el checkbox
  const [legalRead, setLegalRead] = useState<Record<LegalItem, boolean>>({
    inscripcion: false,
    rgpd: false,
    imagen: false,
    video: false,
    whatsapp: false,
    sanitaria: false
  });

  const handleLegalAccept = () => {
    if (activeLegalModal) {
      setLegalRead(prev => ({...prev, [activeLegalModal]: true}));
      // Enlazar con React Hook Form
      if (activeLegalModal === 'inscripcion') setValue("consentInscription", true, { shouldValidate: true });
      if (activeLegalModal === 'rgpd') setValue("consentRgpd", true, { shouldValidate: true });
      if (activeLegalModal === 'imagen') setValue("consentImage", true, { shouldValidate: true });
      if (activeLegalModal === 'video') setValue("consentVideo", true, { shouldValidate: true });
      if (activeLegalModal === 'whatsapp') setValue("consentWhatsapp", true, { shouldValidate: true });
      if (activeLegalModal === 'sanitaria') setValue("consentMedical", true, { shouldValidate: true });
      setActiveLegalModal(null);
    }
  };

  const renderConsentBox = (id: LegalItem, title: string, subtitle: string, error?: string) => (
    <div className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${legalRead[id] ? 'bg-green-50/50 border-green-200' : 'bg-white border-gray-200'} ${error ? 'border-red-500 ring-1 ring-red-500' : ''}`}>
      <div className="mt-1">
        <Checkbox 
          checked={legalRead[id]}
          disabled={!legalRead[id]}
          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 disabled:opacity-50" 
        />
        {/* Hidden inputs to register with RHF */}
        <input type="hidden" {...register(id === 'inscripcion' ? 'consentInscription' : id === 'rgpd' ? 'consentRgpd' : id === 'imagen' ? 'consentImage' : id === 'video' ? 'consentVideo' : id === 'whatsapp' ? 'consentWhatsapp' : 'consentMedical')} />
      </div>
      <div className="space-y-1 w-full">
        <p className="text-sm font-bold text-gray-900 flex flex-wrap items-center gap-2">
          <span>{title} <span className="text-red-500">*</span></span>
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hospitality / Colaboración */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-4">
          <HeartHandshake className="w-6 h-6 text-orange-500" />
          Hospitality y Colaboración
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
          <p className="text-sm text-gray-500 mt-1">Lectura y aceptación obligatoria. Las firmas se registrarán con su respectiva marca de tiempo para cumplir el RGPD.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderConsentBox('inscripcion', 'Solicitud de Inscripción', 'Acato la normativa del club', errors.consentInscription?.message)}
          {renderConsentBox('rgpd', 'Política de Privacidad', 'Tratamiento de datos personales', errors.consentRgpd?.message)}
          {renderConsentBox('imagen', 'Derechos de Imagen', 'Fotografías oficiales del club', errors.consentImage?.message)}
          {renderConsentBox('video', 'Grabación de Vídeos', 'Partidos y retransmisiones', errors.consentVideo?.message)}
          {renderConsentBox('whatsapp', 'Comunicaciones por WhatsApp', 'Avisos oficiales y horarios', errors.consentWhatsapp?.message)}
          {renderConsentBox('sanitaria', 'Autorización Sanitaria', 'Traslado médico de urgencia', errors.consentMedical?.message)}
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
