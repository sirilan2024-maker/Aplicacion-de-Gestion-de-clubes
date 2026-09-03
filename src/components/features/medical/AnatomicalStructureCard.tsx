'use client';

import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  ExternalLink,
  History as HistoryIcon,
  Layers,
  PlusCircle,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { ANATOMICAL_ZONES, AnatomicalZone, getSubportionsForStructure, TissueSubportion } from '@/hooks/useAnatomySelection';
import { PlayerInjuryDTO } from '@/app/actions/injury-actions';

interface AnatomicalStructureCardProps {
  zoneCode?: string | null;
  injuries: PlayerInjuryDTO[];
  selectedSubportion?: string;
  onSelectSubportion?: (subportionCode: string) => void;
  onStartNewInjury: (zoneCode?: string, subportionCode?: string) => void;
  onSelectInjuryDetails: (injury: PlayerInjuryDTO) => void;
  onResolveInjury?: (injury: PlayerInjuryDTO) => void;
}

export function AnatomicalStructureCard({
  zoneCode,
  injuries = [],
  selectedSubportion,
  onSelectSubportion,
  onStartNewInjury,
  onSelectInjuryDetails,
  onResolveInjury,
}: AnatomicalStructureCardProps) {
  const zone: AnatomicalZone | null = zoneCode ? (ANATOMICAL_ZONES[zoneCode] || null) : null;

  // Filtrar lesiones activas y antecedentes de esta estructura
  const { activeInjuries, resolvedInjuries } = React.useMemo(() => {
    if (!zone) return { activeInjuries: [], resolvedInjuries: [] };

    const active: PlayerInjuryDTO[] = [];
    const resolved: PlayerInjuryDTO[] = [];

    const zoneNameLower = (zone.name || '').toLowerCase();
    const zoneGroupLower = (zone.muscleGroup || '').toLowerCase();

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
      <div className="w-full h-full min-h-[420px] bg-[#0b0f17] border border-slate-800/80 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
          <Layers size={28} className="opacity-90" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-200">Exploración Anatómica</h4>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Toca cualquier músculo o articulación en el avatar para ver su estado clínico, antecedentes o registrar una nueva lesión.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onStartNewInjury('recto_femoral_der')}
          className="mt-2 py-2 px-4 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 transition-all flex items-center gap-2 cursor-pointer shadow-md"
        >
          <PlusCircle size={15} className="text-emerald-400" />
          <span>Registrar Lesión Manualmente</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0b0f17] border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xl space-y-4">
      {/* 1. Cabecera de la Estructura Anatómica */}
      <div className="space-y-1.5 border-b border-slate-800/60 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono">
            {zone.generalRegion}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 font-bold">
            {zone.laterality || 'Bilateral'}
          </span>
          {zone.isGoalkeeperZone && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/50 text-amber-300 font-bold flex items-center gap-1">
              🧤 Especial Portero
            </span>
          )}
        </div>

        <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
          {zone.name}
        </h3>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span>Grupo: <strong className="text-slate-200">{zone.muscleGroup}</strong></span>
          <span>•</span>
          <span>
            Incidencia fútbol:{' '}
            <strong className={zone.incidencia === 'Grave' || zone.incidencia === 'Muy Alta' ? 'text-rose-400 font-extrabold' : 'text-amber-400 font-bold'}>
              {zone.incidencia || 'Alta'}
            </strong>
          </span>
        </div>
      </div>

      {/* 2. Subdivisión y Porción Anatómica Afectada (Precisión Clínica) */}
      {(() => {
        const subportions = getSubportionsForStructure(zone.code, zone.name);
        const activeSubportion = selectedSubportion || subportions[1]?.code || subportions[0]?.code;

        return (
          <div className="space-y-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <Target size={12} className="text-emerald-400" />
                Porción Afectada (Precisión Quirúrgica)
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold">
                {subportions.find((s) => s.code === activeSubportion)?.shortLabel || 'General'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {subportions.map((sub) => {
                const isSelected = activeSubportion === sub.code;
                return (
                  <button
                    key={sub.code}
                    type="button"
                    onClick={() => onSelectSubportion?.(sub.code)}
                    className={`p-2 rounded-lg text-left text-[11px] font-semibold transition-all border cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-emerald-950/90 border-emerald-500 text-white shadow-xs shadow-emerald-500/20'
                        : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold truncate">{sub.shortLabel}</span>
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                          isSelected ? 'bg-emerald-500 text-black font-black' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        M{sub.munichSuggested}
                      </span>
                    </div>
                    <span className="text-[9px] opacity-75 line-clamp-1 mt-0.5">{sub.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* 3. Biomecánica y Mecanismo Lesional Típico en Fútbol */}
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

      {/* 4. Lesión Activa (si existe en esta zona) */}
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
              className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/40 hover:border-rose-400 transition-all flex items-center justify-between gap-2"
            >
              <div
                onClick={() => onSelectInjuryDetails(inj)}
                className="flex flex-col cursor-pointer flex-1"
              >
                <span className="text-xs font-bold text-white leading-tight">
                  {inj.injuryType}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Fecha lesión: <strong className="text-slate-200">{inj.injuryDate}</strong> • Gravedad: <strong className="text-rose-400">{inj.severity}</strong>
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onResolveInjury && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onResolveInjury(inj);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Dar de alta médica a este episodio"
                  >
                    <ShieldCheck size={12} />
                    <span>Dar Alta</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onSelectInjuryDetails(inj)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <ArrowRight size={14} className="text-rose-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-950/15 border border-emerald-500/20 flex items-center gap-2 text-emerald-300 text-xs">
          <ShieldCheck size={16} className="text-emerald-400 shrink-0" />
          <span>Estructura sana. No registra ninguna lesión activa actualmente.</span>
        </div>
      )}

      {/* 5. Antecedentes Históricos y Riesgo de Recidiva */}
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

      {/* 6. Botón de Acción Principal: Registrar Nuevo Episodio */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => {
            const subportions = getSubportionsForStructure(zone.code, zone.name);
            const activeSub = selectedSubportion || subportions[1]?.code || subportions[0]?.code;
            onStartNewInjury(zone.code, activeSub);
          }}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 transition-all shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
        >
          <PlusCircle size={15} />
          <span>Iniciar Registro Clínico en {zone.name}</span>
        </button>
      </div>
    </div>
  );
}
