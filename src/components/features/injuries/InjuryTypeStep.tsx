import React from 'react';
import { AlertTriangle, Clock, ShieldCheck, FileText } from 'lucide-react';
import { InjuryFormState } from '@/hooks/useInjuryWizard';

interface InjuryTypeStepProps {
  form: InjuryFormState;
  onChange: (fields: Partial<InjuryFormState>) => void;
}

interface PathologyInfo {
  type: string;
  definition: string;
  impact: 'Bajo' | 'Moderado' | 'Alto';
  recoveryWeeks: string;
  source: string;
}

const PATHOLOGIES: Record<string, PathologyInfo> = {
  'Rotura muscular': {
    type: 'Rotura muscular',
    definition: 'Desgarro total o subtotal de las fibras musculares con solución de continuidad y hematoma localizado. Impacto funcional alto.',
    impact: 'Alto',
    recoveryWeeks: '8 — 12 semanas',
    source: 'FIFA Medical Network y British Journal of Sports Medicine (BJSM)',
  },
  'Distensión muscular': {
    type: 'Distensión muscular',
    definition: 'Elongación de las fibras musculares más allá de su límite elástico sin rotura franca macroscópica.',
    impact: 'Moderado',
    recoveryWeeks: '2 — 4 semanas',
    source: 'UEFA Elite Club Injury Studies',
  },
  'Sobrecarga': {
    type: 'Sobrecarga',
    definition: 'Fatiga muscular por estrés mecánico reiterado con acumulación de metabolitos y pérdida temporal de elasticidad.',
    impact: 'Bajo',
    recoveryWeeks: '5 — 10 días',
    source: 'Gaspari et al., Muscle Strain Guidelines',
  },
  'Tendinopatía': {
    type: 'Tendinopatía',
    definition: 'Proceso degenerativo y sobreuso del colágeno tendinoso con dolor localizado en la inserción o cuerpo del tendón.',
    impact: 'Moderado',
    recoveryWeeks: '4 — 8 semanas',
    source: 'Cook & Purdam, Tendon Pathology Continuum',
  },
  'Esguince': {
    type: 'Esguince',
    definition: 'Lesión por torsión o tracción forzada de los ligamentos estabilizadores de la articulación afectada.',
    impact: 'Moderado',
    recoveryWeeks: '3 — 6 semanas',
    source: 'FIFA Football Medicine Manual',
  },
  'Contusión': {
    type: 'Contusión',
    definition: 'Traumatismo directo con hematoma intramuscular o intersticial sin ruptura ligamentosa mayor.',
    impact: 'Bajo',
    recoveryWeeks: '1 — 2 semanas',
    source: 'FIFA Medical Guidelines',
  },
  'Fractura': {
    type: 'Fractura',
    definition: 'Pérdida de continuidad ósea que requiere inmovilización y consolidación radiológica documentada.',
    impact: 'Alto',
    recoveryWeeks: '10 — 20 semanas',
    source: 'AO Trauma Clinical Guidelines',
  },
  'Luxación': {
    type: 'Luxación',
    definition: 'Pérdida permanente de congruencia de las superficies articulares con compromiso de la cápsula.',
    impact: 'Alto',
    recoveryWeeks: '6 — 12 semanas',
    source: 'UEFA Medical Committee Standards',
  },
  'Dolor inespecífico': {
    type: 'Dolor inespecífico',
    definition: 'Molestia o limitación funcional sin hallazgos concluyentes en pruebas clínicas preliminares.',
    impact: 'Bajo',
    recoveryWeeks: '3 — 7 días',
    source: 'Protocolo de Valoración Inicial',
  },
  'Otra': {
    type: 'Otra',
    definition: 'Patología no clasificada en el catálogo estándar. Especificar detalles en la descripción médica.',
    impact: 'Moderado',
    recoveryWeeks: 'A determinar',
    source: 'Criterio de Servicios Médicos del Club',
  },
};

export function InjuryTypeStep({ form, onChange }: InjuryTypeStepProps) {
  const currentPathology = PATHOLOGIES[form.tipoLesion] || PATHOLOGIES['Rotura muscular'];

  const handleSelectType = (type: string) => {
    const selected = PATHOLOGIES[type] || PATHOLOGIES['Rotura muscular'];
    onChange({
      tipoLesion: type,
      tiempoRecuperacionEstimado: selected.recoveryWeeks,
    });
  };

  return (
    <div className="w-full space-y-4">
      {/* Selector de tipo */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Tipo de lesión
        </label>
        <select
          value={form.tipoLesion}
          onChange={(e) => handleSelectType(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-inner"
        >
          {Object.keys(PATHOLOGIES).map((type) => (
            <option key={type} value={type} className="bg-slate-900 text-white">
              {type}
            </option>
          ))}
        </select>
      </div>

      {/* Definición clínica rápida */}
      <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Definición clínica rápida
          </span>
          <span
            className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
              currentPathology.impact === 'Alto'
                ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                : currentPathology.impact === 'Moderado'
                ? 'bg-amber-950 text-amber-300 border-amber-500/50'
                : 'bg-emerald-950 text-emerald-300 border-emerald-500/50'
            }`}
          >
            Impacto {currentPathology.impact.toLowerCase()}
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed font-medium">
          {currentPathology.definition}
        </p>
      </div>

      {/* Tarjeta destacada de recuperación orientativa */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/60 shadow-lg space-y-2 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">
              Recuperación orientativa
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">
            Pronóstico
          </span>
        </div>

        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight py-1">
          {currentPathology.recoveryWeeks}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-800/60">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span>Estimación orientativa basada en {currentPathology.source}.</span>
        </div>
      </div>

      {/* Aviso médico reglamentario en naranja */}
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200/90 text-xs leading-relaxed">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Importante:</strong> Esta estimación es orientativa y no sustituye la valoración clínica de un profesional sanitario ni determina automáticamente el alta deportiva.
        </span>
      </div>
    </div>
  );
}
