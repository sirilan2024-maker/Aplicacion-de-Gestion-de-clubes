"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  Filter,
  Plus,
  BookOpen,
  Users,
  Clock,
  Activity,
  Brain,
  X,
  Target,
  Maximize,
  Shield,
  Zap,
  ArrowUpRight,
  TrendingUp,
  Award,
  Layers,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

export default function BibliotecaEjercicios() {
  const [exercises, setExercises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedFamily, setSelectedFamily] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [selectedBlock, setSelectedBlock] = useState("all");
  const [minPlayers, setMinPlayers] = useState("");
  
  // Detail Modal
  const [selectedExercise, setSelectedExercise] = useState<any | null>(null);

  // Stats for the top bar
  const [stats, setStats] = useState({ 
    total: 0, 
    byCategory: {} as Record<string, number>,
    byFamily: {} as Record<string, number> 
  });

  useEffect(() => {
    fetchExercises();
  }, [searchTerm, selectedCategory, selectedType, selectedFamily, selectedDifficulty, selectedBlock, minPlayers]);

  const fetchExercises = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      let query = supabase.from("banco_ejercicios").select("*");

      if (searchTerm) {
        query = query.or(`nombre.ilike.%${searchTerm}%,descripcion.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`);
      }

      if (selectedCategory !== "all") {
        query = query.or(`age_category.eq.${selectedCategory},categoria_edad.cs.{${selectedCategory}}`);
      }

      if (selectedType !== "all") {
        query = query.eq("tipo", selectedType);
      }

      if (selectedFamily !== "all") {
        query = query.eq("familia", selectedFamily);
      }

      if (selectedDifficulty !== "all") {
        query = query.eq("dificultad", parseInt(selectedDifficulty, 10));
      }

      if (selectedBlock !== "all") {
        query = query.eq("bloque_sesion", selectedBlock);
      }

      if (minPlayers) {
        query = query.gte("max_players", parseInt(minPlayers, 10));
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (data) {
        setExercises(data);
        
        // Calculate basic stats on initial full load (when no filters)
        if (!searchTerm && selectedCategory === "all" && selectedType === "all" && selectedFamily === "all") {
          const catCount = data.reduce((acc: any, curr) => {
            const cat = curr.age_category || (curr.categoria_edad && curr.categoria_edad[0]) || 'general';
            acc[cat] = (acc[cat] || 0) + 1;
            return acc;
          }, {});
          const famCount = data.reduce((acc: any, curr) => {
            const fam = curr.familia || 'General';
            acc[fam] = (acc[fam] || 0) + 1;
            return acc;
          }, {});
          setStats({ total: data.length, byCategory: catCount, byFamily: famCount });
        }
      }
    } catch (error) {
      console.error("Error fetching exercises:", error);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: "all", label: "Todas las Categorías" },
    { value: "querubin", label: "U6 / Querubín" },
    { value: "prebenjamin", label: "U7-U8 / Prebenjamín" },
    { value: "benjamin", label: "U9-U10 / Benjamín" },
    { value: "alevin", label: "U11-U12 / Alevín" },
    { value: "infantil", label: "U13-U14 / Infantil" },
    { value: "cadete", label: "U15-U16 / Cadete" },
    { value: "juvenil", label: "U17-U19 / Juvenil" },
    { value: "senior", label: "Senior / Amateur" }
  ];

  const families = [
    { value: "all", label: "Todas las Familias" },
    { value: "TÉCNICA", label: "Técnica Individual/Colectiva" },
    { value: "TÁCTICA OFENSIVA", label: "Táctica Ofensiva" },
    { value: "TÁCTICA DEFENSIVA", label: "Táctica Defensiva" },
    { value: "TRANSICIONES", label: "Transiciones Ofensiva/Defensiva" },
    { value: "BALÓN PARADO", label: "Balón Parado (ABP)" },
    { value: "COGNITIVO", label: "Cognitivo / Percepción" },
    { value: "FÍSICO", label: "Físico / Condicional" },
    { value: "PSICOSOCIAL", label: "Psicosocial" }
  ];

  const types = [
    { value: "all", label: "Todos los Tipos" },
    { value: "calentamiento", label: "Calentamiento" },
    { value: "circuito", label: "Circuito / Postas" },
    { value: "analitico", label: "Analítico" },
    { value: "rondo", label: "Rondo" },
    { value: "SSG", label: "Juego Reducido (SSG)" },
    { value: "juego_medio", label: "Juego de Posición / Medio" },
    { value: "juego_global", label: "Juego Global / Partido" }
  ];

  const blocks = [
    { value: "all", label: "Todos los Bloques" },
    { value: "calentamiento", label: "Activación / Calentamiento" },
    { value: "principal", label: "Fase Principal" },
    { value: "global", label: "Fase Global / Aplicación" },
    { value: "vuelta_calma", label: "Vuelta a la Calma" }
  ];

  const getDifficultyBadge = (level: number) => {
    if (level === 1) return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2 py-0.5 rounded-md">Iniciación (Nivel 1)</span>;
    if (level === 2) return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold px-2 py-0.5 rounded-md">Básico (Nivel 2)</span>;
    if (level === 3) return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold px-2 py-0.5 rounded-md">Avanzado (Nivel 3)</span>;
    return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2 py-0.5 rounded-md">Élite / Senior (Nivel 4)</span>;
  };

  const getIntensityBar = (value: number, max: number = 4) => {
    const safeVal = Math.min(max, Math.max(1, value || 2));
    return (
      <div className="flex gap-1 items-center">
        {Array.from({ length: max }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-3 rounded-full ${
              i < safeVal ? "bg-blue-600" : "bg-slate-200"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6 relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
              Metodología OS v1.0
            </span>
            <span className="text-slate-400 text-xs font-bold">• 100 Ejercicios de Referencia</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 mt-1">
            <BookOpen className="w-8 h-8 text-blue-600" />
            Biblioteca Metodológica Profesional
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Repositorio estructurado de tareas conectado con el modelo de juego, currículo y periodización.
          </p>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-black">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{stats.total || exercises.length}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tareas</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">U6 → Senior</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">8 Categorías</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 font-black">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">100%</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Taxonomía Validada</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 font-black">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">Calidad Pro</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metodología Élite</div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, palabra clave, consigna o tag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <button
            onClick={() => {
              setSearchTerm("");
              setSelectedCategory("all");
              setSelectedType("all");
              setSelectedFamily("all");
              setSelectedDifficulty("all");
              setSelectedBlock("all");
              setMinPlayers("");
            }}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 py-2.5 px-3 rounded-xl hover:bg-slate-100 transition-all flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar Filtros
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-2 border-t border-slate-100">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Categoría</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Familia</label>
            <select
              value={selectedFamily}
              onChange={(e) => setSelectedFamily(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {families.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Estructura</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bloque</label>
            <select
              value={selectedBlock}
              onChange={(e) => setSelectedBlock(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {blocks.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Dificultad</label>
            <select
              value={selectedDifficulty}
              onChange={(e) => setSelectedDifficulty(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todas</option>
              <option value="1">Nivel 1 - Iniciación</option>
              <option value="2">Nivel 2 - Básico</option>
              <option value="3">Nivel 3 - Avanzado</option>
              <option value="4">Nivel 4 - Élite</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Mín. Jugadores</label>
            <input
              type="number"
              placeholder="Ej: 10"
              value={minPlayers}
              onChange={(e) => setMinPlayers(e.target.value)}
              className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Grid of Exercises */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-400 font-bold text-sm mt-3">Cargando biblioteca metodológica...</p>
        </div>
      ) : exercises.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-black text-slate-900">No se encontraron tareas</h3>
          <p className="text-sm text-slate-500 mt-1">Prueba a relajar los filtros de búsqueda o seleccionar otra categoría.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {exercises.map((ex) => (
            <div
              key={ex.id}
              onClick={() => setSelectedExercise(ex)}
              className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Top Badges */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                    {ex.age_category || (ex.categoria_edad && ex.categoria_edad[0]) || 'General'}
                  </span>
                  {getDifficultyBadge(ex.dificultad || 2)}
                </div>

                {/* Title */}
                <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {ex.nombre}
                </h3>

                {/* Subtitle / Family */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{ex.familia || 'TÁCTICA'} • {ex.tipo}</span>
                </div>

                {/* Description Snippet */}
                <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed">
                  {ex.descripcion}
                </p>

                {/* Objectives Chips */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(ex.objetivo_tactico || []).slice(0, 2).map((tac: string, i: number) => (
                    <span key={i} className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                      {tac}
                    </span>
                  ))}
                  {(ex.objetivo_tecnico || []).slice(0, 2).map((tec: string, i: number) => (
                    <span key={i} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                      {tec}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bottom Metrics Bar */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>{ex.min_players}-{ex.max_players} jug.</span>
                </div>

                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{ex.duracion_recomendada || 15} min</span>
                </div>

                <div className="flex items-center gap-1">
                  <Maximize className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate max-w-[80px]">{ex.espacio || '20x20m'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedExercise && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto space-y-6 my-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase px-2.5 py-1 rounded-md bg-blue-100 text-blue-800">
                    {selectedExercise.age_category || 'General'}
                  </span>
                  <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md">
                    {selectedExercise.familia || 'Táctica'} • {selectedExercise.tipo}
                  </span>
                  {getDifficultyBadge(selectedExercise.dificultad || 2)}
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
                  {selectedExercise.nombre}
                </h2>
                <p className="text-xs text-slate-400 font-bold mt-0.5">
                  Fuente: {selectedExercise.fuente || 'Adaptación metodológica'}
                </p>
              </div>
              <button
                onClick={() => setSelectedExercise(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tactical Load Indicator Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Carga Física</div>
                {getIntensityBar(selectedExercise.carga_fisica || 2)}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Carga Cognitiva</div>
                {getIntensityBar(selectedExercise.carga_cognitiva || 2)}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Oposición</div>
                {getIntensityBar(selectedExercise.oposicion || 2)}
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Representatividad</div>
                {getIntensityBar(selectedExercise.representatividad || 3)}
              </div>
            </div>

            {/* Description & Organization */}
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-blue-600" />
                  Descripción Metodológica
                </h4>
                <p className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-slate-700">
                  {selectedExercise.descripcion}
                </p>
              </div>

              {selectedExercise.desarrollo && (
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-1">
                    Desarrollo Táctico y Rotaciones
                  </h4>
                  <p className="text-slate-600">
                    {selectedExercise.desarrollo}
                  </p>
                </div>
              )}

              {/* Success Criteria & Corrections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4">
                  <h5 className="text-xs font-black text-emerald-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Criterios de Éxito
                  </h5>
                  <ul className="space-y-1 text-xs font-medium text-emerald-800">
                    {(selectedExercise.criterios_exito || ["Ejecución técnica correcta"]).map((crit: string, i: number) => (
                      <li key={i}>• {crit}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
                  <h5 className="text-xs font-black text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Intervenciones / Correcciones
                  </h5>
                  <p className="text-xs text-amber-800">
                    {selectedExercise.correcciones || selectedExercise.intervenciones || "Foco en la orientación corporal y el pase al pie alejado."}
                  </p>
                </div>
              </div>

              {/* Progressions & Regressions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-black text-blue-700 uppercase tracking-wider block mb-1">
                    ▲ Progresión
                  </span>
                  <p className="text-xs text-slate-600">
                    {selectedExercise.progresion_descripcion || "Reducir espacio y limitar toques a 1-2."}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider block mb-1">
                    ▼ Regresión
                  </span>
                  <p className="text-xs text-slate-600">
                    {selectedExercise.regresion_descripcion || "Agrandar dimensiones y añadir comodín ofensivo."}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Bottom */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedExercise(null)}
                className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cerrar
              </button>
              <a
                href="/admin/metodologia/sesiones/nueva"
                className="py-2.5 px-5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-sm flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Añadir al Constructor de Sesiones
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
