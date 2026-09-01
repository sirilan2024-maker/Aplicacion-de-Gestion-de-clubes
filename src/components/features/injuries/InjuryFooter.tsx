import React from 'react';
import { ArrowLeft, ArrowRight, Check, X, Loader2 } from 'lucide-react';

interface InjuryFooterProps {
  currentStep: number;
  totalSteps?: number;
  saving?: boolean;
  onCancel?: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onSave?: () => void;
}

export function InjuryFooter({
  currentStep,
  totalSteps = 4,
  saving = false,
  onCancel,
  onPrev,
  onNext,
  onSave,
}: InjuryFooterProps) {
  const isLastStep = currentStep === totalSteps;

  return (
    <footer className="flex items-center justify-between px-6 py-4 border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md shrink-0">
      {/* Botón Cancelar (gris/translúcido) */}
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800 border border-slate-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
      >
        <X size={14} />
        <span>Cancelar</span>
      </button>

      {/* Botones de Navegación: Anterior, Siguiente / Guardar */}
      <div className="flex items-center gap-2.5">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={onPrev}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            <span>Anterior</span>
          </button>
        )}

        {isLastStep ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-500/30 cursor-pointer disabled:opacity-50 inline-flex items-center gap-2 hover:scale-102"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Check size={15} strokeWidth={3} />
            )}
            <span>Guardar Lesión</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-500/30 cursor-pointer inline-flex items-center gap-1.5 hover:scale-102"
          >
            <span>Siguiente</span>
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    </footer>
  );
}
