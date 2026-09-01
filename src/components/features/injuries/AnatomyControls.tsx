import React from 'react';
import { RotateCw, Move, MousePointer, Eye } from 'lucide-react';

interface AnatomyControlsProps {
  mode: '3D' | '2D';
  onModeChange: (mode: '3D' | '2D') => void;
  cameraView: 'frontal' | 'posterior' | 'lateral_izq' | 'lateral_der';
  onViewChange: (view: 'frontal' | 'posterior' | 'lateral_izq' | 'lateral_der') => void;
  onReset: () => void;
}

export function AnatomyControls({
  mode,
  onModeChange,
  cameraView,
  onViewChange,
  onReset,
}: AnatomyControlsProps) {
  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Barra superior: Modo 3D / 2D y Botones de Cámara */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Toggle 3D / 2D */}
        <div className="inline-flex p-0.5 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
          <button
            type="button"
            onClick={() => onModeChange('3D')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              mode === '3D'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-950/60'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3D
          </button>
          <button
            type="button"
            onClick={() => onModeChange('2D')}
            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              mode === '2D'
                ? 'bg-rose-600 text-white shadow-sm shadow-rose-950/60'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2D
          </button>
        </div>

        {/* Botones de Cámara: Frontal, Posterior, Lateral Izq, Lateral Der, Restablecer */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onViewChange('frontal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              cameraView === 'frontal'
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-xs'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
            }`}
          >
            Frontal
          </button>
          <button
            type="button"
            onClick={() => onViewChange('posterior')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              cameraView === 'posterior'
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-xs'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
            }`}
          >
            Posterior
          </button>
          <button
            type="button"
            onClick={() => onViewChange('lateral_izq')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border hidden sm:inline-flex ${
              cameraView === 'lateral_izq'
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-xs'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
            }`}
          >
            Lateral Izq.
          </button>
          <button
            type="button"
            onClick={() => onViewChange('lateral_der')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border hidden sm:inline-flex ${
              cameraView === 'lateral_der'
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-xs'
                : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800 hover:border-slate-700'
            }`}
          >
            Lateral Der.
          </button>
          <button
            type="button"
            onClick={onReset}
            title="Restablecer posición de cámara"
            className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl text-xs font-bold bg-slate-900/90 text-slate-400 border border-slate-800 hover:bg-slate-800 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            <RotateCw size={13} className="text-slate-400" />
            <span className="hidden sm:inline">Restablecer</span>
          </button>
        </div>
      </div>

      {/* Instrucción Guiada Superior */}
      <div className="flex items-center gap-2 px-1">
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-black ring-1 ring-emerald-500/40">
          1
        </span>
        <p className="text-xs text-slate-300 font-medium">
          <strong className="text-white">Selecciona la región.</strong> Haz clic en el avatar para seleccionar.
        </p>
      </div>
    </div>
  );
}
