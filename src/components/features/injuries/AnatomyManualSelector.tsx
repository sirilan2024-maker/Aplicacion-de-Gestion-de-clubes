import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Check } from 'lucide-react';
import { ANATOMICAL_ZONES, AnatomicalZone } from '@/hooks/useAnatomySelection';

interface AnatomyManualSelectorProps {
  selectedCode: string;
  onSelect: (code: string) => void;
}

interface AccordionCategory {
  id: string;
  name: string;
  items: {
    groupName: string;
    subitems?: { code: string; label: string }[];
    directCode?: string;
  }[];
}

const CATEGORIES: AccordionCategory[] = [
  {
    id: 'cabeza_cuello',
    name: 'Cabeza y cuello',
    items: [
      { groupName: 'Cabeza / Facial', directCode: 'cabeza' },
      { groupName: 'Cuello / Cervical', directCode: 'cuello' },
    ],
  },
  {
    id: 'tronco',
    name: 'Tronco',
    items: [
      { groupName: 'Pectoral / Pecho', directCode: 'pecho' },
      { groupName: 'Abdomen / Core', directCode: 'abdomen' },
      { groupName: 'Espalda / Dorsal', directCode: 'dorsal' },
      { groupName: 'Zona Lumbar', directCode: 'lumbar' },
    ],
  },
  {
    id: 'miembros_sup',
    name: 'Miembros superiores',
    items: [
      {
        groupName: 'Hombro',
        subitems: [
          { code: 'hombro_izq', label: 'Hombro Izquierdo' },
          { code: 'hombro_der', label: 'Hombro Derecho' },
        ],
      },
      {
        groupName: 'Brazo',
        subitems: [
          { code: 'brazo_izq', label: 'Brazo Izquierdo' },
          { code: 'brazo_der', label: 'Brazo Derecho' },
        ],
      },
      {
        groupName: 'Codo',
        subitems: [
          { code: 'codo_izq', label: 'Codo Izquierdo' },
          { code: 'codo_der', label: 'Codo Derecho' },
        ],
      },
      {
        groupName: 'Antebrazo',
        subitems: [
          { code: 'antebrazo_izq', label: 'Antebrazo Izquierdo' },
          { code: 'antebrazo_der', label: 'Antebrazo Derecho' },
        ],
      },
      {
        groupName: 'Muñeca',
        subitems: [
          { code: 'muneca_izq', label: 'Muñeca Izquierda' },
          { code: 'muneca_der', label: 'Muñeca Derecha' },
        ],
      },
      {
        groupName: 'Mano',
        subitems: [
          { code: 'mano_izq', label: 'Mano Izquierda' },
          { code: 'mano_der', label: 'Mano Derecha' },
        ],
      },
    ],
  },
  {
    id: 'tronco_inf',
    name: 'Tronco inferior',
    items: [
      { groupName: 'Cadera / Pelvis', directCode: 'cadera' },
      {
        groupName: 'Glúteos',
        subitems: [
          { code: 'gluteo_izq', label: 'Glúteo Izquierdo' },
          { code: 'gluteo_der', label: 'Glúteo Derecho' },
        ],
      },
    ],
  },
  {
    id: 'miembros_inf',
    name: 'Miembros inferiores',
    items: [
      {
        groupName: 'Isquiotibiales',
        subitems: [
          { code: 'isquiotibiales_izq', label: 'Isquiotibiales Izquierdo' },
          { code: 'isquiotibiales_der', label: 'Isquiotibiales Derecho' },
        ],
      },
      {
        groupName: 'Cuádriceps',
        subitems: [
          { code: 'cuadriceps_izq', label: 'Cuádriceps Izquierdo' },
          { code: 'cuadriceps_der', label: 'Cuádriceps Derecho' },
        ],
      },
      {
        groupName: 'Aductores / Ingle',
        subitems: [
          { code: 'aductor_izq', label: 'Aductor Izquierdo' },
          { code: 'aductor_der', label: 'Aductor Derecho' },
        ],
      },
      {
        groupName: 'Rodilla',
        subitems: [
          { code: 'rodilla_izq', label: 'Rodilla Izquierda' },
          { code: 'rodilla_der', label: 'Rodilla Derecha' },
        ],
      },
      {
        groupName: 'Gemelos / Pantorrilla',
        subitems: [
          { code: 'gemelos_izq', label: 'Gemelo Izquierdo' },
          { code: 'gemelos_der', label: 'Gemelo Derecho' },
        ],
      },
      {
        groupName: 'Pierna / Tibia',
        subitems: [
          { code: 'pierna_izq', label: 'Pierna Izquierda' },
          { code: 'pierna_der', label: 'Pierna Derecha' },
        ],
      },
      {
        groupName: 'Tobillo',
        subitems: [
          { code: 'tobillo_izq', label: 'Tobillo Izquierdo' },
          { code: 'tobillo_der', label: 'Tobillo Derecho' },
        ],
      },
      {
        groupName: 'Pie y Dedos',
        subitems: [
          { code: 'pie_tarso_izq', label: 'Pie (tarso) Izquierdo' },
          { code: 'pie_tarso_der', label: 'Pie (tarso) Derecho' },
          { code: 'dedos_izq', label: 'Dedos Izquierdo' },
          { code: 'dedos_der', label: 'Dedos Derecho' },
        ],
      },
    ],
  },
];

export function AnatomyManualSelector({ selectedCode, onSelect }: AnatomyManualSelectorProps) {
  // Por defecto, abrir "Miembros inferiores" si la selección está en esa categoría
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    miembros_inf: true,
  });

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Selector manual
        </h4>
        <span className="text-[10px] text-slate-500">Jerarquía médica</span>
      </div>

      <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-900/40 divide-y divide-slate-800/60 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {CATEGORIES.map((cat) => {
          const isOpen = openCategories[cat.id];

          return (
            <div key={cat.id} className="text-xs">
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between p-2.5 bg-slate-900/70 hover:bg-slate-850 text-slate-300 font-semibold cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isOpen ? (
                    <FolderOpen size={15} className="text-emerald-400" />
                  ) : (
                    <Folder size={15} className="text-slate-500" />
                  )}
                  <span>{cat.name}</span>
                </div>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isOpen && (
                <div className="p-2 pl-6 bg-slate-950/50 space-y-1">
                  {cat.items.map((item, idx) => {
                    if (item.directCode) {
                      const isSelected = selectedCode === item.directCode;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onSelect(item.directCode!)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-rose-950/60 text-rose-300 font-bold border border-rose-500/40'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                          }`}
                        >
                          <span>• {item.groupName}</span>
                          {isSelected && <Check size={13} className="text-rose-400" />}
                        </button>
                      );
                    }

                    return (
                      <div key={idx} className="space-y-1">
                        <span className="block text-[11px] font-bold text-slate-400 pt-1">
                          • {item.groupName}
                        </span>
                        <div className="pl-3 space-y-0.5">
                          {item.subitems?.map((sub) => {
                            const isSelected = selectedCode === sub.code;
                            return (
                              <button
                                key={sub.code}
                                type="button"
                                onClick={() => onSelect(sub.code)}
                                className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-rose-950/70 text-rose-300 font-bold border border-rose-500/50 shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                                }`}
                              >
                                <span>{sub.label}</span>
                                {isSelected && (
                                  <span className="text-[10px] text-rose-400 font-black">
                                    ← seleccionado
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
