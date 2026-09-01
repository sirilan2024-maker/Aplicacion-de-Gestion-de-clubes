import React from 'react';
import { ChevronLeft, ChevronRight, Check, X, Loader2 } from 'lucide-react';

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
    <footer className="flex items-center justify-between px-6 py-3.5 border-t border-[#1c2436] bg-[#0c1017]">
      {/* Botón Cancelar a la izquierda (Exacto al mockup) */}
      <button
        type="button"
        onClick={onCancel}
        disabled={saving}
        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-transparent hover:bg-slate-800/80 border border-slate-700/80 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
      >
        <X size={14} />
        <span>Cancelar</span>
      </button>

      {/* Botones de navegación a la derecha */}
      <div className="flex items-center gap-3">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={onPrev}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-[#101522] border border-slate-700/80 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
          >
            <ChevronLeft size={15} />
            <span>Anterior</span>
          </button>
        )}

        {isLastStep ? (
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-500/25 cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Check size={14} strokeWidth={3} />
            )}
            <span>Guardar Lesión</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onNext}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all shadow-md shadow-emerald-500/25 cursor-pointer inline-flex items-center gap-1.5"
          >
            <span>Siguiente</span>
            <ChevronRight size={15} />
          </button>
        )}
      </div>
    </footer>
  );
}
