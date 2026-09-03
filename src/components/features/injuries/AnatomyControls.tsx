import React from 'react';
import { RotateCw } from 'lucide-react';

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
      {/* 1. Barra de modo 3D / 2D */}
      <div>
        <div className="inline-flex p-0.5 rounded-lg bg-slate-950/90 border border-slate-800">
          <button
            type="button"
            onClick={() => onModeChange('3D')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              mode === '3D'
                ? 'bg-emerald-950/80 border border-emerald-500/80 text-emerald-400 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            3D
          </button>
          <button
            type="button"
            onClick={() => onModeChange('2D')}
            className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
              mode === '2D'
                ? 'bg-emerald-950/80 border border-emerald-500/80 text-emerald-400 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            2D
          </button>
        </div>
      </div>

      {/* 2. Barra de vistas de cámara */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onViewChange('frontal')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
            cameraView === 'frontal'
              ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-300 shadow-xs'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Frontal
        </button>
        <button
          type="button"
          onClick={() => onViewChange('posterior')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
            cameraView === 'posterior'
              ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-300 shadow-xs'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Posterior
        </button>
        <button
          type="button"
          onClick={() => onViewChange('lateral_izq')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border hidden sm:inline-flex ${
            cameraView === 'lateral_izq'
              ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-300 shadow-xs'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Lateral Izq.
        </button>
        <button
          type="button"
          onClick={() => onViewChange('lateral_der')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border hidden sm:inline-flex ${
            cameraView === 'lateral_der'
              ? 'bg-emerald-950/40 border-emerald-500/70 text-emerald-300 shadow-xs'
              : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Lateral Der.
        </button>
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/80 border border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1.5"
        >
          <RotateCw size={13} className="text-slate-400" />
          <span>Restablecer</span>
        </button>
      </div>

      {/* 3. Instrucción Guiada */}
      <div className="flex items-center gap-1.5 text-xs">
        <span className="text-emerald-400 font-bold">1.</span>
        <span className="text-white font-bold">Selecciona la región.</span>
        <span className="text-slate-400">Haz clic en el avatar para seleccionar</span>
      </div>
    </div>
  );
}
