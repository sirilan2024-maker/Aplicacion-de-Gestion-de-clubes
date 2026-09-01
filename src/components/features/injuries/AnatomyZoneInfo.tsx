import React from 'react';
import { Info, ShieldAlert } from 'lucide-react';
import { AnatomicalZone } from '@/hooks/useAnatomySelection';

interface AnatomyZoneInfoProps {
  zone: AnatomicalZone;
}

export function AnatomyZoneInfo({ zone }: AnatomyZoneInfoProps) {
  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Información de la zona
        </h4>
        <span className="text-[10px] text-emerald-400 font-bold">Ficha anatómica</span>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-3 shadow-inner">
        {/* Fila superior: Mini silueta corporal + Zona destacada */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800/60">
          <div className="w-12 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1 shrink-0 relative overflow-hidden">
            <img
              src="/models/mini_body_preview.png"
              alt="Silueta corporal"
              className="w-full h-full object-contain filter invert opacity-80"
              onError={(e) => {
                // Fallback icon si la imagen no existiera
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            {/* Pequeño punto rojo indicador */}
            <span className="absolute w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-400 animate-pulse top-6 right-5" />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Zona seleccionada
            </span>
            <span className="text-sm font-black text-white">
              {zone.name}
            </span>
            {zone.laterality && (
              <span className="text-[11px] font-semibold text-rose-400">
                Lateralidad: {zone.laterality}
              </span>
            )}
          </div>
        </div>

        {/* Metadatos anatómicos */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/50">
            <span className="block text-[10px] text-slate-400 font-bold uppercase">
              Región general
            </span>
            <span className="font-semibold text-slate-200">{zone.generalRegion}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/50">
            <span className="block text-[10px] text-slate-400 font-bold uppercase">
              Grupo muscular
            </span>
            <span className="font-semibold text-slate-200">{zone.muscleGroup}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/50 col-span-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Código interno
            </span>
            <code className="text-[11px] font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
              {zone.code}
            </code>
          </div>
        </div>

        {/* Aviso de sincronización bidireccional */}
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/40 text-slate-400 text-[11px] leading-relaxed">
          <Info size={14} className="text-emerald-400 shrink-0 mt-0.5" />
          <span>
            La selección en el avatar y en el selector manual están sincronizadas en tiempo real.
          </span>
        </div>
      </div>
    </div>
  );
}
