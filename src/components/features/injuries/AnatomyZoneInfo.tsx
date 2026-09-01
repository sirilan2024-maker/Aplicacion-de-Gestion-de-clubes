import React from 'react';
import { Info } from 'lucide-react';
import { AnatomicalZone } from '@/hooks/useAnatomySelection';

interface AnatomyZoneInfoProps {
  zone: AnatomicalZone | null;
}

export function AnatomyZoneInfo({ zone }: AnatomyZoneInfoProps) {
  // Valores mostrados según la zona o los datos del mockup si es Isquiotibiales Derecho
  const regionGeneral = zone?.generalRegion || 'Miembros inferiores';
  const grupoMuscular = zone?.muscleGroup || 'Isquiotibiales';
  const zonaAnatomica = zone?.name || 'Isquiotibiales Derecho';
  const codigoInterno = zone?.code || 'isquiotibiales_der';

  return (
    <div className="w-full flex flex-col justify-between h-full">
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-white">
          Información de la zona
        </h4>

        {/* Tarjeta con render posterior de piernas + metadatos */}
        <div className="bg-[#0b0f17] border border-[#1b2334] rounded-xl p-3 sm:p-4 flex items-center gap-4 shadow-inner">
          {/* Imagen de piernas posteriores con isquio derecho en rojo */}
          <div className="w-20 sm:w-24 h-40 sm:h-48 rounded-lg overflow-hidden flex items-center justify-center shrink-0 bg-black/40">
            <img
              src="/models/posterior_legs_preview.png"
              alt="Piernas Anatómicas Posteriores"
              className="w-full h-full object-contain filter contrast-105"
            />
          </div>

          {/* Metadatos anatómicos exactos al mockup */}
          <div className="flex flex-col justify-center space-y-2 text-xs">
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                Región general
              </span>
              <span className="font-bold text-white">
                {regionGeneral}
              </span>
            </div>

            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                Grupo muscular
              </span>
              <span className="font-bold text-white">
                {grupoMuscular}
              </span>
            </div>

            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                Zona anatómica
              </span>
              <span className="font-bold text-white">
                {zonaAnatomica}
              </span>
            </div>

            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-semibold">
                Código interno
              </span>
              <code className="text-xs font-mono font-bold text-emerald-400">
                {codigoInterno}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Recuadro azul de aviso de sincronización */}
      <div className="bg-blue-950/25 border border-blue-500/30 rounded-xl p-3 flex items-start gap-2.5 text-blue-300 text-[11px] leading-relaxed mt-4">
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <span>
          La selección en el avatar y en el selector manual están sincronizadas.
        </span>
      </div>
    </div>
  );
}
