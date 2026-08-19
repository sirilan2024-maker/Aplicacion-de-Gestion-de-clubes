"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Brain,
  Target,
  Edit,
  Plus,
  BookOpen,
  ChevronRight,
  ShieldAlert
} from "lucide-react";

const CATEGORIES = [
  { id: "U6", name: "Querubín", age: "4-5 años", color: "bg-pink-100 text-pink-700" },
  { id: "U8", name: "Prebenjamín", age: "6-7 años", color: "bg-purple-100 text-purple-700" },
  { id: "U10", name: "Benjamín", age: "8-9 años", color: "bg-blue-100 text-blue-700" },
  { id: "U12", name: "Alevín", age: "10-11 años", color: "bg-emerald-100 text-emerald-700" },
  { id: "U14", name: "Infantil", age: "12-13 años", color: "bg-amber-100 text-amber-700" },
  { id: "U16", name: "Cadete", age: "14-15 años", color: "bg-orange-100 text-orange-700" },
  { id: "U19", name: "Juvenil", age: "16-18 años", color: "bg-rose-100 text-rose-700" },
  { id: "SENIOR", name: "Amateur", age: "+19 años", color: "bg-slate-100 text-slate-700" },
];

export default function CurriculoMetodologico() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[3]); // Default Alevin
  const [curriculumData, setCurriculumData] = useState<any>(null);
  const [principles, setPrinciples] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurriculum(activeCategory.name.toLowerCase());
  }, [activeCategory]);

  const fetchCurriculum = async (categoryName: string) => {
    setLoading(true);
    const supabase = createClient();
    try {
      // 1. Fetch Curriculum
      const { data: curriculum } = await supabase
        .from("methodology_curriculum")
        .select("*")
        .ilike("category_code", `%${categoryName}%`)
        .limit(1)
        .single();

      setCurriculumData(curriculum || null);

      if (curriculum) {
        // 2. Fetch Principles + Subprinciples
        const { data: principlesData } = await supabase
          .from("methodology_principles")
          .select(`
            *,
            methodology_subprinciples(
              *,
              methodology_behaviours(*)
            )
          `)
          .eq("curriculum_id", curriculum.id)
          .order("sort_order");
        
        setPrinciples(principlesData || []);
      } else {
        setPrinciples([]);
      }
    } catch (error) {
      console.error("Error fetching curriculum:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Brain className="w-8 h-8 text-indigo-600" />
            Currículo Metodológico
          </h1>
          <p className="text-slate-500 font-medium mt-1">Define el modelo de juego, principios y comportamientos por categoría.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Sidebar - Categories */}
        <div className="w-full lg:w-64 shrink-0 space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-2">Etapas Formativas</h3>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat)}
              className={`w-full flex items-center justify-between p-3 rounded-xl transition-all font-bold text-left ${
                activeCategory.id === cat.id 
                  ? "bg-white shadow-sm border border-indigo-200 text-indigo-700" 
                  : "hover:bg-slate-100 text-slate-600 border border-transparent"
              }`}
            >
              <div>
                <span className="block">{cat.name}</span>
                <span className={`text-[10px] uppercase ${activeCategory.id === cat.id ? "text-indigo-400" : "text-slate-400"}`}>{cat.age}</span>
              </div>
              {activeCategory.id === cat.id && <ChevronRight className="w-4 h-4 text-indigo-600" />}
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64 bg-white rounded-3xl border border-slate-200">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : !curriculumData ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
              <ShieldAlert className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-2xl font-black text-slate-900 mb-2">Currículo no definido</h2>
              <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">
                No se ha establecido el currículo metodológico para la categoría <strong>{activeCategory.name}</strong>.
              </p>
              <button className="inline-flex items-center gap-2 py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-sm">
                <Plus className="w-5 h-5" />
                Definir Currículo {activeCategory.name}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Category Header Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6">
                  <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                    <Edit className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wider ${activeCategory.color}`}>
                    {activeCategory.id} • {activeCategory.age}
                  </span>
                </div>
                
                <h2 className="text-3xl font-black text-slate-900 mb-3">{activeCategory.name}</h2>
                <p className="text-slate-600 leading-relaxed font-medium max-w-3xl">
                  {curriculumData.description || "Descripción de la filosofía y enfoque formativo para esta etapa del desarrollo."}
                </p>
                
                {curriculumData.objectives && curriculumData.objectives.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                      <Target className="w-4 h-4" /> Objetivos Principales
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {curriculumData.objectives.map((obj: string, i: number) => (
                        <div key={i} className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 text-xs font-bold mt-0.5">
                            {i + 1}
                          </div>
                          <span className="text-slate-700 font-medium text-sm leading-relaxed">{obj}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Principles Section */}
              <div className="flex items-center justify-between mt-8 mb-4">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-indigo-600" />
                  Principios del Modelo de Juego
                </h3>
                <button className="text-sm font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Principio
                </button>
              </div>

              {principles.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 border-dashed rounded-2xl p-8 text-center">
                  <p className="text-slate-500 font-bold mb-2">No hay principios definidos</p>
                  <button className="text-sm text-indigo-600 font-bold hover:underline">Añadir el primer principio</button>
                </div>
              ) : (
                <div className="space-y-4">
                  {principles.map((principle) => (
                    <div key={principle.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      {/* Principle Header */}
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-200 text-slate-600 uppercase tracking-wider">
                              Fase: {principle.phase || 'General'}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-slate-900">{principle.name}</h4>
                          {principle.description && (
                            <p className="text-sm text-slate-500 mt-1">{principle.description}</p>
                          )}
                        </div>
                        <button className="text-slate-400 hover:text-indigo-600 p-1">
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Subprinciples */}
                      <div className="p-5">
                        <div className="space-y-6">
                          {principle.methodology_subprinciples?.map((sub: any) => (
                            <div key={sub.id} className="pl-4 border-l-2 border-indigo-100">
                              <h5 className="font-bold text-slate-800 mb-3 flex justify-between items-center">
                                <span>{sub.name}</span>
                                <button className="text-slate-400 hover:text-indigo-600 p-1">
                                  <Edit className="w-3 h-3" />
                                </button>
                              </h5>
                              
                              {/* Behaviours */}
                              {sub.methodology_behaviours && sub.methodology_behaviours.length > 0 ? (
                                <ul className="space-y-2">
                                  {sub.methodology_behaviours.map((beh: any) => (
                                    <li key={beh.id} className="flex gap-2 items-start text-sm bg-slate-50 p-2.5 rounded-lg">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div>
                                      <span className="text-slate-600">{beh.description}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-slate-400 italic">Sin comportamientos definidos</p>
                              )}
                              
                              <button className="mt-3 text-xs font-bold text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Añadir comportamiento
                              </button>
                            </div>
                          ))}
                          
                          <button className="text-sm font-bold text-indigo-600 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors w-fit">
                            <Plus className="w-4 h-4" /> Subprincipio
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
