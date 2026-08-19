"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Shield, 
  Swords, 
  Activity, 
  RefreshCw, 
  Target, 
  CheckCircle2, 
  X,
  Loader2
} from "lucide-react";

interface Behaviour {
  id: string;
  description: string;
  age_categories: string[];
}

interface Subprinciple {
  id: string;
  name: string;
  methodology_behaviours: Behaviour[];
}

interface Principle {
  id: string;
  name: string;
  game_phase: string;
  methodology_subprinciples: Subprinciple[];
}

interface Curriculum {
  id: string;
  category_code: string;
  category_label: string;
  philosophy_text: string;
}

const CATEGORIES = [
  "U6", "U7-U8", "U9-U10", "U11-U12", "U13-U14", "U15-U16", "U17-U19", "Senior"
];

const PHASE_CONFIG: Record<string, { label: string; color: string; icon: any; badge: string }> = {
  ataque: { label: "Ataque", color: "text-blue-600", badge: "bg-blue-100 text-blue-700", icon: Swords },
  defensa: { label: "Defensa", color: "text-rose-600", badge: "bg-rose-100 text-rose-700", icon: Shield },
  transicion_ad: { label: "Transición Ataque-Defensa", color: "text-amber-600", badge: "bg-amber-100 text-amber-700", icon: RefreshCw },
  transicion_da: { label: "Transición Defensa-Ataque", color: "text-orange-600", badge: "bg-orange-100 text-orange-700", icon: Activity },
  balon_parado: { label: "Balón Parado", color: "text-purple-600", badge: "bg-purple-100 text-purple-700", icon: Target },
};

export default function PrincipiosPage() {
  const [selectedCategory, setSelectedCategory] = useState("U15-U16");
  const [loading, setLoading] = useState(true);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [expandedPrinciples, setExpandedPrinciples] = useState<Record<string, boolean>>({});

  const [modalState, setModalState] = useState<{
    type: 'principle' | 'subprinciple' | 'behaviour' | null;
    parentId?: string;
    phase?: string;
  }>({ type: null });

  const supabase = createClient();

  useEffect(() => {
    fetchMethodology();
  }, [selectedCategory]);

  const fetchMethodology = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('club_id')
        .eq('id', userData.user.id)
        .single();

      if (!profile?.club_id) return;

      // In a real scenario, this fetches from methodology_curriculum.
      // Mocking fetch logic since tables might not exist yet:
      
      const mockCurriculum = {
        id: "cur-1",
        category_code: selectedCategory,
        category_label: selectedCategory,
        philosophy_text: "Desarrollo integral priorizando toma de decisiones."
      };
      setCurriculum(mockCurriculum);

      const mockPrinciples: Principle[] = [
        {
          id: "p1",
          name: "Amplitud y Profundidad",
          game_phase: "ataque",
          methodology_subprinciples: [
            {
              id: "sp1",
              name: "Ocupación Racional del Terreno",
              methodology_behaviours: [
                { id: "b1", description: "Fijar al poseedor del balón", age_categories: ["U15-U16"] }
              ]
            }
          ]
        },
        {
          id: "p2",
          name: "Bloque Compacto",
          game_phase: "defensa",
          methodology_subprinciples: [
            {
              id: "sp2",
              name: "Distancias entre líneas",
              methodology_behaviours: [
                { id: "b2", description: "Mantener 10-15 metros entre líneas de presión", age_categories: ["U15-U16"] }
              ]
            }
          ]
        }
      ];
      setPrinciples(mockPrinciples);
      
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const togglePrinciple = (id: string) => {
    setExpandedPrinciples(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const groupedPrinciples = principles.reduce((acc, curr) => {
    const phase = curr.game_phase;
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(curr);
    return acc;
  }, {} as Record<string, Principle[]>);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Principios Metodológicos</h1>
          <p className="text-slate-500 text-sm mt-1">Define el modelo de juego estructurado por fases</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex flex-wrap gap-1">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${
              selectedCategory === cat 
                ? "bg-blue-600 text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-10">
          {Object.entries(PHASE_CONFIG).map(([phaseKey, config]) => (
            <div key={phaseKey} className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${config.badge}`}>
                    <config.icon className="w-5 h-5" />
                  </div>
                  <h2 className={`text-xl font-bold ${config.color}`}>{config.label}</h2>
                </div>
                <button 
                  onClick={() => setModalState({ type: 'principle', phase: phaseKey })}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl py-2 px-3 flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" /> Principio
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(groupedPrinciples[phaseKey] || []).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    No hay principios definidos en esta fase para {selectedCategory}
                  </div>
                ) : (
                  (groupedPrinciples[phaseKey] || []).map((principle) => (
                    <div key={principle.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                      <div 
                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => togglePrinciple(principle.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-md ${config.badge} uppercase tracking-wider`}>
                            {config.label}
                          </span>
                          <h3 className="text-lg font-bold text-slate-900">{principle.name}</h3>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setModalState({ type: 'subprinciple', parentId: principle.id }); }}
                            className="text-slate-400 hover:text-blue-600 bg-white shadow-sm border border-slate-200 hover:border-blue-200 rounded-lg p-1.5 transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          {expandedPrinciples[principle.id] ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </div>

                      {expandedPrinciples[principle.id] && (
                        <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-6">
                          {principle.methodology_subprinciples.length === 0 ? (
                            <p className="text-sm text-slate-500 italic">No hay subprincipios definidos.</p>
                          ) : (
                            principle.methodology_subprinciples.map(sub => (
                              <div key={sub.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                  <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    {sub.name}
                                  </h4>
                                  <button 
                                    onClick={() => setModalState({ type: 'behaviour', parentId: sub.id })}
                                    className="text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                                  >
                                    <Plus className="w-3 h-3" /> Comportamiento
                                  </button>
                                </div>
                                
                                <ul className="space-y-2">
                                  {sub.methodology_behaviours.length === 0 ? (
                                    <li className="text-xs text-slate-400 italic">Sin comportamientos observables</li>
                                  ) : (
                                    sub.methodology_behaviours.map(beh => (
                                      <li key={beh.id} className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                                        <span>{beh.description}</span>
                                      </li>
                                    ))
                                  )}
                                </ul>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Basic Modal implementation */}
      {modalState.type && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold">
                {modalState.type === 'principle' ? 'Nuevo Principio' : 
                 modalState.type === 'subprinciple' ? 'Nuevo Subprincipio' : 'Nuevo Comportamiento'}
              </h3>
              <button onClick={() => setModalState({ type: null })} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                  {modalState.type === 'behaviour' ? 'Descripción' : 'Nombre'}
                </label>
                {modalState.type === 'behaviour' ? (
                  <textarea 
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                    placeholder="Describe el comportamiento observable..."
                  />
                ) : (
                  <input 
                    type="text" 
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. Amplitud y Profundidad"
                  />
                )}
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <button 
                  onClick={() => setModalState({ type: null })}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl py-2.5 px-4"
                >
                  Cancelar
                </button>
                <button 
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl py-2.5 px-4"
                  onClick={() => setModalState({ type: null })}
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
