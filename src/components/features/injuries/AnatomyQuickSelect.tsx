import React from 'react';
import { QUICK_SELECT_LIST, ANATOMICAL_ZONES } from '@/hooks/useAnatomySelection';

interface AnatomyQuickSelectProps {
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function AnatomyQuickSelect({ selectedCode, onSelect }: AnatomyQuickSelectProps) {
  const currentThumbnailKey = ANATOMICAL_ZONES[selectedCode]?.thumbnailKey;

  return (
    <div className="w-full mt-3 pt-3 border-t border-slate-800/80">
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Selección rápida por región <span className="text-slate-500 font-normal">(clic para ir)</span>
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {QUICK_SELECT_LIST.map((item) => {
          const isSelected =
            selectedCode === item.defaultCode ||
            currentThumbnailKey === item.key ||
            (item.key === 'muslo_post' && selectedCode.includes('isquiotibiales'));

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.defaultCode)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl border shrink-0 transition-all cursor-pointer w-16 sm:w-18 ${
                isSelected
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20 ring-1 ring-emerald-400'
                  : 'bg-slate-900/80 border-slate-800/90 text-slate-400 hover:bg-slate-800 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-950/60 border border-slate-800/60 flex items-center justify-center p-0.5 mb-1 relative">
                <img
                  src={`/models/thumbnails/${item.key}.png`}
                  alt={item.label}
                  className="w-full h-full object-contain filter drop-shadow"
                  onError={(e) => {
                    // Fallback visual si la imagen específica no cargara
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <span className="text-[10px] font-semibold text-center truncate w-full leading-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
