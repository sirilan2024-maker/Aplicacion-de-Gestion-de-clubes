import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FolderOpen, Info, Plus, X, Sparkles, Check } from 'lucide-react';
import { ANATOMICAL_ZONES, AnatomicalZone } from '@/hooks/useAnatomySelection';

interface AnatomyManualSelectorProps {
  selectedCode: string;
  onSelect: (code: string) => void;
  onCustomZoneCreated?: (newZone: AnatomicalZone) => void;
}

interface TreeCategory {
  id: string;
  label: string;
  subgroups: {
    id: string;
    label: string;
    zones: {
      code: string;
      label: string;
    }[];
  }[];
}

const INITIAL_ANATOMY_TREE: TreeCategory[] = [
  {
    id: 'cabeza',
    label: 'Cabeza y Cuello',
    subgroups: [
      {
        id: 'cabeza_cuello',
        label: 'Estructuras Craneofaciales y Cervicales',
        zones: [
          { code: 'cabeza_craneo', label: 'Cráneo / Conmoción' },
          { code: 'cara_maxilar', label: 'Cara y Maxilar' },
          { code: 'cuello_cervical', label: 'Cuello y Columna Cervical' },
        ],
      },
    ],
  },
  {
    id: 'tronco',
    label: 'Tronco y Core',
    subgroups: [
      {
        id: 'torax_pectoral',
        label: 'Tórax y Pectorales',
        zones: [
          { code: 'pectoral_mayor_der', label: 'Pectoral Mayor Derecho' },
          { code: 'pectoral_mayor_izq', label: 'Pectoral Mayor Izquierdo' },
        ],
      },
      {
        id: 'core_abdomen',
        label: 'Abdomen y Core',
        zones: [
          { code: 'recto_abdominal', label: 'Recto Abdominal' },
          { code: 'oblicuo_abdomen_der', label: 'Oblicuo Abdominal Derecho' },
          { code: 'oblicuo_abdomen_izq', label: 'Oblicuo Abdominal Izquierdo' },
        ],
      },
      {
        id: 'espalda_columna',
        label: 'Espalda y Columna',
        zones: [
          { code: 'erectores_columna', label: 'Erectores de Columna / Lumbar' },
          { code: 'dorsal_ancho_der', label: 'Dorsal Ancho Derecho' },
          { code: 'dorsal_ancho_izq', label: 'Dorsal Ancho Izquierdo' },
        ],
      },
    ],
  },
  {
    id: 'miembros_sup',
    label: 'Miembros Superiores (Brazos)',
    subgroups: [
      {
        id: 'hombro',
        label: 'Hombro y Deltoides',
        zones: [
          { code: 'deltoides_ant_der', label: 'Deltoides Anterior / Medio Derecho' },
          { code: 'deltoides_ant_izq', label: 'Deltoides Anterior / Medio Izquierdo' },
          { code: 'deltoides_post_der', label: 'Deltoides Posterior Derecho' },
          { code: 'deltoides_post_izq', label: 'Deltoides Posterior Izquierdo' },
          { code: 'supraespinoso_der', label: 'Manguito Rotador / Supraespinoso Der.' },
          { code: 'supraespinoso_izq', label: 'Manguito Rotador / Supraespinoso Izq.' },
        ],
      },
      {
        id: 'brazo',
        label: 'Brazo (Bíceps y Tríceps)',
        zones: [
          { code: 'biceps_braquial_der', label: 'Bíceps Braquial Derecho' },
          { code: 'biceps_braquial_izq', label: 'Bíceps Braquial Izquierdo' },
          { code: 'triceps_braquial_der', label: 'Tríceps Braquial Derecho' },
          { code: 'triceps_braquial_izq', label: 'Tríceps Braquial Izquierdo' },
        ],
      },
      {
        id: 'codo',
        label: 'Codo',
        zones: [
          { code: 'codo_der', label: 'Codo Derecho (Epicóndilo / Olécranon)' },
          { code: 'codo_izq', label: 'Codo Izquierdo (Epicóndilo / Olécranon)' },
        ],
      },
      {
        id: 'antebrazo',
        label: 'Antebrazo',
        zones: [
          { code: 'antebrazo_flexores_der', label: 'Antebrazo Flexores Derecho' },
          { code: 'antebrazo_flexores_izq', label: 'Antebrazo Flexores Izquierdo' },
          { code: 'antebrazo_extensores_der', label: 'Antebrazo Extensores Derecho' },
          { code: 'antebrazo_extensores_izq', label: 'Antebrazo Extensores Izquierdo' },
        ],
      },
      {
        id: 'muneca_mano',
        label: 'Muñeca y Mano',
        zones: [
          { code: 'muneca_mano_der', label: 'Muñeca y Mano Derecha' },
          { code: 'muneca_mano_izq', label: 'Muñeca y Mano Izquierda' },
        ],
      },
    ],
  },
  {
    id: 'tronco_inf',
    label: 'Tronco Inferior y Pelvis',
    subgroups: [
      {
        id: 'pelvis_pubis',
        label: 'Pubis e Ingle',
        zones: [
          { code: 'pubis', label: 'Sínfisis Púbica / Pubalgia' },
          { code: 'psoas_iliaco_der', label: 'Psoas Ilíaco Derecho' },
          { code: 'psoas_iliaco_izq', label: 'Psoas Ilíaco Izquierdo' },
        ],
      },
      {
        id: 'gluteos',
        label: 'Glúteos y Cadera',
        zones: [
          { code: 'gluteo_der', label: 'Glúteo Mayor / Medio Derecho' },
          { code: 'gluteo_izq', label: 'Glúteo Mayor / Medio Izquierdo' },
          { code: 'tensor_fascia_lata_der', label: 'Tensor Fascia Lata Derecho' },
          { code: 'tensor_fascia_lata_izq', label: 'Tensor Fascia Lata Izquierdo' },
        ],
      },
    ],
  },
  {
    id: 'miembros_inf',
    label: 'Miembros Inferiores (Piernas)',
    subgroups: [
      {
        id: 'isquiotibiales',
        label: 'Isquiotibiales (Posterior Muslo)',
        zones: [
          { code: 'biceps_femoral_larga_der', label: 'Bíceps Femoral (Cabeza Larga) Der.' },
          { code: 'biceps_femoral_larga_izq', label: 'Bíceps Femoral (Cabeza Larga) Izq.' },
          { code: 'semitendinoso_der', label: 'Semitendinoso Derecho' },
          { code: 'semitendinoso_izq', label: 'Semitendinoso Izquierdo' },
          { code: 'semimembranoso_der', label: 'Semimembranoso Derecho' },
          { code: 'semimembranoso_izq', label: 'Semimembranoso Izquierdo' },
          { code: 'isquiotibiales_der', label: 'Isquiotibiales Derecho (General)' },
          { code: 'isquiotibiales_izq', label: 'Isquiotibiales Izquierdo (General)' },
        ],
      },
      {
        id: 'cuadriceps',
        label: 'Cuádriceps (Anterior Muslo)',
        zones: [
          { code: 'recto_femoral_der', label: 'Recto Anterior / Femoral Derecho' },
          { code: 'recto_femoral_izq', label: 'Recto Anterior / Femoral Izquierdo' },
          { code: 'vasto_medial_der', label: 'Vasto Medial Derecho' },
          { code: 'vasto_medial_izq', label: 'Vasto Medial Izquierdo' },
          { code: 'vasto_lateral_der', label: 'Vasto Lateral Derecho' },
          { code: 'vasto_lateral_izq', label: 'Vasto Lateral Izquierdo' },
          { code: 'sartorio_der', label: 'Sartorio Derecho' },
          { code: 'sartorio_izq', label: 'Sartorio Izquierdo' },
        ],
      },
      {
        id: 'aductores',
        label: 'Aductores e Ingle',
        zones: [
          { code: 'aductor_largo_der', label: 'Aductor Largo / Medio Derecho' },
          { code: 'aductor_largo_izq', label: 'Aductor Largo / Medio Izquierdo' },
          { code: 'aductor_mayor_der', label: 'Aductor Mayor Derecho' },
          { code: 'aductor_mayor_izq', label: 'Aductor Mayor Izquierdo' },
          { code: 'pectineo_der', label: 'Pectíneo Derecho' },
          { code: 'pectineo_izq', label: 'Pectíneo Izquierdo' },
          { code: 'gracil_der', label: 'Grácil / Recto Interno Derecho' },
          { code: 'gracil_izq', label: 'Grácil / Recto Interno Izquierdo' },
        ],
      },
      {
        id: 'rodilla',
        label: 'Rodilla y Articulación',
        zones: [
          { code: 'ligamento_cruzado_ant_der', label: 'Ligamento Cruzado Anterior (LCA) Der.' },
          { code: 'ligamento_cruzado_ant_izq', label: 'Ligamento Cruzado Anterior (LCA) Izq.' },
          { code: 'menisco_interno_der', label: 'Menisco Interno Derecho' },
          { code: 'menisco_interno_izq', label: 'Menisco Interno Izquierdo' },
          { code: 'tendon_rotuliano_der', label: 'Tendón Rotuliano Derecho' },
          { code: 'tendon_rotuliano_izq', label: 'Tendón Rotuliano Izquierdo' },
        ],
      },
      {
        id: 'pantorrilla',
        label: 'Pantorrilla y Pierna',
        zones: [
          { code: 'gastrocnemio_medial_der', label: 'Gemelo Interno (Medial) Derecho' },
          { code: 'gastrocnemio_medial_izq', label: 'Gemelo Interno (Medial) Izquierdo' },
          { code: 'gastrocnemio_lateral_der', label: 'Gemelo Externo (Lateral) Derecho' },
          { code: 'gastrocnemio_lateral_izq', label: 'Gemelo Externo (Lateral) Izquierdo' },
          { code: 'soleo_der', label: 'Sóleo Derecho' },
          { code: 'soleo_izq', label: 'Sóleo Izquierdo' },
          { code: 'tibial_anterior_der', label: 'Tibial Anterior Derecho' },
          { code: 'tibial_anterior_izq', label: 'Tibial Anterior Izquierdo' },
          { code: 'peroneo_lateral_der', label: 'Peroneo Lateral Derecho' },
          { code: 'peroneo_lateral_izq', label: 'Peroneo Lateral Izquierdo' },
        ],
      },
      {
        id: 'tobillo_pie',
        label: 'Tobillo y Pie',
        zones: [
          { code: 'tobillo_der', label: 'Ligamento Lateral Tobillo Derecho' },
          { code: 'tobillo_izq', label: 'Ligamento Lateral Tobillo Izquierdo' },
          { code: 'tendon_aquiles_der', label: 'Tendón de Aquiles Derecho' },
          { code: 'tendon_aquiles_izq', label: 'Tendón de Aquiles Izquierdo' },
          { code: 'pie_der', label: 'Pie y Metatarso Derecho' },
          { code: 'pie_izq', label: 'Pie y Metatarso Izquierdo' },
        ],
      },
    ],
  },
];

export function AnatomyManualSelector({
  selectedCode,
  onSelect,
  onCustomZoneCreated,
}: AnatomyManualSelectorProps) {
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    miembros_inf: true,
  });

  const [openSubgroups, setOpenSubgroups] = useState<Record<string, boolean>>({
    isquiotibiales: true,
  });

  // Modal para añadir músculo personalizado
  const [isCustomModalOpen, setIsCustomModalOpen] = useState<boolean>(false);
  const [customName, setCustomName] = useState<string>('');
  const [customRegion, setCustomRegion] = useState<string>('Muslos y Cadera');
  const [customLaterality, setCustomLaterality] = useState<'Derecho' | 'Izquierdo' | 'Bilateral' | 'No aplica'>('Derecho');
  const [customList, setCustomList] = useState<{ code: string; label: string }[]>([]);

  const toggleCategory = (catId: string) => {
    setOpenCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const toggleSubgroup = (subId: string) => {
    setOpenSubgroups((prev) => ({ ...prev, [subId]: !prev[subId] }));
  };

  const handleCreateCustomMuscle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const code = `custom_${Date.now()}`;
    const formattedName = `${customName.trim()} (${customLaterality})`;

    const newZone: AnatomicalZone = {
      code,
      name: formattedName,
      generalRegion: customRegion,
      muscleGroup: customName.trim(),
      laterality: customLaterality,
      thumbnailKey: 'hombro',
      viewDefault: 'frontal',
      incidencia: 'Moderada',
      mecanismoComun: 'Lesión o sobrecarga deportiva específica en músculo personalizado.',
      munichDefault: '1A',
    };

    // Registrar en memoria global
    ANATOMICAL_ZONES[code] = newZone;

    // Añadir a lista de personalizados
    setCustomList((prev) => [...prev, { code, label: formattedName }]);

    // Seleccionar de inmediato
    onSelect(code);
    onCustomZoneCreated?.(newZone);

    // Cerrar modal
    setCustomName('');
    setIsCustomModalOpen(false);
  };

  return (
    <div className="w-full space-y-2">
      {/* Encabezado con botón de añadir músculo */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
          <span>Selector manual</span>
          <span className="text-slate-400 font-normal">(Jerárquico)</span>
        </h4>
        <button
          type="button"
          onClick={() => setIsCustomModalOpen(true)}
          className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
        >
          <Plus size={12} />
          <span>Añadir Músculo</span>
        </button>
      </div>

      {/* Árbol Jerárquico */}
      <div className="bg-[#0b0f17] border border-[#1b2334] rounded-xl p-2 text-xs space-y-1 max-h-[340px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
        {/* Músculos personalizados si el usuario los ha añadido */}
        {customList.length > 0 && (
          <div className="rounded-lg mb-1 p-1 bg-emerald-950/20 border border-emerald-500/30">
            <div className="text-[10px] font-bold text-emerald-400 px-1 py-0.5 flex items-center gap-1">
              <Sparkles size={11} />
              <span>Músculos Añadidos Personalizados</span>
            </div>
            <div className="space-y-0.5 pt-1">
              {customList.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => onSelect(c.code)}
                  className={`w-full text-left py-1 px-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                    selectedCode === c.code
                      ? 'bg-emerald-900/70 text-emerald-200 font-bold border border-emerald-400'
                      : 'text-slate-300 hover:bg-slate-800/40'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  <span className="truncate">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {INITIAL_ANATOMY_TREE.map((cat) => {
          const isCatOpen = !!openCategories[cat.id];
          const hasSelectedInCat = cat.subgroups.some((sg) =>
            sg.zones.some((z) => z.code === selectedCode)
          );

          return (
            <div key={cat.id} className="rounded-lg">
              {/* Botón de Categoría Principal */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`w-full flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
                  hasSelectedInCat
                    ? 'text-emerald-400 font-bold bg-emerald-950/30'
                    : 'text-slate-300 font-medium hover:bg-slate-800/40 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isCatOpen ? (
                    <FolderOpen size={14} className={hasSelectedInCat ? 'text-emerald-400' : 'text-amber-500/80'} />
                  ) : (
                    <Folder size={14} className={hasSelectedInCat ? 'text-emerald-400' : 'text-amber-500/80'} />
                  )}
                  <span>{cat.label}</span>
                </div>
                {isCatOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              </button>

              {/* Subgrupos */}
              {isCatOpen && (
                <div className="pl-4 space-y-1 pt-1 text-[11px]">
                  {cat.subgroups.map((sg) => {
                    const isSgOpen = !!openSubgroups[sg.id];
                    const hasSelectedInSg = sg.zones.some((z) => z.code === selectedCode);

                    return (
                      <div key={sg.id}>
                        {/* Botón de Subgrupo */}
                        <button
                          type="button"
                          onClick={() => toggleSubgroup(sg.id)}
                          className={`w-full flex items-center justify-between py-1 px-1.5 rounded cursor-pointer transition-colors ${
                            hasSelectedInSg
                              ? 'text-emerald-300 font-bold'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            {isSgOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                            <span>{sg.label}</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {sg.zones.length}
                          </span>
                        </button>

                        {/* Lista de Músculos / Estructuras */}
                        {isSgOpen && (
                          <div className="pl-4 space-y-0.5 pt-0.5 border-l border-slate-800 ml-2 mb-1">
                            {sg.zones.map((z) => {
                              const isSelected = selectedCode === z.code;

                              return (
                                <button
                                  key={z.code}
                                  type="button"
                                  onClick={() => onSelect(z.code)}
                                  className={`w-full text-left py-1 px-2 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
                                    isSelected
                                      ? 'bg-rose-950/80 text-rose-300 font-bold border border-rose-500/70 shadow-xs'
                                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                                  )}
                                  <span className="truncate">{z.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal para Añadir Músculo Personalizado */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b0f17] border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center">
                  <Plus size={16} className="text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Añadir Músculo Personalizado</h4>
                  <p className="text-[11px] text-slate-400">Define una nueva estructura anatómica</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCustomModalOpen(false)}
                className="text-slate-500 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomMuscle} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Nombre del Músculo o Estructura <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ej: Psoas menor, Tendón de Aquiles distal, Fascia plantar..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Región Corporal</label>
                  <select
                    value={customRegion}
                    onChange={(e) => setCustomRegion(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
                  >
                    <option value="Cabeza y Cuello">Cabeza y Cuello</option>
                    <option value="Tronco y Core">Tronco y Core</option>
                    <option value="Miembros Superiores">Miembros Superiores</option>
                    <option value="Tronco Inferior y Pelvis">Pelvis y Cadera</option>
                    <option value="Muslos y Cadera">Muslos y Cadera</option>
                    <option value="Piernas y Tobillos">Piernas y Tobillos</option>
                    <option value="Pie y Dedos">Pie y Dedos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">Lateralidad</label>
                  <select
                    value={customLaterality}
                    onChange={(e) => setCustomLaterality(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500 text-xs"
                  >
                    <option value="Derecho">Derecha</option>
                    <option value="Izquierdo">Izquierda</option>
                    <option value="Bilateral">Centro / Bilateral</option>
                    <option value="No aplica">No aplica</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30"
                >
                  <Check size={14} />
                  <span>Añadir y Seleccionar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
