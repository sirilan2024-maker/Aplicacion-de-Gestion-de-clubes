import React from 'react';
import { Check } from 'lucide-react';

interface InjuryStepperProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
}

const STEPS = [
  { id: 1, name: 'Zona Anatómica' },
  { id: 2, name: 'Tipo de Lesión' },
  { id: 3, name: 'Gravedad y Detalles' },
  { id: 4, name: 'Evolución y Resumen' },
];

export function InjuryStepper({ currentStep, onStepClick }: InjuryStepperProps) {
  return (
    <nav aria-label="Progreso del diagnóstico" className="w-full">
      <ol className="flex items-center justify-between w-full relative">
        {/* Línea conectora entre círculos */}
        <div className="absolute top-3.5 left-8 right-8 h-0.5 bg-slate-800 -z-0">
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
              {/* Círculo con número */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 ring-2 ring-emerald-400'
                    : isCompleted
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 border border-slate-700 text-slate-400 group-hover:border-slate-600'
                }`}
              >
                {isCompleted ? <Check size={13} strokeWidth={3} /> : step.id}
              </div>

              {/* Etiqueta del paso debajo del círculo */}
              <span
                className={`text-[11px] font-semibold mt-2 text-center transition-colors duration-150 ${
                  isActive
                    ? 'text-emerald-400 font-bold'
                    : isCompleted
                    ? 'text-slate-300'
                    : 'text-slate-500 group-hover:text-slate-400'
                }`}
              >
                {step.name}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
