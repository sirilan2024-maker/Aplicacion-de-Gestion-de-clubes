'use client';

import React from 'react';
import {
  Activity,
  AlertTriangle,
  Clock,
  ShieldCheck,
  PlusCircle,
  FileText,
  Calendar,
  Layers,
  ArrowRight,
  History as HistoryIcon
} from 'lucide-react';
import { ANATOMICAL_ZONES, AnatomicalZone } from '@/hooks/useAnatomySelection';
import { PlayerInjuryDTO } from '@/app/actions/injury-actions';

interface AnatomicalStructureCardProps {
  zoneCode: string;
  injuries: PlayerInjuryDTO[];
  onStartNewInjury: (zoneCode: string) => void;
  onSelectInjuryDetails: (injury: PlayerInjuryDTO) => void;
}

export function AnatomicalStructureCard({
  zoneCode,
  injuries = [],
  onStartNewInjury,
  onSelectInjuryDetails,
}: AnatomicalStructureCardProps) {
  const zone: AnatomicalZone | undefined = ANATOMICAL_ZONES[zoneCode] || ANATOMICAL_ZONES['isquiotibiales_der'];

  // Filtrar lesiones activas y antecedentes de esta estructura
  const { activeInjuries, resolvedInjuries } = React.useMemo(() => {
    const active: PlayerInjuryDTO[] = [];
    const resolved: PlayerInjuryDTO[] = [];

    const zoneNameLower = (zone?.name || '').toLowerCase();
    const zoneGroupLower = (zone?.muscleGroup || '').toLowerCase();

    injuries.forEach((inj) => {
      const bs = (inj.bodyStructure || '').toLowerCase();

      const isMatch =
        bs.includes(zoneNameLower) ||
        zoneNameLower.includes(bs) ||
        (zoneGroupLower && bs.includes(zoneGroupLower));

      if (isMatch) {
        if (inj.status === 'activa') active.push(inj);
        else resolved.push(inj);
      }
    });

    return { activeInjuries: active, resolvedInjuries: resolved };
  }, [zone, injuries]);

  if (!zone) {
    return (
      <div className="w-full h-full bg-[#0b0f17] border border-slate-800/80 rounded-2xl p-5 flex flex-col items-center justify-center text-center text-slate-500">
        <Layers size={32} className="mb-2 opacity-40 text-emerald-400" />
        <span className="text-xs font-semibold">Selecciona una estructura en el visor anatómico</span>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0b0f17] border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl space-y-4">
      {/* 1. Cabecera de la Estructura Anatómica */}
      <div className="space-y-1.5 border-b border-slate-800/60 pb-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
            {zone.generalRegion}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-bold">
            {zone.laterality || 'Bilateral'}
          </span>
        </div>

        <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
          {zone.name}
        </h3>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>Grupo: <strong className="text-slate-200">{zone.muscleGroup}</strong></span>
          <span>•</span>
          <span>Incidencia fútbol: <strong className="text-amber-400">{zone.incidencia || 'Alta'}</strong></span>
        </div>
      </div>

      {/* 2. Biomecánica y Mecanismo Lesional Típico en Fútbol */}
      {zone.mecanismoComun && (
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={12} className="text-emerald-400" />
            Mecanismo Lesional Típico en Competición
          </span>
          <p className="text-slate-300 leading-relaxed font-medium text-[11px]">
            {zone.mecanismoComun}
          </p>
        </div>
      )}

      {/* 3. Lesión Activa (si existe en esta zona) */}
      {activeInjuries.length > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase text-rose-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Episodio Activo en Tratamiento
            </span>
            <span className="text-[10px] font-bold text-slate-500 font-mono">
              Fase: Fase 1 (Aguda)
            </span>
          </div>

          {activeInjuries.map((inj) => (
            <div
              key={inj.id}
              onClick={() => onSelectInjuryDetails(inj)}
              className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/40 hover:border-rose-400 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white leading-tight">
                  {inj.injuryType}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Fecha lesión: <strong className="text-slate-200">{inj.injuryDate}</strong> • Gravedad: <strong className="text-rose-400">{inj.severity}</strong>
                </span>
              </div>
              <ArrowRight size={14} className="text-rose-400 shrink-0" />
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-500/20 flex items-center gap-2 text-emerald-300 text-xs">
          <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
          <span>Estructura sana. No registra ninguna lesión activa actualmente.</span>
        </div>
      )}

      {/* 4. Antecedentes Históricos y Riesgo de Recidiva */}
      {resolvedInjuries.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold uppercase text-amber-400 flex items-center gap-1.5">
            <HistoryIcon size={13} />
            Antecedentes Previos en esta Estructura ({resolvedInjuries.length})
          </span>
          <div className="space-y-1">
            {resolvedInjuries.slice(0, 2).map((hist) => (
              <div key={hist.id} className="text-[11px] text-slate-400 flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800/60">
                <span>{hist.injuryType} ({hist.injuryDate})</span>
                <span className="text-emerald-400 font-semibold">Recuperado</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. Botón de Acción Principal: Registrar Nuevo Episodio */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => onStartNewInjury(zone.code)}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle size={15} />
          <span>Iniciar Registro Clínico en {zone.name}</span>
        </button>
      </div>
    </div>
  );
}
