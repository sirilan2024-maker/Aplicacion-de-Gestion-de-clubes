import React from 'react';
import { Info, AlertCircle, Sparkles, Activity } from 'lucide-react';
import { AnatomicalZone } from '@/hooks/useAnatomySelection';

interface AnatomyZoneInfoProps {
  zone: AnatomicalZone | null;
}

export function AnatomyZoneInfo({ zone }: AnatomyZoneInfoProps) {
  if (!zone) {
    return (
      <div className="w-full h-full flex flex-col justify-center items-center p-6 rounded-2xl bg-slate-900/40 border border-dashed border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center">
          <Activity size={24} className="text-emerald-500/60" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Ningún Músculo Seleccionado
          </h4>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Haz clic directamente en cualquier músculo del avatar anatómico o utiliza el selector de vientres musculares para iniciar la valoración médica.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Ficha Anatómica del Músculo
        </h4>
        <span
          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
            zone.incidencia === 'Muy Alta' || zone.incidencia === 'Grave'
              ? 'bg-rose-950 text-rose-300 border-rose-500/50'
              : zone.incidencia === 'Alta'
              ? 'bg-amber-950 text-amber-300 border-amber-500/50'
              : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
          }`}
        >
          Incidencia: {zone.incidencia || 'Media'}
        </span>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-3 shadow-inner">
        {/* Vientre muscular destacado */}
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800/60">
          <div className="w-12 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center p-1 shrink-0 relative overflow-hidden">
            <img
              src="/models/mini_body_preview.png"
              alt="Silueta corporal"
              className="w-full h-full object-contain filter invert opacity-80"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="absolute w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-400 animate-pulse top-6 right-5" />
          </div>

          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Vientre muscular activo
            </span>
            <span className="text-sm font-black text-rose-300 leading-tight">
              {zone.name}
            </span>
            <span className="text-[11px] font-semibold text-slate-400 mt-0.5">
              Grupo: <strong className="text-slate-200">{zone.muscleGroup}</strong>
            </span>
          </div>
        </div>

        {/* Mecanismo Típico en Fútbol */}
        {zone.mecanismoComun && (
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/60 space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <AlertCircle size={13} />
              <span>Mecanismo Típico de Lesión (Fútbol)</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              {zone.mecanismoComun}
            </p>
          </div>
        )}

        {/* Metadatos anatómicos */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/50">
            <span className="block text-[10px] text-slate-400 font-bold uppercase">
              Región anatómica
            </span>
            <span className="font-semibold text-slate-200">{zone.generalRegion}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/50">
            <span className="block text-[10px] text-slate-400 font-bold uppercase">
              Lateralidad
            </span>
            <span className="font-semibold text-slate-200">{zone.laterality || 'No aplica'}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/50 col-span-2 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              Identificador clínico
            </span>
            <code className="text-[11px] font-mono text-emerald-400 font-bold bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
              {zone.code}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}
