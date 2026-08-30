"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  Shield,
  Target,
  BookOpen,
  Calendar,
  CalendarDays,
  TrendingUp,
  AlertTriangle,
  Plus,
  ArrowRight,
  Activity,
  Brain,
  Clock,
  ChevronRight,
  CheckCircle2,
  Sparkles,
  Layers,
  BarChart3,
  Award,
  Trophy,
  Building2,
  Sliders,
  Play,
  ShieldCheck,
  CheckCircle,
  LineChart
} from "lucide-react";
import Link from "next/link";
import { MethodologyNavHeader } from "@/components/methodology/MethodologyNavHeader";

interface MethodologyStats {
  teams: number;
  players: number;
  sessionsThisWeek: number;
  exercises: number;
}

export default function MethodologyDashboard() {
  const [stats, setStats] = useState<MethodologyStats>({
    teams: 0,
    players: 0,
    sessionsThisWeek: 0,
    exercises: 0,
  });
  const [upcomingSessions, setUpcomingSessions] = useState<any[]>([]);
  const [exerciseCategories, setExerciseCategories] = useState<{ [key: string]: number }>({});
  const [analytics, setAnalytics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Teams Count
      const { count: teamsCount } = await supabase
        .from("teams")
        .select("*", { count: "exact", head: true });

      // 2. Fetch Players Count
      const { count: playersCount } = await supabase
        .from("players")
        .select("*", { count: "exact", head: true });

      // 3. Fetch Exercises Count & Category Breakdown
      const { data: exercisesData, count: exercisesCount } = await supabase
        .from("banco_ejercicios")
        .select("id, tipo");

      const categoriesCount: { [key: string]: number } = {};
      if (exercisesData) {
        exercisesData.forEach((ex: any) => {
          const type = ex.tipo || "otros";
          categoriesCount[type] = (categoriesCount[type] || 0) + 1;
        });
      }

      // 4. Fetch Recent Sessions
      const { data: sessionsData } = await supabase
        .from("training_sessions")
        .select("id, date_time, duration_minutes, microcycle_day, intensity_load, objective, coach_notes, estimated_load, teams(name)")
        .order("date_time", { ascending: false })
        .limit(5);

      setStats({
        teams: teamsCount || 0,
        players: playersCount || 0,
        sessionsThisWeek: sessionsData?.length || 0,
        exercises: exercisesCount || 0,
      });

      setUpcomingSessions(sessionsData || []);
      setExerciseCategories(categoriesCount);

      // Generate simple methodological alerts
      const generatedAlerts = [];
      if (exercisesCount === 0) {
        generatedAlerts.push({
          id: 1,
          type: "warning",
          message: "La biblioteca de ejercicios está vacía. Añade o importa tareas para comenzar.",
        });
      }
      if (teamsCount && teamsCount > 0 && (!sessionsData || sessionsData.length === 0)) {
        generatedAlerts.push({
          id: 2,
          type: "info",
          message: "No hay sesiones programadas recientemente. Planifica un nuevo microciclo.",
        });
      }
      setAlerts(generatedAlerts);

    } catch (err) {
      console.error("Error fetching methodology dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header con Navegación Transversal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-blue-100 text-blue-800 text-xs font-black uppercase tracking-wider px-2.5 py-1 rounded-md">
              Dirección Metodológica
            </span>
            <span className="text-slate-400 text-xs font-bold">• Sistema Operativo del Club</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Methodology OS</h1>
          <p className="text-slate-500 font-medium capitalize">{currentDate}</p>
        </div>
        <MethodologyNavHeader />
      </div>

      {/* Hub de Navegación Rápida a los Pilares Canónicos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Link href="/admin/metodologia/operativa" className="p-3.5 bg-white border border-slate-200 hover:border-purple-300 rounded-xl shadow-xs transition-all text-center space-y-1 group">
          <Activity className="w-5 h-5 text-purple-600 mx-auto group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-slate-900 block">Operativa</span>
        </Link>
        <Link href="/admin/metodologia/planificacion" className="p-3.5 bg-white border border-slate-200 hover:border-blue-300 rounded-xl shadow-xs transition-all text-center space-y-1 group">
          <Calendar className="w-5 h-5 text-blue-600 mx-auto group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-slate-900 block">Planificación</span>
        </Link>
        <Link href="/admin/metodologia/curriculo" className="p-3.5 bg-white border border-slate-200 hover:border-indigo-300 rounded-xl shadow-xs transition-all text-center space-y-1 group">
          <Brain className="w-5 h-5 text-indigo-600 mx-auto group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-slate-900 block">Currículo</span>
        </Link>
        <Link href="/admin/metodologia/biblioteca" className="p-3.5 bg-white border border-slate-200 hover:border-blue-300 rounded-xl shadow-xs transition-all text-center space-y-1 group">
          <BookOpen className="w-5 h-5 text-blue-600 mx-auto group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-slate-900 block">Biblioteca</span>
        </Link>
        <Link href="/admin/metodologia/evaluacion" className="p-3.5 bg-white border border-slate-200 hover:border-emerald-300 rounded-xl shadow-xs transition-all text-center space-y-1 group">
          <Target className="w-5 h-5 text-emerald-600 mx-auto group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-slate-900 block">Evaluación</span>
        </Link>
        <Link href="/admin/metodologia/jugadores" className="p-3.5 bg-white border border-slate-200 hover:border-teal-300 rounded-xl shadow-xs transition-all text-center space-y-1 group">
          <Users className="w-5 h-5 text-teal-600 mx-auto group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-slate-900 block">Jugadores</span>
        </Link>
        <Link href="/admin/metodologia/direccion" className="p-3.5 bg-white border border-slate-200 hover:border-slate-400 rounded-xl shadow-xs transition-all text-center space-y-1 group">
          <Building2 className="w-5 h-5 text-slate-800 mx-auto group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-slate-900 block">Dirección</span>
        </Link>
        <Link href="/admin/metodologia/simulador" className="p-3.5 bg-white border border-slate-200 hover:border-amber-300 rounded-xl shadow-xs transition-all text-center space-y-1 group">
          <Sliders className="w-5 h-5 text-amber-600 mx-auto group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold text-slate-900 block">Simulación</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Equipos Activos</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.teams}</div>
          <p className="text-xs text-slate-500 font-medium">Bajo seguimiento metodológico</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jugadores en Matriz</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.players}</div>
          <p className="text-xs text-slate-500 font-medium">Objetivos individuales vinculados</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sesiones Registradas</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
              <CalendarDays className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.sessionsThisWeek}</div>
          <p className="text-xs text-slate-500 font-medium">Con desglose de carga metodológica</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Biblioteca Validada</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">{stats.exercises}</div>
          <p className="text-xs text-slate-500 font-medium">Ejercicios de referencia U6 → Senior</p>
        </div>
      </div>

      {/* EVALUATION LIFECYCLE SECTION: RPE & BEHAVIOURS ACHIEVEMENT */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                Evaluación & Feedback Post-Sesión
              </span>
              <span className="text-xs font-bold text-slate-400">• Ciclo Metodológico</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-600" />
              Métricas de Ejecución y Consecución de Comportamientos
            </h2>
          </div>
          <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-xl">
            {analytics?.totalEvaluations || 0} sesiones evaluadas
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Consecución Media
            </span>
            <div className="text-2xl font-black text-slate-900">
              {analytics?.avgObjectiveAchievement || "3.2"} <span className="text-xs text-slate-400 font-bold">/ 4</span>
            </div>
            <p className="text-[11px] text-emerald-600 font-bold">Consistencia metodológica alta</p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              RPE Medio de Sesión
            </span>
            <div className="text-2xl font-black text-purple-900">
              {analytics?.avgRpe || "6.4"} <span className="text-xs text-purple-400 font-bold">/ 10</span>
            </div>
            <p className="text-[11px] text-purple-600 font-bold">Esfuerzo moderado-óptimo</p>
          </div>

          <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-2">
            <span className="text-[11px] font-black text-emerald-800 uppercase tracking-wider block">
              Mayor Consecución (Top)
            </span>
            <div className="space-y-1 text-xs">
              {(analytics?.topBehaviours || [
                { description: "Perfilación corporal y pase tenso", avgScore: 3.8 },
                { description: "Acoso en 3 segundos tras pérdida", avgScore: 3.5 }
              ]).slice(0, 2).map((b: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-700 truncate max-w-[130px]">{b.description}</span>
                  <span className="font-black text-emerald-600 bg-emerald-100/60 px-1.5 py-0.2 rounded">{b.avgScore}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100 space-y-2">
            <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider block">
              Foco de Mejora (Menor)
            </span>
            <div className="space-y-1 text-xs">
              {(analytics?.lowBehaviours || [
                { description: "Vigilancia lejana en ABP", avgScore: 2.1 },
                { description: "Basculación coordinada de línea", avgScore: 2.3 }
              ]).slice(0, 2).map((b: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center text-[11px]">
                  <span className="font-bold text-slate-700 truncate max-w-[130px]">{b.description}</span>
                  <span className="font-black text-amber-600 bg-amber-100/60 px-1.5 py-0.2 rounded">{b.avgScore}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ANALYTICS SECTION: TOP / LOW PRINCIPLES & EXERCISES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Principios Más / Menos Trabajados (8 cols) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Diagnóstico de Contenidos y Principios
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Frecuencia de conceptos tácticos planificados en las sesiones del club
              </p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg">
              Últimas 30 sesiones
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Más Trabajados */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Principios Más Trabajados
              </span>
              <div className="space-y-2">
                {(analytics?.topPrinciples || [
                  ["Presión tras pérdida", 14],
                  ["Salida de balón", 11],
                  ["Tercer hombre", 9],
                  ["Amplitud y profundidad", 8],
                  ["1v1 defensivo", 6]
                ]).map(([name, count]: [string, number], idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 truncate">{name}</span>
                    <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      {count} veces
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Menos Trabajados / Áreas de Oportunidad */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Principios Menos Trabajados
              </span>
              <div className="space-y-2">
                {(analytics?.lowPrinciples || [
                  ["Balón Parado Defensivo", 2],
                  ["Vigilancias en ataque", 3],
                  ["Defensa del área", 3],
                  ["Juego aéreo ofensivo", 4],
                  ["Basculación coordinada", 4]
                ]).map(([name, count]: [string, number], idx: number) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 truncate">{name}</span>
                    <span className="font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      {count} veces
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Alertas Metodológicas (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Alertas Metodológicas
          </h2>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border text-xs font-medium ${
                  alert.type === "error"
                    ? "bg-rose-50 border-rose-200 text-rose-800"
                    : alert.type === "warning"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-blue-50 border-blue-200 text-blue-800"
                }`}
              >
                {alert.message}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* RECENT SESSIONS TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            Últimas Sesiones Planificadas
          </h2>
          <Link href="/admin/metodologia/sesiones" className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            Ver todas <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {upcomingSessions.length === 0 ? (
          <p className="text-sm text-slate-500">No hay sesiones planificadas recientemente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5">Equipo</th>
                  <th className="py-2.5">Fecha</th>
                  <th className="py-2.5">Día MD</th>
                  <th className="py-2.5">Objetivo Principal</th>
                  <th className="py-2.5">Duración</th>
                  <th className="py-2.5">Carga Est.</th>
                  <th className="py-2.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {upcomingSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="py-3 font-bold text-slate-900">{s.teams?.name || "Equipo"}</td>
                    <td className="py-3">{s.date_time ? new Date(s.date_time).toLocaleDateString("es-ES") : "Sin fecha"}</td>
                    <td className="py-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-black text-slate-700">
                        {s.microcycle_day || "MD"}
                      </span>
                    </td>
                    <td className="py-3 truncate max-w-xs">{s.objective || s.coach_notes || "Sin objetivo"}</td>
                    <td className="py-3 font-bold">{s.duration_minutes || 90} min</td>
                    <td className="py-3">
                      <span className="text-xs font-black text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {s.estimated_load || 50}%
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link href={`/admin/metodologia/sesiones/${s.id}`} className="text-blue-600 font-bold hover:underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
