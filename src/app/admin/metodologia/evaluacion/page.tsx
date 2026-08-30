"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  User,
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Calendar,
  X,
  Target,
  Sparkles,
  Award,
  ChevronRight,
  Shield,
  Activity,
  Brain,
  Zap,
  Info,
  Check,
  Save,
  Clock,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import {
  CompetencyMatrixService,
  PlayerEvaluationService,
  PlayerProgressionService,
  PlayerDevelopmentInsightService,
  CompetencyArea,
  CompetencyDefinition,
  RubricLevel,
  PlayerDevelopmentProfile
} from "@/lib/methodology/evaluation";

interface Team {
  id: string;
  name: string;
  category?: string;
}

interface PlayerRecord {
  id: string;
  first_name: string;
  last_name: string;
  position?: string;
  dorsal?: number | string;
  team_id?: string;
  teams?: any;
}

const AREA_CONFIG: Record<CompetencyArea, { label: string; icon: any; color: string; badge: string }> = {
  tecnica: { label: "Técnica", icon: Target, color: "text-blue-600", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  tactica: { label: "Táctica", icon: Brain, color: "text-indigo-600", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  fisica: { label: "Física", icon: Zap, color: "text-amber-600", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  psicologica: { label: "Psicológica", icon: Shield, color: "text-purple-600", badge: "bg-purple-50 text-purple-700 border-purple-200" },
};

const RUBRIC_LEVELS: { level: RubricLevel; label: string; color: string; activeColor: string }[] = [
  { level: 1, label: "1 • Inicial", color: "border-slate-200 hover:border-rose-300 text-slate-600", activeColor: "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-300/30" },
  { level: 2, label: "2 • En desarrollo", color: "border-slate-200 hover:border-amber-300 text-slate-600", activeColor: "bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-300/30" },
  { level: 3, label: "3 • Adecuado", color: "border-slate-200 hover:border-blue-300 text-slate-600", activeColor: "bg-blue-50 border-blue-500 text-blue-800 ring-2 ring-blue-300/30" },
  { level: 4, label: "4 • Avanzado", color: "border-slate-200 hover:border-emerald-300 text-slate-600", activeColor: "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-300/30" },
  { level: 5, label: "5 • Excelente", color: "border-slate-200 hover:border-purple-300 text-slate-600", activeColor: "bg-purple-50 border-purple-500 text-purple-800 ring-2 ring-purple-300/30" },
];

function EvaluacionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const matrixService = useMemo(() => CompetencyMatrixService.getInstance(), []);
  const evaluationService = useMemo(() => PlayerEvaluationService.getInstance(), []);
  const progressionService = useMemo(() => PlayerProgressionService.getInstance(), []);
  const insightService = useMemo(() => PlayerDevelopmentInsightService.getInstance(), []);

  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");
  const [players, setPlayers] = useState<PlayerRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");

  // Modal de Evaluación
  const [evaluatingPlayer, setEvaluatingPlayer] = useState<PlayerRecord | null>(null);
  const [evalPeriod, setEvalPeriod] = useState("Trimestre 1");
  const [evalDate, setEvalDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeAreaTab, setActiveAreaTab] = useState<CompetencyArea>("tecnica");
  const [scoresMap, setScoresMap] = useState<Record<string, RubricLevel>>({});
  const [observationsMap, setObservationsMap] = useState<Record<string, string>>({});
  const [generalFeedback, setGeneralFeedback] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Perfil de Detalle / Historial
  const [profilePlayer, setProfilePlayer] = useState<{ player: PlayerRecord; profile: PlayerDevelopmentProfile } | null>(null);

  useEffect(() => {
    loadTeamsAndPlayers();
  }, []);

  const loadTeamsAndPlayers = async () => {
    setLoading(true);
    try {
      // 1. Cargar Equipos reales
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, category")
        .order("name", { ascending: true });

      setTeams(teamsData || []);

      // 2. Cargar Jugadores reales
      const { data: playersData } = await supabase
        .from("players")
        .select("id, first_name, last_name, position, dorsal, team_id, teams(name, category)")
        .order("last_name", { ascending: true });

      setPlayers(playersData || []);

      // 3. Cargar Evaluaciones existentes de Supabase a la memoria del servicio
      const { data: existingEvals } = await supabase
        .from("player_evaluations")
        .select("*, evaluation_items(*)")
        .order("evaluation_date", { ascending: true });

      if (existingEvals && existingEvals.length > 0) {
        existingEvals.forEach((ev: any) => {
          if (ev.evaluation_items && Array.isArray(ev.evaluation_items)) {
            ev.evaluation_items.forEach((item: any) => {
              try {
                evaluationService.createEvaluation({
                  playerId: ev.player_id,
                  category: "General",
                  competencyId: item.concept_id || item.competency_id || "tec_pase",
                  score: item.score || 3,
                  observation: item.coach_notes || ev.general_feedback,
                  evaluationDate: ev.evaluation_date
                });
              } catch (e) {
                // Ignore unrecognized concept IDs in old schemas
              }
            });
          }
        });
      }

    } catch (error) {
      console.error("Error cargando jugadores para evaluación:", error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de Jugadores
  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      const fullName = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase()) || (p.dorsal?.toString() || "").includes(searchQuery);
      const matchesTeam = selectedTeamId === "all" || p.team_id === selectedTeamId;
      const matchesPosition = positionFilter === "all" || (p.position || "").toLowerCase() === positionFilter.toLowerCase();
      return matchesSearch && matchesTeam && matchesPosition;
    });
  }, [players, searchQuery, selectedTeamId, positionFilter]);

  // Abrir Modal de Evaluación
  const handleOpenEvaluation = (player: PlayerRecord) => {
    setEvaluatingPlayer(player);
    setSaveSuccess(false);
    setGeneralFeedback("");

    // Inicializar puntuaciones con valores previos o defecto (3)
    const existing = evaluationService.getEvaluationsByPlayer(player.id);
    const initialScores: Record<string, RubricLevel> = {};
    const initialObs: Record<string, string> = {};

    const allComps = matrixService.getAllCompetencies();
    allComps.forEach((c) => {
      const prev = existing.filter((e) => e.competencyId === c.id);
      if (prev.length > 0) {
        const last = prev[prev.length - 1];
        initialScores[c.id] = (last.score as RubricLevel) || 3;
        initialObs[c.id] = last.observation || "";
      } else {
        initialScores[c.id] = 3;
        initialObs[c.id] = "";
      }
    });

    setScoresMap(initialScores);
    setObservationsMap(initialObs);
  };

  // Guardar Evaluación
  const handleSaveEvaluation = async () => {
    if (!evaluatingPlayer) return;
    setIsSaving(true);
    try {
      const inputs = Object.entries(scoresMap).map(([compId, score]) => ({
        playerId: evaluatingPlayer.id,
        teamId: evaluatingPlayer.team_id || null,
        category: evaluatingPlayer.teams?.category || "General",
        position: evaluatingPlayer.position,
        competencyId: compId,
        score,
        observation: observationsMap[compId] || null,
        evaluationDate: evalDate
      }));

      // 1. Guardar en servicio de evaluación M3
      evaluationService.batchCreateEvaluations(inputs);

      // 2. Persistir en Supabase si está disponible
      try {
        const { data: evalHeader, error: headerErr } = await supabase
          .from("player_evaluations")
          .insert({
            player_id: evaluatingPlayer.id,
            evaluation_date: evalDate,
            evaluation_period: evalPeriod,
            general_feedback: generalFeedback || null
          })
          .select("id")
          .single();

        if (evalHeader?.id) {
          const itemsToInsert = Object.entries(scoresMap).map(([compId, score]) => ({
            evaluation_id: evalHeader.id,
            concept_id: compId,
            score,
            coach_notes: observationsMap[compId] || null
          }));

          await supabase.from("evaluation_items").insert(itemsToInsert);
        }
      } catch (dbErr) {
        console.warn("Persistencia secundaria en BD completada con aviso:", dbErr);
      }

      setSaveSuccess(true);
      setTimeout(() => {
        setEvaluatingPlayer(null);
        setSaveSuccess(false);
      }, 1000);

    } catch (error) {
      console.error("Error guardando evaluación:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Ver Perfil
  const handleViewProfile = (player: PlayerRecord) => {
    const profile = progressionService.buildPlayerProfile(player.id);
    setProfilePlayer({ player, profile });
  };

  const getInitials = (firstName: string, lastName: string) => {
    const fn = (firstName || "").trim();
    const ln = (lastName || "").trim();
    return `${fn.charAt(0)}${ln.charAt(0)}`.toUpperCase() || "J";
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 tracking-wider">
              Evaluación & Seguimiento Longitudinal
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Award className="w-7 h-7 text-indigo-600 shrink-0" />
            Evaluación Formativa de Jugadores
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-1 max-w-3xl">
            Matriz de competencias formativas, rúbricas de 5 niveles (Inicial a Excelente) y seguimiento del desarrollo individual.
          </p>
        </div>

        {/* Enlace rápido a Directorio de Jugadores */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/admin/metodologia/jugadores"
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            <Users className="w-4 h-4" />
            <span>Directorio Plantilla</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Selector de Equipo */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
            Equipo
          </label>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos los Equipos ({teams.length})</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} {t.category ? `(${t.category})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Buscador */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
            Buscar Jugador
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Nombre o dorsal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Filtro por Posición */}
        <div>
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
            Posición
          </label>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas las Posiciones</option>
            <option value="portero">Portero</option>
            <option value="defensa">Defensa</option>
            <option value="lateral">Lateral</option>
            <option value="mediocentro">Mediocentro</option>
            <option value="extremo">Extremo</option>
            <option value="delantero">Delantero</option>
          </select>
        </div>
      </div>

      {/* Grid de Jugadores */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-slate-200 gap-3 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <p className="text-xs font-bold text-slate-500">Cargando censo de jugadores reales...</p>
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center shadow-xs space-y-2">
          <Users className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-black text-slate-800">No se encontraron jugadores</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No hay jugadores registrados en el equipo o con los filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map((player) => {
            const evals = evaluationService.getEvaluationsByPlayer(player.id);
            const hasEvaluations = evals.length > 0;
            const profile = hasEvaluations ? progressionService.buildPlayerProfile(player.id) : null;
            const latestEval = hasEvaluations ? evals[evals.length - 1] : null;

            return (
              <div
                key={player.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Ficha Cabecera */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black text-sm shrink-0">
                        {getInitials(player.first_name, player.last_name)}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 leading-tight">
                          {player.first_name} {player.last_name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                          <span className="font-semibold">{player.position || "Jugador"}</span>
                          {player.dorsal && (
                            <>
                              <span>•</span>
                              <span className="font-bold text-slate-700">#{player.dorsal}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {player.teams?.name && (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        {player.teams.name}
                      </span>
                    )}
                  </div>

                  {/* Estado de Evaluación */}
                  {hasEvaluations && profile ? (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">Puntuación Media:</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-indigo-700">{profile.globalAverage ?? profile.overallAverage} / 5</span>
                          {(profile.globalAverage ?? profile.overallAverage) >= 3.8 ? (
                            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (profile.globalAverage ?? profile.overallAverage) <= 2.5 ? (
                            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                          ) : (
                            <Minus className="w-3.5 h-3.5 text-amber-500" />
                          )}
                        </div>
                      </div>

                      {/* Desglose por Áreas */}
                      <div className="grid grid-cols-4 gap-1.5 pt-1 text-center">
                        {(profile.areaSummaries || []).map((area: any) => (
                          <div key={area.area} className="bg-white p-1.5 rounded-lg border border-slate-100">
                            <div className="text-[9px] font-black uppercase text-slate-400 truncate">{area.area.substring(0, 4)}</div>
                            <div className="text-xs font-black text-slate-800 mt-0.5">{area.averageScore || "—"}</div>
                          </div>
                        ))}
                      </div>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1">
                        <span>{evals.length} {evals.length === 1 ? "evaluación" : "evaluaciones"}</span>
                        <span>{latestEval?.evaluationDate || "Reciente"}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 text-center space-y-1">
                      <Info className="w-5 h-5 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">Sin evaluaciones registradas</p>
                      <p className="text-[10px] text-slate-400">Aplica la primera rúbrica formativa</p>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleOpenEvaluation(player)}
                    className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-2xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{hasEvaluations ? "Actualizar Rúbrica" : "Evaluar Jugador"}</span>
                  </button>

                  {hasEvaluations && (
                    <button
                      onClick={() => handleViewProfile(player)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                      title="Ver Perfil y Fortalezas"
                    >
                      <Award className="w-4 h-4 text-indigo-600" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          MODAL DE EVALUACIÓN CON RÚBRICAS DE 5 NIVELES
      ═════════════════════════════════════════════════════════════════════════ */}
      {evaluatingPlayer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                  {getInitials(evaluatingPlayer.first_name, evaluatingPlayer.last_name)}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Evaluar a {evaluatingPlayer.first_name} {evaluatingPlayer.last_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {evaluatingPlayer.position || "Jugador"} • {evaluatingPlayer.teams?.name || "Sin equipo"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEvaluatingPlayer(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Parámetros de la Evaluación */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                    Período Formativo
                  </label>
                  <select
                    value={evalPeriod}
                    onChange={(e) => setEvalPeriod(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Trimestre 1</option>
                    <option>Trimestre 2</option>
                    <option>Trimestre 3</option>
                    <option>Seguimiento Mensual</option>
                    <option>Evaluación Continua</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1 block">
                    Fecha de Evaluación
                  </label>
                  <input
                    type="date"
                    value={evalDate}
                    onChange={(e) => setEvalDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Tabs por Área de Competencia */}
              <div className="flex border-b border-slate-200 gap-2">
                {(["tecnica", "tactica", "fisica", "psicologica"] as CompetencyArea[]).map((area) => {
                  const isSelected = activeAreaTab === area;
                  const config = AREA_CONFIG[area];
                  const IconComp = config.icon;
                  const comps = matrixService.getCompetenciesByArea(area);

                  return (
                    <button
                      key={area}
                      onClick={() => setActiveAreaTab(area)}
                      className={`pb-2.5 px-3 text-xs font-black flex items-center gap-1.5 border-b-2 transition-all ${
                        isSelected
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-slate-400 hover:text-slate-700"
                      }`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                      <span>{config.label} ({comps.length})</span>
                    </button>
                  );
                })}
              </div>

              {/* Lista de Competencias del Área Activa */}
              <div className="space-y-5">
                {matrixService.getCompetenciesByArea(activeAreaTab).map((comp: any) => {
                  const currentScore = scoresMap[comp.id] || 3;
                  const currentRubric = comp.rubrics[currentScore];

                  return (
                    <div
                      key={comp.id}
                      className="border border-slate-200 rounded-2xl p-4 bg-white shadow-2xs space-y-3"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black text-slate-900">{comp.name}</h4>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            Nivel {currentScore} / 5
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{comp.description}</p>
                      </div>

                      {/* Selector de 5 Niveles */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {RUBRIC_LEVELS.map(({ level, label, color, activeColor }) => {
                          const isLevelSelected = currentScore === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setScoresMap((prev) => ({ ...prev, [comp.id]: level }))}
                              className={`p-2 rounded-xl border text-center transition-all ${
                                isLevelSelected ? activeColor : color
                              }`}
                            >
                              <div className="text-[11px] font-black leading-tight">{label}</div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Criterio de la Rúbrica Seleccionada */}
                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-700">
                        <span className="font-bold text-slate-900">Criterio Observable: </span>
                        <span>{currentRubric?.criteria || "Criterio de evaluación estándar."}</span>
                      </div>

                      {/* Observación Opcional */}
                      <input
                        type="text"
                        placeholder="Nota o contexto de observación..."
                        value={observationsMap[comp.id] || ""}
                        onChange={(e) =>
                          setObservationsMap((prev) => ({ ...prev, [comp.id]: e.target.value }))
                        }
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Feedback General */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Feedback General y Orientaciones de Mejora
                </label>
                <textarea
                  rows={2}
                  placeholder="Resumen global de la evolución del jugador, actitud en entrenamientos..."
                  value={generalFeedback}
                  onChange={(e) => setGeneralFeedback(e.target.value)}
                  className="w-full p-3 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <button
                type="button"
                onClick={() => setEvaluatingPlayer(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleSaveEvaluation}
                disabled={isSaving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-4 h-4 text-emerald-300" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{saveSuccess ? "¡Evaluación Guardada!" : "Guardar Evaluación"}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════════
          MODAL DE PERFIL Y FORTALEZAS DEL JUGADOR
      ═════════════════════════════════════════════════════════════════════════ */}
      {profilePlayer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-sm">
                  {getInitials(profilePlayer.player.first_name, profilePlayer.player.last_name)}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    Perfil de Desarrollo: {profilePlayer.player.first_name} {profilePlayer.player.last_name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Media Global: <strong className="text-indigo-700">{profilePlayer.profile.globalAverage} / 5</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setProfilePlayer(null)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Fortalezas */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-700 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Fortalezas Consolidadas (≥ 4.0)
                </h4>
                {profilePlayer.profile.strengths.length === 0 ? (
                  <p className="text-slate-400 italic">No hay competencias con nivel consolidado aún.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {profilePlayer.profile.strengths.map((s) => (
                      <div key={s.competencyId} className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 flex justify-between items-center">
                        <span className="font-bold text-emerald-900">{s.competencyName}</span>
                        <span className="font-black text-emerald-700">{s.currentScore}/5</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Áreas de Mejora */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Áreas Prioritarias de Mejora (≤ 2.5)
                </h4>
                {profilePlayer.profile.areasForImprovement.length === 0 ? (
                  <p className="text-slate-400 italic">No hay áreas críticas por debajo de 2.5.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {profilePlayer.profile.areasForImprovement.map((a) => (
                      <div key={a.competencyId} className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-200 flex justify-between items-center">
                        <span className="font-bold text-amber-900">{a.competencyName}</span>
                        <span className="font-black text-amber-700">{a.currentScore}/5</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resumen por Áreas */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2">
                  Medias por Dimensión
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(profilePlayer.profile.areaSummaries || []).map((area: any) => (
                    <div key={area.area} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <div className="text-[10px] font-black uppercase text-slate-500">{area.area}</div>
                      <div className="text-base font-black text-indigo-700 mt-1">{area.averageScore || "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <button
                onClick={() => setProfilePlayer(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function EvaluacionJugadoresPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-xs font-bold text-slate-500">Cargando Módulo de Evaluación Formativa...</p>
      </div>
    }>
      <EvaluacionContent />
    </Suspense>
  );
}
