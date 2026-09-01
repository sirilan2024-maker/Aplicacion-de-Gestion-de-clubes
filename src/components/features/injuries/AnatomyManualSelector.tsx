import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Info } from 'lucide-react';

interface AnatomyManualSelectorProps {
  selectedCode: string;
  onSelect: (code: string) => void;
}

export function AnatomyManualSelector({ selectedCode, onSelect }: AnatomyManualSelectorProps) {
  // En el mockup, Miembros inferiores está expandido, y dentro de él, Muslo e Isquiotibiales
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    cabeza: false,
    tronco: false,
    miembros_sup: false,
    tronco_inf: false,
    miembros_inf: true,
  });

  const [openMuslo, setOpenMuslo] = useState<boolean>(true);
  const [openIsquios, setOpenIsquios] = useState<boolean>(true);

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="w-full space-y-2">
      {/* Título exacto al mockup */}
      <div className="flex items-center gap-1.5">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          Selector manual <span className="text-slate-400 font-normal">(Jerárquico)</span>
        </h4>
        <Info size={13} className="text-slate-400" />
      </div>

      {/* Caja de acordeón */}
      <div className="bg-[#0b0f17] border border-[#1b2334] rounded-xl p-2 text-xs space-y-1 max-h-[340px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {/* 1. Cabeza y cuello */}
        <div>
          <button
            type="button"
            onClick={() => toggleCategory('cabeza')}
            className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/40 text-slate-300 font-medium cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Folder size={14} className="text-amber-500/80" />
              <span>Cabeza y cuello</span>
            </div>
            <ChevronDown size={13} className="text-slate-500" />
          </button>
        </div>

        {/* 2. Tronco */}
        <div>
          <button
            type="button"
            onClick={() => toggleCategory('tronco')}
            className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/40 text-slate-300 font-medium cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Folder size={14} className="text-amber-500/80" />
              <span>Tronco</span>
            </div>
            <ChevronDown size={13} className="text-slate-500" />
          </button>
        </div>

        {/* 3. Miembros superiores */}
        <div>
          <button
            type="button"
            onClick={() => toggleCategory('miembros_sup')}
            className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/40 text-slate-300 font-medium cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Folder size={14} className="text-amber-500/80" />
              <span>Miembros superiores</span>
            </div>
            <ChevronDown size={13} className="text-slate-500" />
          </button>
        </div>

        {/* 4. Tronco inferior */}
        <div>
          <button
            type="button"
            onClick={() => toggleCategory('tronco_inf')}
            className="w-full flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-800/40 text-slate-300 font-medium cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Folder size={14} className="text-amber-500/80" />
              <span>Tronco inferior</span>
            </div>
            <ChevronDown size={13} className="text-slate-500" />
          </button>
        </div>

        {/* 5. Miembros inferiores (EXPANDIDO Y EN VERDE) */}
        <div>
          <button
            type="button"
            onClick={() => toggleCategory('miembros_inf')}
            className="w-full flex items-center justify-between p-1.5 rounded-lg text-emerald-400 font-semibold cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FolderOpen size={14} className="text-emerald-400" />
              <span>Miembros inferiores</span>
            </div>
            <ChevronDown size={13} className="text-emerald-400" />
          </button>

          {openCategories.miembros_inf && (
            <div className="pl-6 space-y-1 pt-1 text-[11px]">
              {/* • Muslo */}
              <div>
                <button
                  type="button"
                  onClick={() => setOpenMuslo(!openMuslo)}
                  className="w-full flex items-center justify-between py-1 text-slate-300 hover:text-white cursor-pointer"
                >
                  <span>• Muslo</span>
                </button>

                {openMuslo && (
                  <div className="pl-4 space-y-1">
                    {/* v Isquiotibiales */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenIsquios(!openIsquios)}
                        className="w-full flex items-center justify-between py-0.5 text-slate-300 hover:text-white cursor-pointer"
                      >
                        <span className="flex items-center gap-1">
                          <ChevronDown size={12} className="text-slate-400" />
                          <span>Isquiotibiales</span>
                        </span>
                      </button>

                      {openIsquios && (
                        <div className="pl-4 space-y-1 pt-0.5">
                          {/* • Isquiotibiales Izquierdo */}
                          <button
                            type="button"
                            onClick={() => onSelect('isquiotibiales_izq')}
                            className={`w-full text-left py-0.5 px-1.5 rounded cursor-pointer transition-colors ${
                              selectedCode === 'isquiotibiales_izq'
                                ? 'bg-emerald-950/70 text-emerald-300 font-bold border border-emerald-500/60'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            • Isquiotibiales Izquierdo
                          </button>

                          {/* ● Isquiotibiales Derecho (SELECCIONADO EN EL MOCKUP) */}
                          <button
                            type="button"
                            onClick={() => onSelect('isquiotibiales_der')}
                            className={`w-full text-left py-1 px-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                              selectedCode === 'isquiotibiales_der' || selectedCode === ''
                                ? 'bg-emerald-950/80 text-emerald-300 font-bold border border-emerald-500/70 shadow-xs'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span>Isquiotibiales Derecho</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* > Cuádriceps */}
                    <button
                      type="button"
                      onClick={() => onSelect('cuadriceps_general_der')}
                      className="w-full flex items-center justify-between py-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <ChevronRight size={12} className="text-slate-500" />
                        <span>Cuádriceps</span>
                      </span>
                      <ChevronDown size={12} className="text-slate-600" />
                    </button>

                    {/* > Aductores */}
                    <button
                      type="button"
                      onClick={() => onSelect('aductor_largo_der')}
                      className="w-full flex items-center justify-between py-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      <span className="flex items-center gap-1">
                        <ChevronRight size={12} className="text-slate-500" />
                        <span>Aductores</span>
                      </span>
                      <ChevronDown size={12} className="text-slate-600" />
                    </button>
                  </div>
                )}
              </div>

              {/* • Rodilla */}
              <div className="flex items-center justify-between py-1 text-slate-400 hover:text-slate-200 cursor-pointer">
                <span>• Rodilla</span>
                <ChevronDown size={12} className="text-slate-600" />
              </div>

              {/* • Pierna */}
              <div className="flex items-center justify-between py-1 text-slate-400 hover:text-slate-200 cursor-pointer">
                <span>• Pierna</span>
                <ChevronDown size={12} className="text-slate-600" />
              </div>

              {/* • Tobillo */}
              <div className="flex items-center justify-between py-1 text-slate-400 hover:text-slate-200 cursor-pointer">
                <span>• Tobillo</span>
                <ChevronDown size={12} className="text-slate-600" />
              </div>

              {/* • Pie */}
              <div className="flex items-center justify-between py-1 text-slate-400 hover:text-slate-200 cursor-pointer">
                <span>• Pie</span>
                <ChevronDown size={12} className="text-slate-600" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
