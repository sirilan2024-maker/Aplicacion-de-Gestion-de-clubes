import React from 'react';
import { ShieldAlert, CheckCircle2, Clock, Calendar, ArrowDown } from 'lucide-react';
import { InjuryFormState } from '@/hooks/useInjuryWizard';

interface InjurySummaryProps {
  form: InjuryFormState;
}

export function InjurySummary({ form }: InjurySummaryProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatShortDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full space-y-4 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Resumen de la lesión
        </h4>
        <span className="text-[10px] text-emerald-400 font-bold">Paso final</span>
      </div>

      {/* Tarjeta de Resumen */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3 shadow-inner">
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Zona anatómica
            </span>
            <span className="font-black text-rose-400">{form.zonaAnatomica}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Tipo de lesión
            </span>
            <span className="font-black text-white">{form.tipoLesion}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Gravedad
            </span>
            <span className="font-bold text-amber-400">{form.gravedad}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Estado inicial
            </span>
            <span className="font-bold text-rose-400">{form.estado}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Fecha inicio
            </span>
            <span className="font-semibold text-slate-200">{formatDate(form.fechaInicio)}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60">
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Alta estimada
            </span>
            <span className="font-semibold text-emerald-400">{formatDate(form.fechaAltaEstimada)}</span>
          </div>

          <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800/60 col-span-2">
            <span className="block text-[10px] uppercase font-bold text-slate-400">
              Recuperación estimada
            </span>
            <span className="font-black text-white text-sm">{form.tiempoRecuperacionEstimado}</span>
          </div>
        </div>

        {form.descripcionMedica && (
          <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/50 text-[11px] text-slate-300">
            <strong className="block text-slate-400 uppercase text-[10px] mb-0.5">Notas clínicas:</strong>
            {form.descripcionMedica}
          </div>
        )}
      </div>

      {/* Timeline Vertical de Hitos Médicos */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2">
        <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
          Plan de evolución deportiva
        </h5>

        <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {/* Hito 1: Lesión */}
          <div className="relative">
            <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-rose-500 ring-4 ring-slate-950" />
            <div className="text-xs">
              <span className="font-bold text-white">{formatShortDate(form.fechaInicio)}</span>
              <span className="text-slate-400 font-medium"> — Lesión detectada / Incidencia</span>
            </div>
          </div>

          {/* Hito 2: Diagnóstico */}
          <div className="relative">
            <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-amber-500 ring-4 ring-slate-950" />
            <div className="text-xs">
              <span className="font-bold text-white">Fase 1</span>
              <span className="text-slate-400 font-medium"> — Diagnóstico y reposo activo</span>
            </div>
          </div>

          {/* Hito 3: Fisioterapia */}
          <div className="relative">
            <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-slate-950" />
            <div className="text-xs">
              <span className="font-bold text-white">Fase 2</span>
              <span className="text-slate-400 font-medium"> — Inicio fisioterapia y readaptación</span>
            </div>
          </div>

          {/* Hito 4: Alta */}
          <div className="relative">
            <span className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-slate-950" />
            <div className="text-xs">
              <span className="font-bold text-emerald-400">{formatShortDate(form.fechaAltaEstimada)}</span>
              <span className="text-slate-400 font-medium"> — Alta deportiva y reincorporación</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
