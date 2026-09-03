import React from 'react';
import { Shield, Calendar, Activity, Stethoscope } from 'lucide-react';
import { InjuryFormState } from '@/hooks/useInjuryWizard';

interface InjurySeverityStepProps {
  form: InjuryFormState;
  onChange: (fields: Partial<InjuryFormState>) => void;
}

export function InjurySeverityStep({ form, onChange }: InjurySeverityStepProps) {
  const severities: ('Leve' | 'Moderado' | 'Grave')[] = ['Leve', 'Moderado', 'Grave'];

  return (
    <div className="w-full space-y-4 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
      {/* Selector de Gravedad: Leve, Moderado, Grave */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Gravedad de la lesión
        </label>
        <div className="grid grid-cols-3 gap-2">
          {severities.map((sev) => {
            const isSelected = form.gravedad === sev;
            const colorClasses =
              sev === 'Leve'
                ? isSelected
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                : sev === 'Moderado'
                ? isSelected
                  ? 'bg-amber-950 border-amber-500 text-amber-300 shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                : isSelected
                ? 'bg-rose-950 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20 ring-1 ring-rose-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700';

            return (
              <button
                key={sev}
                type="button"
                onClick={() => onChange({ gravedad: sev })}
                className={`py-2 px-3 rounded-xl border text-xs font-black transition-all cursor-pointer text-center ${colorClasses}`}
              >
                {sev}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fechas: Inicio y Alta estimada */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-400 uppercase">
            Fecha de inicio / Incidencia
          </label>
          <div className="relative">
            <input
              type="date"
              value={form.fechaInicio}
              onChange={(e) => onChange({ fechaInicio: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-400 uppercase">
            Fecha estimada de alta
          </label>
          <div className="relative">
            <input
              type="date"
              value={form.fechaAltaEstimada}
              onChange={(e) => onChange({ fechaAltaEstimada: e.target.value })}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
            />
          </div>
        </div>
      </div>

      {/* Descripción médica */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Descripción médica y diagnóstico
        </label>
        <textarea
          value={form.descripcionMedica}
          onChange={(e) => onChange({ descripcionMedica: e.target.value })}
          rows={3}
          placeholder="Describe la lesión, diagnóstico, pruebas realizadas..."
          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner resize-none"
        />
      </div>

      {/* Tratamiento y Fisioterapia */}
      <div className="space-y-3 pt-2 border-t border-slate-800/60">
        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-400 uppercase">
            Tratamiento prescrito
          </label>
          <input
            type="text"
            value={form.tratamiento}
            onChange={(e) => onChange({ tratamiento: e.target.value })}
            placeholder="Ej. Crioterapia, compresión, reposo relativo..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-400 uppercase">
            Fisioterapia y readaptación
          </label>
          <input
            type="text"
            value={form.fisioterapia}
            onChange={(e) => onChange({ fisioterapia: e.target.value })}
            placeholder="Ej. Readaptación progresiva, trabajo isométrico..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-[11px] font-bold text-slate-400 uppercase">
            Observaciones médicas adicionales
          </label>
          <input
            type="text"
            value={form.observaciones}
            onChange={(e) => onChange({ observaciones: e.target.value })}
            placeholder="Ej. Control ecográfico a los 14 días..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner"
          />
        </div>
      </div>
    </div>
  );
}
