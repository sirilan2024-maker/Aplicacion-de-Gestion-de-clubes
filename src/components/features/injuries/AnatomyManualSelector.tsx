import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Check } from 'lucide-react';
import { ANATOMICAL_ZONES } from '@/hooks/useAnatomySelection';

interface AnatomyManualSelectorProps {
  selectedCode: string;
  onSelect: (code: string) => void;
}

interface AccordionCategory {
  id: string;
  name: string;
  items: {
    groupName: string;
    subitems?: { code: string; label: string; incidencia?: string }[];
    directCode?: string;
  }[];
}

const CATEGORIES: AccordionCategory[] = [
  {
    id: 'pubis_pelvis',
    name: 'Pubis / Pubalgia / Sínfisis Púbica',
    items: [
      {
        groupName: 'Sínfisis Púbica y Entesis',
        subitems: [
          { code: 'pubis', label: 'Pubis / Sínfisis Púbica (Pubalgia Global)', incidencia: 'Muy Alta' },
          { code: 'pubis_der', label: 'Pubis (Inserción Aductor Derecho)', incidencia: 'Muy Alta' },
          { code: 'pubis_izq', label: 'Pubis (Inserción Aductor Izquierdo)', incidencia: 'Muy Alta' },
        ],
      },
      {
        groupName: 'Aductores e Ingle',
        subitems: [
          { code: 'aductor_largo_der', label: 'Aductor largo Derecho', incidencia: 'Muy Alta' },
          { code: 'aductor_largo_izq', label: 'Aductor largo Izquierdo', incidencia: 'Muy Alta' },
          { code: 'aductor_mayor_der', label: 'Aductor mayor Derecho', incidencia: 'Moderada' },
          { code: 'aductor_mayor_izq', label: 'Aductor mayor Izquierdo', incidencia: 'Moderada' },
          { code: 'gracilis_der', label: 'Gracilis (Recto interno) Der.', incidencia: 'Leve' },
          { code: 'gracilis_izq', label: 'Gracilis (Recto interno) Izq.', incidencia: 'Leve' },
          { code: 'psoas_der', label: 'Psoas ilíaco Derecho', incidencia: 'Moderada' },
          { code: 'psoas_izq', label: 'Psoas ilíaco Izquierdo', incidencia: 'Moderada' },
          { code: 'pectineo_der', label: 'Pectíneo Derecho', incidencia: 'Leve' },
          { code: 'pectineo_izq', label: 'Pectíneo Izquierdo', incidencia: 'Leve' },
        ],
      },
    ],
  },
  {
    id: 'cuadriceps',
    name: 'Cuádriceps (Muslo Anterior Completo)',
    items: [
      {
        groupName: 'Recto anterior (biarticular - golpeo/sprint)',
        subitems: [
          { code: 'recto_anterior_der', label: 'Recto anterior Derecho', incidencia: 'Grave' },
          { code: 'recto_anterior_izq', label: 'Recto anterior Izquierdo', incidencia: 'Grave' },
        ],
      },
      {
        groupName: 'Vastos (Monoarticulares)',
        subitems: [
          { code: 'vasto_lateral_der', label: 'Vasto lateral Derecho', incidencia: 'Moderada' },
          { code: 'vasto_lateral_izq', label: 'Vasto lateral Izquierdo', incidencia: 'Moderada' },
          { code: 'vasto_medial_der', label: 'Vasto medial Derecho (Gota rotuliana)', incidencia: 'Moderada' },
          { code: 'vasto_medial_izq', label: 'Vasto medial Izquierdo (Gota rotuliana)', incidencia: 'Moderada' },
          { code: 'vasto_intermedio_der', label: 'Vasto intermedio (Crural) Derecho', incidencia: 'Moderada' },
          { code: 'vasto_intermedio_izq', label: 'Vasto intermedio (Crural) Izquierdo', incidencia: 'Moderada' },
        ],
      },
      {
        groupName: 'Tendón Cuadricipital y Sartorio',
        subitems: [
          { code: 'tendon_cuadricipital_der', label: 'Tendón cuadricipital Derecho', incidencia: 'Grave' },
          { code: 'tendon_cuadricipital_izq', label: 'Tendón cuadricipital Izquierdo', incidencia: 'Grave' },
          { code: 'sartorio_der', label: 'Sartorio Derecho', incidencia: 'Leve' },
          { code: 'sartorio_izq', label: 'Sartorio Izquierdo', incidencia: 'Leve' },
        ],
      },
    ],
  },
  {
    id: 'isquiotibiales',
    name: 'Isquiotibiales (Muslo Posterior)',
    items: [
      {
        groupName: 'Bíceps femoral',
        subitems: [
          { code: 'biceps_femoral_larga_der', label: 'Bíceps femoral (Cabeza larga) Der.', incidencia: 'Muy Alta' },
          { code: 'biceps_femoral_larga_izq', label: 'Bíceps femoral (Cabeza larga) Izq.', incidencia: 'Muy Alta' },
          { code: 'biceps_femoral_corta_der', label: 'Bíceps femoral (Cabeza corta) Der.', incidencia: 'Baja' },
          { code: 'biceps_femoral_corta_izq', label: 'Bíceps femoral (Cabeza corta) Izq.', incidencia: 'Baja' },
        ],
      },
      {
        groupName: 'Complejo Semitendinoso / Semimembranoso',
        subitems: [
          { code: 'semitendinoso_der', label: 'Semitendinoso Derecho', incidencia: 'Alta' },
          { code: 'semitendinoso_izq', label: 'Semitendinoso Izquierdo', incidencia: 'Alta' },
          { code: 'semimembranoso_der', label: 'Semimembranoso Derecho', incidencia: 'Moderada' },
          { code: 'semimembranoso_izq', label: 'Semimembranoso Izquierdo', incidencia: 'Moderada' },
        ],
      },
    ],
  },
  {
    id: 'pantorrilla_triceps',
    name: 'Sóleo y Pierna / Pantorrilla (Tríceps Sural)',
    items: [
      {
        groupName: 'Sóleo (Fatiga / Sobrecarga continua)',
        subitems: [
          { code: 'soleo_der', label: 'Sóleo Derecho', incidencia: 'Alta' },
          { code: 'soleo_izq', label: 'Sóleo Izquierdo', incidencia: 'Alta' },
        ],
      },
      {
        groupName: 'Gastrocnemios (Gemelos)',
        subitems: [
          { code: 'gastrocnemio_medial_der', label: 'Gemelo interno (Gastrocnemio medial) Der.', incidencia: 'Muy Alta' },
          { code: 'gastrocnemio_medial_izq', label: 'Gemelo interno (Gastrocnemio medial) Izq.', incidencia: 'Muy Alta' },
          { code: 'gastrocnemio_lateral_der', label: 'Gemelo externo (Gastrocnemio lateral) Der.', incidencia: 'Moderada' },
          { code: 'gastrocnemio_lateral_izq', label: 'Gemelo externo (Gastrocnemio lateral) Izq.', incidencia: 'Moderada' },
          { code: 'plantar_delgado_der', label: 'Plantar delgado Derecho ("Pedrada")', incidencia: 'Leve' },
          { code: 'plantar_delgado_izq', label: 'Plantar delgado Izquierdo ("Pedrada")', incidencia: 'Leve' },
        ],
      },
      {
        groupName: 'Compartimentos Anterior y Lateral',
        subitems: [
          { code: 'tibial_anterior_der', label: 'Tibial anterior Derecho', incidencia: 'Leve' },
          { code: 'tibial_anterior_izq', label: 'Tibial anterior Izquierdo', incidencia: 'Leve' },
          { code: 'peroneos_der', label: 'Peroneos lateral Derecho', incidencia: 'Moderada' },
          { code: 'peroneos_izq', label: 'Peroneos lateral Izquierdo', incidencia: 'Moderada' },
        ],
      },
    ],
  },
  {
    id: 'rodilla_meniscos_ligamentos',
    name: 'Rodilla: Meniscos y Ligamentos',
    items: [
      {
        groupName: 'Meniscos (Fibrocartílago)',
        subitems: [
          { code: 'menisco_interno_der', label: 'Rotura Menisco Interno Derecho', incidencia: 'Alta' },
          { code: 'menisco_interno_izq', label: 'Rotura Menisco Interno Izquierdo', incidencia: 'Alta' },
          { code: 'menisco_externo_der', label: 'Rotura Menisco Externo Derecho', incidencia: 'Moderada' },
          { code: 'menisco_externo_izq', label: 'Rotura Menisco Externo Izquierdo', incidencia: 'Moderada' },
        ],
      },
      {
        groupName: 'Ligamentos Cruzados y Colaterales',
        subitems: [
          { code: 'ligamento_cruzado_ant_der', label: 'Rotura LCA (Cruzado Anterior) Der.', incidencia: 'Grave' },
          { code: 'ligamento_cruzado_ant_izq', label: 'Rotura LCA (Cruzado Anterior) Izq.', incidencia: 'Grave' },
          { code: 'ligamento_cruzado_post_der', label: 'Rotura LCP (Cruzado Posterior) Der.', incidencia: 'Grave' },
          { code: 'ligamento_cruzado_post_izq', label: 'Rotura LCP (Cruzado Posterior) Izq.', incidencia: 'Grave' },
          { code: 'ligamento_colateral_medial_der', label: 'Ligamento Colateral Medial (LCM) Der.', incidencia: 'Muy Alta' },
          { code: 'ligamento_colateral_medial_izq', label: 'Ligamento Colateral Medial (LCM) Izq.', incidencia: 'Muy Alta' },
          { code: 'tendon_rotuliano_der', label: 'Tendón rotuliano Derecho', incidencia: 'Grave' },
          { code: 'tendon_rotuliano_izq', label: 'Tendón rotuliano Izquierdo', incidencia: 'Grave' },
        ],
      },
    ],
  },
  {
    id: 'tobillo_pie_tarso_metatarso',
    name: 'Tobillo, Tarso y Metatarso (Pie)',
    items: [
      {
        groupName: 'Ligamentos de Tobillo y Aquiles',
        subitems: [
          { code: 'tobillo_ligamentos_der', label: 'Rotura / Esguince LPAA Tobillo Der.', incidencia: 'Muy Alta' },
          { code: 'tobillo_ligamentos_izq', label: 'Rotura / Esguince LPAA Tobillo Izq.', incidencia: 'Muy Alta' },
          { code: 'sindesmosis_tobillo_der', label: 'Esguince Sindesmosis (Alto) Der.', incidencia: 'Grave' },
          { code: 'sindesmosis_tobillo_izq', label: 'Esguince Sindesmosis (Alto) Izq.', incidencia: 'Grave' },
          { code: 'tendon_aquiles_der', label: 'Rotura / Tendinopatía Aquiles Der.', incidencia: 'Grave' },
          { code: 'tendon_aquiles_izq', label: 'Rotura / Tendinopatía Aquiles Izq.', incidencia: 'Grave' },
        ],
      },
      {
        groupName: 'Tarso (Huesos del mediopié)',
        subitems: [
          { code: 'tarso_navicular_der', label: 'Tarso / Escafoides (Navicular) Der.', incidencia: 'Grave' },
          { code: 'tarso_navicular_izq', label: 'Tarso / Escafoides (Navicular) Izq.', incidencia: 'Grave' },
        ],
      },
      {
        groupName: 'Metatarso (Antepié)',
        subitems: [
          { code: 'metatarso_5to_der', label: '5º Metatarsiano (Fractura de Jones) Der.', incidencia: 'Grave' },
          { code: 'metatarso_5to_izq', label: '5º Metatarsiano (Fractura de Jones) Izq.', incidencia: 'Grave' },
          { code: 'metatarso_general_der', label: 'Metatarsalgia (1º a 4º) Derecho', incidencia: 'Moderada' },
          { code: 'metatarso_general_izq', label: 'Metatarsalgia (1º a 4º) Izquierdo', incidencia: 'Moderada' },
        ],
      },
    ],
  },
  {
    id: 'gluteos_cadera',
    name: 'Glúteos y Pelvis Posterior',
    items: [
      {
        groupName: 'Glúteos',
        subitems: [
          { code: 'gluteo_mayor_der', label: 'Glúteo mayor Derecho', incidencia: 'Moderada' },
          { code: 'gluteo_mayor_izq', label: 'Glúteo mayor Izquierdo', incidencia: 'Moderada' },
          { code: 'gluteo_medio_der', label: 'Glúteo medio/menor Der.', incidencia: 'Moderada' },
          { code: 'gluteo_medio_izq', label: 'Glúteo medio/menor Izq.', incidencia: 'Moderada' },
        ],
      },
    ],
  },
  {
    id: 'tronco_superior',
    name: 'Tronco y Cabeza',
    items: [
      { groupName: 'Recto abdominal / Core', directCode: 'abdomen' },
      { groupName: 'Zona Lumbar / Paravertebrales', directCode: 'lumbar' },
      { groupName: 'Pectoral / Tórax', directCode: 'pecho' },
      { groupName: 'Dorsal ancho / Espalda alta', directCode: 'dorsal' },
      { groupName: 'Hombro Derecho', directCode: 'hombro_der' },
      { groupName: 'Hombro Izquierdo', directCode: 'hombro_izq' },
      { groupName: 'Cuello / Cervical', directCode: 'cuello' },
      { groupName: 'Cabeza / Región Craneofacial', directCode: 'cabeza' },
    ],
  },
];

export function AnatomyManualSelector({ selectedCode, onSelect }: AnatomyManualSelectorProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    pubis_pelvis: true,
    cuadriceps: false,
    isquiotibiales: false,
    pantorrilla_triceps: false,
  });

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Selector Anatómico por Vientre
        </h4>
        <span className="text-[10px] text-emerald-400 font-bold">Catálogo fútbol</span>
      </div>

      <div className="border border-slate-800/80 rounded-2xl overflow-hidden bg-slate-900/40 divide-y divide-slate-800/60 max-h-76 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
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
                <div className="p-2 pl-5 bg-slate-950/50 space-y-1">
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
                              ? 'bg-rose-950/70 text-rose-300 font-bold border border-rose-500/50'
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
                                    ? 'bg-rose-950/80 text-rose-300 font-bold border border-rose-500/60 shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                                }`}
                              >
                                <span className="truncate pr-2">{sub.label}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  {sub.incidencia && (
                                    <span
                                      className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                                        sub.incidencia === 'Muy Alta' || sub.incidencia === 'Grave'
                                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                                          : sub.incidencia === 'Alta'
                                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                          : 'bg-slate-900 text-slate-400 border border-slate-800'
                                      }`}
                                    >
                                      {sub.incidencia}
                                    </span>
                                  )}
                                  {isSelected && (
                                    <Check size={12} className="text-rose-400 shrink-0" />
                                  )}
                                </div>
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
