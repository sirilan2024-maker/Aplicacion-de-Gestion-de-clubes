import React from 'react';
import { Check } from 'lucide-react';

interface InjuryStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const STEPS = [
  { id: 1, name: 'Zona Anatómica', short: 'Zona' },
  { id: 2, name: 'Tipo de Lesión', short: 'Tipo' },
  { id: 3, name: 'Gravedad y Detalles', short: 'Gravedad' },
  { id: 4, name: 'Evolución y Resumen', short: 'Resumen' },
];

export function InjuryStepper({ currentStep, onStepClick }: InjuryStepperProps) {
  return (
    <nav aria-label="Progreso del diagnóstico" className="w-full pb-4 border-b border-slate-800/80">
      <ol className="flex items-center justify-between w-full relative">
        {/* Línea de conexión */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-800 -z-0">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {STEPS.map((step) => {
          const isCompleted = currentStep > step.id;
          const isActive = currentStep === step.id;

          return (
            <li
              key={step.id}
              className="flex flex-col items-center relative z-10 cursor-pointer group"
              onClick={() => onStepClick?.(step.id)}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 border-2 ${
                  isCompleted
                    ? 'bg-emerald-600 border-emerald-500 text-white shadow-xs shadow-emerald-500/30'
                    : isActive
                    ? 'bg-slate-900 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/20 ring-4 ring-emerald-500/20'
                    : 'bg-slate-900 border-slate-700 text-slate-500 group-hover:border-slate-500 group-hover:text-slate-400'
                }`}
              >
                {isCompleted ? <Check size={14} strokeWidth={3} /> : step.id}
              </div>

              <span
                className={`text-[11px] sm:text-xs font-semibold mt-2 transition-colors duration-150 text-center select-none ${
                  isActive
                    ? 'text-emerald-400 font-bold'
                    : isCompleted
                    ? 'text-slate-300'
                    : 'text-slate-500 group-hover:text-slate-400'
                }`}
              >
                <span className="hidden sm:inline">{step.name}</span>
                <span className="sm:hidden">{step.short}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
