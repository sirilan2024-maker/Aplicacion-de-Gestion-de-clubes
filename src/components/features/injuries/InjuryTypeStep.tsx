import React, { useState, useEffect } from 'react';
import { AlertTriangle, Clock, ShieldCheck, Activity, Bone, Scissors, Zap } from 'lucide-react';
import { InjuryFormState } from '@/hooks/useInjuryWizard';

interface InjuryTypeStepProps {
  form: InjuryFormState;
  onChange: (fields: Partial<InjuryFormState>) => void;
}

type CategoryType = 'muscular' | 'ligamentosa' | 'meniscal' | 'osea_pie';

interface PathologyOption {
  code: string;
  category: CategoryType;
  title: string;
  definition: string;
  recoveryWeeks: string;
  severity: 'Leve' | 'Moderado' | 'Grave';
  source: string;
}

const PATHOLOGIES: PathologyOption[] = [
  // === MUSCULARES (CONSENSO DE MÚNICH) ===
  {
    code: '1A',
    category: 'muscular',
    title: 'Tipo 1A — Trastorno muscular por fatiga (Sobrecarga)',
    definition: 'Hipertonía dolorosa circunscrita por sobreesfuerzo sin rotura macroscópica.',
    recoveryWeeks: '3 — 5 días',
    severity: 'Leve',
    source: 'Consenso de Múnich / BJSM',
  },
  {
    code: '1B',
    category: 'muscular',
    title: 'Tipo 1B — Daño muscular por ejercicio (DOMS / Agujetas)',
    definition: 'Microtrauma ultraestructural en sarcómeros con inflamación diferida tras trabajo excéntrico.',
    recoveryWeeks: '2 — 4 días',
    severity: 'Leve',
    source: 'Consenso de Múnich / BJSM',
  },
  {
    code: '2A',
    category: 'muscular',
    title: 'Tipo 2A — Trastorno neuromuscular de columna (Pubis/Lumbar)',
    definition: 'Contractura o pubalgia secundaria a irritación lumbopélvica o sobrecarga de entesis.',
    recoveryWeeks: '5 — 10 días',
    severity: 'Moderado',
    source: 'Consenso de Múnich / BJSM',
  },
  {
    code: '3A',
    category: 'muscular',
    title: 'Tipo 3A — Rotura fibrilar menor / Miofascial (<5mm)',
    definition: 'Desgarro anatómico limitado a la fascia muscular o pocos fascículos sin retracción mayor.',
    recoveryWeeks: '2 — 3 semanas',
    severity: 'Moderado',
    source: 'Consenso de Múnich / UEFA Study',
  },
  {
    code: '3B',
    category: 'muscular',
    title: 'Tipo 3B — Rotura fibrilar moderada / Fascicular',
    definition: 'Desgarro intramuscular significativo con hematoma ecográfico y solución de continuidad.',
    recoveryWeeks: '3 — 6 semanas',
    severity: 'Grave',
    source: 'Consenso de Múnich / UEFA Study',
  },
  {
    code: '4',
    category: 'muscular',
    title: 'Tipo 4 — Rotura completa / Avulsión tendinosa',
    definition: 'Desgarro de espesor completo del vientre o arrancamiento óseo del tendón (valoración quirúrgica).',
    recoveryWeeks: '8 — 16+ semanas',
    severity: 'Grave',
    source: 'Consenso de Múnich / BJSM',
  },

  // === LIGAMENTOSAS (RODILLA Y TOBILLO) ===
  {
    code: 'LCA_TOTAL',
    category: 'ligamentosa',
    title: 'Rotura Completa Ligamento Cruzado Anterior (LCA)',
    definition: 'Rotura completa de fibras del LCA con inestabilidad en pivote. Requiere plastia ligamentosa.',
    recoveryWeeks: '6 — 9 meses',
    severity: 'Grave',
    source: 'FIFA Medical Assessment and Research Centre (F-MARC)',
  },
  {
    code: 'LCA_PARCIAL',
    category: 'ligamentosa',
    title: 'Rotura Parcial Ligamento Cruzado Anterior (LCA)',
    definition: 'Afectación del fascículo anteromedial o posterolateral sin bostezo grosero. Tratamiento biológico o conservador.',
    recoveryWeeks: '12 — 16 semanas',
    severity: 'Grave',
    source: 'UEFA Elite Club Guidelines',
  },
  {
    code: 'LCM_MODERADO',
    category: 'ligamentosa',
    title: 'Esguince / Rotura Ligamento Colateral Medial (LCM) Grado II',
    definition: 'Rotura parcial de fibras del ligamento interno de rodilla con apertura en valgo controlada.',
    recoveryWeeks: '4 — 6 semanas',
    severity: 'Moderado',
    source: 'Knee Surgery, Sports Traumatology, Arthroscopy',
  },
  {
    code: 'TOBILLO_LPAA',
    category: 'ligamentosa',
    title: 'Rotura Ligamento Peroneoastragalino Anterior (LPAA)',
    definition: 'Esguince grave o rotura por inversión forzada del tobillo con hematoma en "huevo de paloma".',
    recoveryWeeks: '3 — 6 semanas',
    severity: 'Moderado',
    source: 'FIFA Football Medicine Manual',
  },
  {
    code: 'SINDESMOSIS',
    category: 'ligamentosa',
    title: 'Esguince de Sindesmosis Tibioperonea (Esguince Alto)',
    definition: 'Separación de la horquilla tibioperonea por rotación externa forzada del pie.',
    recoveryWeeks: '6 — 10 semanas',
    severity: 'Grave',
    source: 'British Journal of Sports Medicine (BJSM)',
  },

  // === MENISCALES (RODILLA) ===
  {
    code: 'MENISCO_INT_ASA',
    category: 'meniscal',
    title: 'Rotura Menisco Interno en Asa de Cubo / Bloqueo',
    definition: 'Rotura longitudinal desplazada con bloqueo mecánico de la rodilla. Meniscectomía parcial artroscópica.',
    recoveryWeeks: '4 — 6 semanas',
    severity: 'Grave',
    source: 'ESSKA Meniscus Consensus',
  },
  {
    code: 'MENISCO_SUTURA',
    category: 'meniscal',
    title: 'Rotura Meniscal con Sutura Meniscal (Reparación)',
    definition: 'Reparación biológica de menisco en zona roja vascularizada para conservar el cartílago.',
    recoveryWeeks: '3 — 5 meses',
    severity: 'Grave',
    source: 'FIFA Football Medicine Guidelines',
  },
  {
    code: 'MENISCO_CUERNO_POST',
    category: 'meniscal',
    title: 'Rotura de Cuerno Posterior Menisco Interno/Externo',
    definition: 'Fisura en la inserción posterior del menisco con dolor a la flexión forzada y cuclillas.',
    recoveryWeeks: '3 — 5 semanas',
    severity: 'Moderado',
    source: 'UEFA Medical Studies',
  },

  // === HUESO / PIE: TARSO, METATARSO Y PUBALGIA ===
  {
    code: 'JONES_FRACTURA',
    category: 'osea_pie',
    title: 'Fractura de Jones (Base del 5º Metatarsiano)',
    definition: 'Fractura en la unión metafisodiafisaria del 5º metatarso con riesgo alto de pseudoartrosis en futbolistas.',
    recoveryWeeks: '8 — 12 semanas',
    severity: 'Grave',
    source: 'American Academy of Orthopaedic Surgeons (AAOS)',
  },
  {
    code: 'TARSO_NAVICULAR',
    category: 'osea_pie',
    title: 'Fractura por Estrés de Escafoides Tarsiano (Navicular)',
    definition: 'Microfractura por sobrecarga cíclica en el vértice del mediopié. Exige descarga estricta.',
    recoveryWeeks: '10 — 14 semanas',
    severity: 'Grave',
    source: 'British Journal of Sports Medicine (BJSM)',
  },
  {
    code: 'METATARSALGIA',
    category: 'osea_pie',
    title: 'Metatarsalgia / Periostitis de Metatarsos (1º a 4º)',
    definition: 'Sobrecarga mecánica de las cabezas metatarsales por tacos en césped sintético rígido.',
    recoveryWeeks: '2 — 4 semanas',
    severity: 'Leve',
    source: 'FIFA Football Medicine Manual',
  },
  {
    code: 'PUBALGIA_ATLETICA',
    category: 'osea_pie',
    title: 'Pubalgia Atlética / Osteopatía Dinámica de Pubis',
    definition: 'Edema óseo en ramas púbicas por conflicto de fuerzas entre recto abdominal y aductor largo.',
    recoveryWeeks: '6 — 12 semanas',
    severity: 'Grave',
    source: 'Doha Consensus on Groin Pain in Athletes',
  },
];

export function InjuryTypeStep({ form, onChange }: InjuryTypeStepProps) {
  // Deducir automáticamente la categoría según la zona seleccionada
  const defaultCategory: CategoryType = form.zonaCode?.includes('ligamento') || form.zonaCode?.includes('sindesmosis')
    ? 'ligamentosa'
    : form.zonaCode?.includes('menisco')
    ? 'meniscal'
    : form.zonaCode?.includes('tarso') || form.zonaCode?.includes('metatarso') || form.zonaCode?.includes('pubis')
    ? 'osea_pie'
    : 'muscular';

  const [activeCategory, setActiveCategory] = useState<CategoryType>(defaultCategory);

  useEffect(() => {
    setActiveCategory(defaultCategory);
  }, [form.zonaCode]);

  const filteredPathologies = PATHOLOGIES.filter((p) => p.category === activeCategory);
  const selectedPathology = PATHOLOGIES.find((p) => p.title === form.tipoLesion) || filteredPathologies[0];

  const handleSelectPathology = (p: PathologyOption) => {
    onChange({
      tipoLesion: p.title,
      tiempoRecuperacionEstimado: p.recoveryWeeks,
      gravedad: p.severity,
      munichGrade: (p.code as any) || '3A',
    });
  };

  return (
    <div className="w-full space-y-4 max-h-[460px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800">
      {/* Selector de Pestaña de Tejido / Clasificación */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
          Clasificación Médica por Tejido Afectado
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveCategory('muscular')}
            className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              activeCategory === 'muscular'
                ? 'bg-rose-950 border border-rose-500 text-rose-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity size={13} />
            <span>Músculo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('ligamentosa')}
            className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              activeCategory === 'ligamentosa'
                ? 'bg-amber-950 border border-amber-500 text-amber-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Zap size={13} />
            <span>Ligamentos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('meniscal')}
            className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              activeCategory === 'meniscal'
                ? 'bg-blue-950 border border-blue-500 text-blue-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scissors size={13} />
            <span>Meniscos</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('osea_pie')}
            className={`py-2 px-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              activeCategory === 'osea_pie'
                ? 'bg-emerald-950 border border-emerald-500 text-emerald-300 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Bone size={13} />
            <span>Pie / Pubis</span>
          </button>
        </div>
      </div>

      {/* Lista de Patologías según la Categoría */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-slate-400 uppercase">
          Diagnóstico Específico
        </label>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5 scrollbar-thin scrollbar-thumb-slate-800">
          {filteredPathologies.map((p) => {
            const isSelected = form.tipoLesion === p.title;

            return (
              <button
                key={p.code}
                type="button"
                onClick={() => handleSelectPathology(p)}
                className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500 shadow-md ring-1 ring-emerald-500/40 text-white'
                    : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-900 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2.5 pr-2">
                  <span
                    className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] font-mono border shrink-0 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    {p.code.slice(0, 3)}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200 leading-tight">
                      {p.title}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Baja orientativa: <strong className="text-emerald-400">{p.recoveryWeeks}</strong>
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${
                    p.severity === 'Leve'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : p.severity === 'Moderado'
                      ? 'bg-amber-950 text-amber-300 border-amber-800'
                      : 'bg-rose-950 text-rose-300 border-rose-800'
                  }`}
                >
                  {p.severity}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Definición Clínica */}
      {selectedPathology && (
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Criterio Clínico y Anatomopatológico
          </span>
          <p className="text-xs text-slate-300 leading-relaxed font-medium">
            {selectedPathology.definition}
          </p>
        </div>
      )}

      {/* Tarjeta Destacada de Recuperación */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-700/60 shadow-lg space-y-2 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-emerald-400" />
            <span className="text-xs font-bold text-slate-200">
              Tiempo de Recuperación Estimado (Baja Deportiva)
            </span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-bold">
            Pronóstico
          </span>
        </div>

        <div className="text-2xl sm:text-3xl font-black text-white tracking-tight py-0.5">
          {form.tiempoRecuperacionEstimado || selectedPathology?.recoveryWeeks || 'A determinar'}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-800/60">
          <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
          <span>Fuente clínica: {selectedPathology?.source || 'FIFA & BJSM Medical Network'}.</span>
        </div>
      </div>

      {/* Aviso Médico en Naranja */}
      <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-200/90 text-xs leading-relaxed">
        <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Importante:</strong> Esta estimación es orientativa y no sustituye la valoración de los servicios médicos del club ni determina automáticamente el alta deportiva.
        </span>
      </div>
    </div>
  );
}
