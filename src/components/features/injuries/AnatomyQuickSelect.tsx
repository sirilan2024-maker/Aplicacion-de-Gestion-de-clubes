import React from 'react';

interface AnatomyQuickSelectProps {
  selectedCode: string;
  onSelect: (code: string) => void;
}

const QUICK_BUTTONS = [
  { key: 'cabeza', label: 'Cabeza', code: 'cabeza' },
  { key: 'cuello', label: 'Cuello', code: 'cuello' },
  { key: 'hombro', label: 'Hombro', code: 'hombro_der' },
  { key: 'brazo', label: 'Brazo', code: 'brazo_der' },
  { key: 'codo', label: 'Codo', code: 'codo_der' },
  { key: 'antebrazo', label: 'Antebrazo', code: 'antebrazo_der' },
  { key: 'muneca', label: 'Muñeca', code: 'muneca_der' },
  { key: 'mano', label: 'Mano', code: 'mano_der' },
  { key: 'muslo_post', label: 'Muslo post.', code: 'isquiotibiales_der' },
  { key: 'pierna', label: 'Pierna', code: 'pierna_der' },
  { key: 'tobillo', label: 'Tobillo', code: 'tobillo_der' },
  { key: 'dedos', label: 'Dedos (metatarso)', code: 'dedos_der' },
];

export function AnatomyQuickSelect({ selectedCode, onSelect }: AnatomyQuickSelectProps) {
  return (
    <div className="w-full mt-3">
      {/* Cabecera con línea divisoria fina como en el mockup */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] font-medium text-slate-400 shrink-0">
          Selección rápida
        </span>
        <div className="flex-1 h-px bg-slate-800" />
      </div>

      {/* Carrusel / Fila de iconos cuadrados */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-800">
        {QUICK_BUTTONS.map((item) => {
          const isSelected =
            selectedCode === item.code ||
            (item.key === 'muslo_post' && selectedCode.includes('isquiotibiales'));

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.code)}
              className={`flex flex-col items-center justify-center p-1 rounded-xl border shrink-0 transition-all cursor-pointer w-14 sm:w-16 h-15 ${
                isSelected
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/60 shadow-xs'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="w-7 h-7 flex items-center justify-center mb-0.5 opacity-80">
                <img
                  src={`/models/thumbnails/${item.key}.png`}
                  alt={item.label}
                  className="w-full h-full object-contain filter invert opacity-85"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="text-[9px] font-semibold text-center truncate w-full leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
