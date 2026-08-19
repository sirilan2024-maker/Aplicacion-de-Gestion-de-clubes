"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  buildSeasonMethodologyReportFromData, 
  SeasonMethodologyReport 
} from "@/lib/methodology/seasonMethodologyReportService";
import {
  Brain,
  Calendar,
  ChevronLeft,
  Printer,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Activity,
  Users,
  Target,
  FileText,
  ShieldAlert,
  Loader2,
  Filter,
  BarChart3,
  Award
} from "lucide-react";

export default function SeasonMethodologyReportPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.teamId as string;
  const seasonId = params?.seasonId as string;

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<any>(null);
  const [season, setSeason] = useState<any>(null);
  const [rawSessions, setRawSessions] = useState<any[]>([]);
  const [curriculumPrinciples, setCurriculumPrinciples] = useState<any[]>([]);
  const [teamObjectives, setTeamObjectives] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);

  // Filtros
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterMd, setFilterMd] = useState("all");
  const [filterPrinciple, setFilterPrinciple] = useState("all");

  useEffect(() => {
    async function loadData() {
      if (!teamId || !seasonId) return;
      try {
        setLoading(true);
        const supabase = createClient();

        // 1. Obtener club_id del usuario
        const { data: { user } } = await supabase.auth.getUser();
        let clubId = null;
        if (user) {
          const { data: prof } = await supabase.from('profiles').select('club_id').eq('id', user.id).single();
          clubId = prof?.club_id;
        }

        // 2. Cargar datos del equipo
        const { data: teamData } = await supabase
          .from('teams')
          .select('id, name, category, age_category, club_id')
          .eq('id', teamId)
          .single();

        setTeam(teamData || { id: teamId, name: "Equipo", category: "cadete" });

        // 3. Cargar datos de la temporada
        const { data: seasonData } = await supabase
          .from('seasons')
          .select('id, name, start_date, end_date')
          .eq('id', seasonId)
          .single();

        setSeason(seasonData || { id: seasonId, name: "Temporada Actual" });

        // 4. Cargar sesiones con evaluaciones y comportamientos
        let sessionQuery = supabase
          .from('training_sessions')
          .select(`
            *,
            session_evaluations (
              id,
              actual_duration_min,
              session_rpe,
              objective_achievement,
              players_present_count,
              coach_observations,
              incidents_notes,
              session_behaviour_evaluations (
                id,
                behaviour_id,
                behaviour_description,
                game_phase_or_family,
                score,
                coach_notes
              )
            )
          `)
          .eq('team_id', teamId)
          .order('date_time', { ascending: true });

        if (clubId) {
          sessionQuery = sessionQuery.eq('club_id', clubId);
        }

        const { data: sessionsData } = await sessionQuery;
        setRawSessions(sessionsData || []);

        // 5. Cargar principios del currículo
        let principlesQuery = supabase
          .from('methodology_principles')
          .select('id, name, game_phase, sort_order')
          .order('sort_order', { ascending: true });

        if (clubId) {
          principlesQuery = principlesQuery.eq('club_id', clubId);
        }

        const { data: principlesData } = await principlesQuery;
        setCurriculumPrinciples(principlesData || []);

        // 6. Cargar objetivos del equipo
        let objQuery = supabase
          .from('team_objectives')
          .select('id, objective_type, description, status, priority')
          .eq('team_id', teamId);

        if (clubId) {
          objQuery = objQuery.eq('club_id', clubId);
        }

        const { data: objData } = await objQuery;
        setTeamObjectives(objData || []);

        // 7. Cargar registros de asistencia
        let attQuery = supabase
          .from('attendance')
          .select('id, player_id, event_id, attended, status')
          .eq('team_id', teamId);

        if (clubId) {
          attQuery = attQuery.eq('club_id', clubId);
        }

        const { data: attData } = await attQuery;
        setAttendanceRecords(attData || []);

      } catch (err) {
        console.error("Error cargando memoria metodológica:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [teamId, seasonId]);

  // Filtrado determinista de sesiones
  const filteredSessions = useMemo(() => {
    return rawSessions.filter(s => {
      if (filterStartDate && s.date_time && s.date_time < filterStartDate) return false;
      if (filterEndDate && s.date_time && s.date_time > filterEndDate) return false;
      if (filterMd !== "all" && s.microcycle_day !== filterMd) return false;
      if (filterPrinciple !== "all") {
        const objs = [s.objective, ...(s.objectives_secondary || [])].filter(Boolean);
        if (!objs.includes(filterPrinciple)) return false;
      }
      return true;
    });
  }, [rawSessions, filterStartDate, filterEndDate, filterMd, filterPrinciple]);

  // Generación del informe consolidado
  const report: SeasonMethodologyReport = useMemo(() => {
    return buildSeasonMethodologyReportFromData({
      team: team || { id: teamId, name: "Equipo", category: "cadete" },
      season: season || { id: seasonId, name: "Temporada" },
      sessions: filteredSessions,
      curriculumPrinciples,
      teamObjectives,
      attendanceRecords
    });
  }, [team, season, filteredSessions, curriculumPrinciples, teamObjectives, attendanceRecords]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-bold text-slate-500">Calculando memoria metodológica de temporada...</p>
      </div>
    );
  }

  const { summary, objectivesProgress, principlesCoverage, behaviourEvolution, loadEvolution, prioritiesAnalysis, conclusions, dataQuality } = report;

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6 print:p-0 print:space-y-4 text-slate-800">
      
      {/* HEADER ORIENTADO A DIRECCIÓN DEPORTIVA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm print:shadow-none print:border-none">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.back()}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors print:hidden"
              title="Volver"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-[10px] font-black uppercase bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-lg tracking-wider">
              Dirección Deportiva • Memoria Metodológica
            </span>
            <span className="text-xs font-bold text-slate-400">
              Temporada: {season?.name}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            {team?.name}
          </h1>
          <p className="text-xs font-medium text-slate-500">
            Categoría {team?.category || team?.age_category || 'Formativa'} • Análisis longitudinal y memoria pedagógica de temporada
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Exportar Informe A4
          </button>
        </div>
      </div>

      {/* FILTROS DETERMINISTAS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm print:hidden">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-xs font-black uppercase text-slate-400">
          <Filter className="w-3.5 h-3.5" />
          Filtros de Análisis
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Desde</label>
            <input
              type="date"
              value={filterStartDate}
              onChange={e => setFilterStartDate(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Hasta</label>
            <input
              type="date"
              value={filterEndDate}
              onChange={e => setFilterEndDate(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Día de Microciclo (MD)</label>
            <select
              value={filterMd}
              onChange={e => setFilterMd(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            >
              <option value="all">Todos los días MD</option>
              <option value="MD+1">MD+1 (Regenerativo)</option>
              <option value="MD-5">MD-5 (Fuerza/Tensión)</option>
              <option value="MD-4">MD-4 (Resistencia/Duración)</option>
              <option value="MD-3">MD-3 (Velocidad/Táctica)</option>
              <option value="MD-2">MD-2 (Espacios/Velocidad)</option>
              <option value="MD-1">MD-1 (Activación/ABP)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-500 mb-1">Principio Metodológico</label>
            <select
              value={filterPrinciple}
              onChange={e => setFilterPrinciple(e.target.value)}
              className="w-full text-xs font-bold border border-slate-200 rounded-xl px-3 py-2 bg-slate-50"
            >
              <option value="all">Todos los principios</option>
              {curriculumPrinciples.map(p => (
                <option key={p.id} value={p.name}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 1. RESUMEN EJECUTIVO (KPIS) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Sesiones Realizadas</span>
          <p className="text-2xl font-black text-slate-900">{summary.completedSessions} / {summary.plannedSessions}</p>
          <span className="text-[10px] font-bold text-blue-600">{summary.evaluationPercentage}% evaluadas</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Duración Acumulada</span>
          <p className="text-2xl font-black text-slate-900">{summary.totalActualDurationMin}&apos;</p>
          <span className={`text-[10px] font-bold ${summary.durationDeviationMin > 0 ? 'text-amber-600' : 'text-slate-500'}`}>
            {summary.durationDeviationMin > 0 ? `+${summary.durationDeviationMin}' desvío` : 'Conforme a plan'}
          </span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">RPE Medio</span>
          <p className="text-2xl font-black text-purple-700">{summary.avgRpe > 0 ? `${summary.avgRpe}/10` : 'N/A'}</p>
          <span className="text-[10px] font-bold text-slate-500">Percepción de esfuerzo</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Consecución Media</span>
          <p className="text-2xl font-black text-emerald-700">{summary.avgObjectiveAchievement > 0 ? `${summary.avgObjectiveAchievement}/4` : 'N/A'}</p>
          <span className="text-[10px] font-bold text-emerald-600">Nivel de asimilación</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Asistencia Media</span>
          <p className="text-2xl font-black text-blue-700">{summary.avgAttendanceRate > 0 ? `${summary.avgAttendanceRate}%` : 'N/A'}</p>
          <span className="text-[10px] font-bold text-slate-500">Exposición de plantilla</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Cobertura Modelo</span>
          <p className="text-2xl font-black text-indigo-700">{summary.modelCoveragePercentage}%</p>
          <span className="text-[10px] font-bold text-indigo-600">{summary.trainedPrinciplesCount} de {curriculumPrinciples.length} principios</span>
        </div>
      </div>

      {/* 2. PLANIFICADO VS CONSEGUIDO */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Target className="w-4 h-4 text-blue-600" />
            Planificado vs Conseguido (Objetivos del Equipo)
          </h2>
          <span className="text-xs font-bold text-slate-400">
            {objectivesProgress.length} objetivos formativos registrados
          </span>
        </div>

        {objectivesProgress.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 italic">No hay objetivos registrados para este equipo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-black">
                  <th className="py-2.5 px-3">Objetivo</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-center">Sesiones Previstas</th>
                  <th className="py-2.5 px-3 text-center">Evaluadas</th>
                  <th className="py-2.5 px-3 text-center">Consecución Media</th>
                  <th className="py-2.5 px-3">Estado Metodológico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {objectivesProgress.map(obj => (
                  <tr key={obj.objectiveId} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-800">{obj.description}</td>
                    <td className="py-3 px-3 capitalize text-slate-500 font-semibold">{obj.type}</td>
                    <td className="py-3 px-3 text-center font-bold">{obj.plannedSessionsCount}</td>
                    <td className="py-3 px-3 text-center font-bold">{obj.evaluatedSessionsCount}</td>
                    <td className="py-3 px-3 text-center font-black text-slate-900">
                      {obj.avgAchievement > 0 ? `${obj.avgAchievement}/4` : '-'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                        obj.status === 'achieved' 
                          ? 'bg-emerald-50 text-emerald-800' 
                          : obj.status === 'progressing' 
                            ? 'bg-blue-50 text-blue-800' 
                            : obj.status === 'at_risk' 
                              ? 'bg-rose-50 text-rose-800' 
                              : 'bg-slate-100 text-slate-600'
                      }`}>
                        {obj.status === 'achieved' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                        {obj.status === 'at_risk' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                        {obj.statusReason}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. COBERTURA DEL MODELO DE JUEGO (4 CUADRANTES) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-600" />
            Cobertura del Modelo de Juego por Principios
          </h2>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg">
            {summary.trainedPrinciplesCount} trabajados • {summary.neverTrainedPrinciplesCount} nunca trabajados
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Muy Trabajados (>=8) */}
          <div className="p-3.5 bg-emerald-50/50 border border-emerald-100 rounded-xl space-y-2">
            <span className="text-[10px] font-black uppercase text-emerald-900 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              Muy Trabajado (≥ 8 ses.)
            </span>
            <div className="space-y-1.5">
              {principlesCoverage.filter(p => p.classification === 'muy_trabajado').map(p => (
                <div key={p.principleName} className="p-2 bg-white border border-emerald-200/60 rounded-lg text-xs flex justify-between items-center">
                  <span className="font-bold text-slate-800">{p.principleName}</span>
                  <span className="font-black text-emerald-700">{p.sessionsCount} ses.</span>
                </div>
              ))}
              {principlesCoverage.filter(p => p.classification === 'muy_trabajado').length === 0 && (
                <p className="text-[11px] text-slate-400 italic">Ningún principio en este rango.</p>
              )}
            </div>
          </div>

          {/* Trabajados (4-7) */}
          <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
            <span className="text-[10px] font-black uppercase text-blue-900 flex items-center gap-1">
              <Activity className="w-3 h-3 text-blue-600" />
              Trabajado (4-7 ses.)
            </span>
            <div className="space-y-1.5">
              {principlesCoverage.filter(p => p.classification === 'trabajado').map(p => (
                <div key={p.principleName} className="p-2 bg-white border border-blue-200/60 rounded-lg text-xs flex justify-between items-center">
                  <span className="font-bold text-slate-800">{p.principleName}</span>
                  <span className="font-black text-blue-700">{p.sessionsCount} ses.</span>
                </div>
              ))}
              {principlesCoverage.filter(p => p.classification === 'trabajado').length === 0 && (
                <p className="text-[11px] text-slate-400 italic">Ningún principio en este rango.</p>
              )}
            </div>
          </div>

          {/* Poco Trabajados (1-3) */}
          <div className="p-3.5 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2">
            <span className="text-[10px] font-black uppercase text-amber-900 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              Poco Trabajado (1-3 ses.)
            </span>
            <div className="space-y-1.5">
              {principlesCoverage.filter(p => p.classification === 'poco_trabajado').map(p => (
                <div key={p.principleName} className="p-2 bg-white border border-amber-200/60 rounded-lg text-xs flex justify-between items-center">
                  <span className="font-bold text-slate-800">{p.principleName}</span>
                  <span className="font-black text-amber-700">{p.sessionsCount} ses.</span>
                </div>
              ))}
              {principlesCoverage.filter(p => p.classification === 'poco_trabajado').length === 0 && (
                <p className="text-[11px] text-slate-400 italic">Ningún principio en este rango.</p>
              )}
            </div>
          </div>

          {/* Nunca Trabajados (0) */}
          <div className="p-3.5 bg-rose-50/50 border border-rose-100 rounded-xl space-y-2">
            <span className="text-[10px] font-black uppercase text-rose-900 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-600" />
              Nunca Trabajado (0 ses.)
            </span>
            <div className="space-y-1.5">
              {principlesCoverage.filter(p => p.classification === 'nunca_trabajado').map(p => (
                <div key={p.principleName} className="p-2 bg-white border border-rose-200/60 rounded-lg text-xs flex justify-between items-center">
                  <span className="font-bold text-slate-800">{p.principleName}</span>
                  <span className="font-black text-rose-700">0 ses.</span>
                </div>
              ))}
              {principlesCoverage.filter(p => p.classification === 'nunca_trabajado').length === 0 && (
                <p className="text-[11px] text-slate-400 italic">Todos los principios han sido iniciados.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. EVOLUCIÓN DE COMPORTAMIENTOS (REGLA N >= 3) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            Evolución Longitudinal de Comportamientos Observables
          </h2>
          <span className="text-xs font-bold text-slate-400">
            Regla estadística N ≥ 3 para cálculo de tendencias
          </span>
        </div>

        {behaviourEvolution.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 italic">No hay evaluaciones de comportamientos registradas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] font-black">
                  <th className="py-2.5 px-3">Comportamiento Observable</th>
                  <th className="py-2.5 px-3 text-center">Muestra (N)</th>
                  <th className="py-2.5 px-3 text-center">1ª Valoración</th>
                  <th className="py-2.5 px-3 text-center">Última</th>
                  <th className="py-2.5 px-3 text-center">Media</th>
                  <th className="py-2.5 px-3 text-center">Variación %</th>
                  <th className="py-2.5 px-3 text-center">Tendencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {behaviourEvolution.map((b, i) => (
                  <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-3 font-bold text-slate-800">{b.behaviourDescription}</td>
                    <td className="py-3 px-3 text-center font-bold text-slate-600">{b.sampleSize}</td>
                    <td className="py-3 px-3 text-center">{b.firstScore}/4</td>
                    <td className="py-3 px-3 text-center font-bold">{b.lastScore}/4</td>
                    <td className="py-3 px-3 text-center font-black text-slate-900">{b.avgScore}/4</td>
                    <td className="py-3 px-3 text-center font-bold">
                      {b.percentageVariation !== null ? (
                        <span className={b.percentageVariation > 0 ? 'text-emerald-600' : b.percentageVariation < 0 ? 'text-rose-600' : 'text-slate-500'}>
                          {b.percentageVariation > 0 ? `+${b.percentageVariation}%` : `${b.percentageVariation}%`}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">N &lt; 3</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                        b.trend === 'improving' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : b.trend === 'declining' 
                            ? 'bg-rose-100 text-rose-800' 
                            : b.trend === 'stable' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-slate-100 text-slate-600'
                      }`}>
                        {b.trend === 'improving' && <TrendingUp className="w-3 h-3" />}
                        {b.trend === 'declining' && <TrendingDown className="w-3 h-3" />}
                        {b.trend === 'stable' && <Minus className="w-3 h-3" />}
                        {b.trend === 'insufficient_data' ? 'Muestra < 3' : b.trend}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. EVOLUCIÓN DE CARGA Y PATRONES */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-600" />
          Evolución de Carga y Modulación Temporal
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-purple-50/50 border border-purple-100 rounded-xl space-y-1">
            <span className="text-[10px] font-black uppercase text-purple-900">Percepción Media de Esfuerzo</span>
            <p className="text-xl font-black text-purple-950">{summary.avgRpe}/10 RPE</p>
            <span className="text-[10px] font-bold text-purple-700">Rango óptimo para edad</span>
          </div>
          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl space-y-1">
            <span className="text-[10px] font-black uppercase text-blue-900">Cumplimiento Horario</span>
            <p className="text-xl font-black text-blue-950">{summary.totalActualDurationMin} min reales</p>
            <span className="text-[10px] font-bold text-blue-700">Planificados: {summary.totalPlannedDurationMin} min</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-700">Sesiones Registradas</span>
            <p className="text-xl font-black text-slate-900">{loadEvolution.length} sesiones</p>
            <span className="text-[10px] font-bold text-slate-500">Histórico continuo</span>
          </div>
        </div>
      </div>

      {/* 6. PRIORIDADES METODOLÓGICAS DE TEMPORADA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-600" />
          Dinámica de Prioridades Metodológicas
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2">
            <span className="text-[10px] font-black uppercase text-emerald-900 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Conductas Consolidadas ({prioritiesAnalysis.resolvedPriorities.length})
            </span>
            <div className="space-y-1.5">
              {prioritiesAnalysis.resolvedPriorities.map((p, i) => (
                <div key={i} className="p-2 bg-white border border-emerald-200/60 rounded-lg text-xs">
                  <p className="font-bold text-slate-900">{p.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{p.resolutionEvidence}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl space-y-2">
            <span className="text-[10px] font-black uppercase text-amber-900 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              Prioridades Recurrentes ({prioritiesAnalysis.recurrentPriorities.length})
            </span>
            <div className="space-y-1.5">
              {prioritiesAnalysis.recurrentPriorities.map((p, i) => (
                <div key={i} className="p-2 bg-white border border-amber-200/60 rounded-lg text-xs">
                  <p className="font-bold text-slate-900">{p.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{p.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl space-y-2">
            <span className="text-[10px] font-black uppercase text-rose-900 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              Principios Abiertos / Sin Iniciar ({prioritiesAnalysis.openPriorities.length})
            </span>
            <div className="space-y-1.5">
              {prioritiesAnalysis.openPriorities.map((p, i) => (
                <div key={i} className="p-2 bg-white border border-rose-200/60 rounded-lg text-xs">
                  <p className="font-bold text-slate-900">{p.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{p.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 7. CONCLUSIONES AUTOMÁTICAS DETERMINISTAS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
        <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-600" />
          Conclusiones Deterministas para la Dirección Deportiva
        </h2>
        <div className="space-y-2">
          {conclusions.map((c, i) => (
            <div 
              key={i} 
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                c.type === 'strength' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' :
                c.type === 'improvement' ? 'bg-blue-50 border-blue-200 text-blue-900' :
                c.type === 'gap' ? 'bg-amber-50 border-amber-200 text-amber-900' :
                'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {c.type === 'strength' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {c.type === 'improvement' && <TrendingUp className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
              {c.type === 'gap' && <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
              {c.type === 'risk' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              <div>
                <p className="font-black text-slate-900">{c.title}</p>
                <p className="text-slate-600 mt-0.5 font-medium">{c.evidence}</p>
              </div>
            </div>
          ))}
          {conclusions.length === 0 && (
            <p className="text-xs text-slate-400 italic">No se generaron conclusiones con el volumen de datos actual.</p>
          )}
        </div>
      </div>

      {/* 8. CALIDAD DE DATOS */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs space-y-1.5">
        <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
          Transparencia y Calidad de Datos del Informe
        </span>
        {dataQuality.notes.map((n, i) => (
          <p key={i} className="text-slate-600 font-medium">• {n}</p>
        ))}
        {dataQuality.notes.length === 0 && (
          <p className="text-emerald-700 font-bold">✓ Calidad de datos 100% óptima. Todas las sesiones y objetivos cuentan con evaluación rigurosa.</p>
        )}
      </div>

    </div>
  );
}
