"use client";

import React, { useState, useEffect, useId } from "react";
import {
  Activity,
  Smile,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Moon,
  Battery,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  User as UserIcon,
  X,
  Clock,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Flame,
  ThumbsUp,
  RefreshCw,
  Eye,
  EyeOff,
  Filter,
  Users
} from "lucide-react";

import {
  generateInformationalAlerts,
  InformationalAlert,
  HooperRatings,
  DiscomfortDetails,
  getSpainDateString
} from "@/lib/performance/wellness-service";

// ============================================================================
// TIPOS Y MODELOS DE DEMOSTRACIÓN (100% EN MEMORIA)
// ============================================================================

export interface MockPlayer {
  id: string;
  firstName: string;
  lastName: string;
  dorsal: number | null;
  position: string;
  avatarUrl: string | null;
}

export interface MockWellnessEntry {
  playerId: string;
  attendanceStatus: 'confirmed' | 'pending' | 'absent';
  wellnessStatus: 'completed' | 'pending' | 'not_required';
  ratings?: HooperRatings;
  discomfort?: DiscomfortDetails;
  submittedAt?: string;
  notes?: string;
}

export interface MockSessionRecord {
  id: string;
  date: string;
  title: string;
  minutes: number | null;
  rpe: number | null;
  attendanceStatus: string;
}

// ============================================================================
// DATOS FICTICIOS EN MEMORIA (SIN CONEXIÓN A BASE DE DATOS)
// ============================================================================

const MOCK_TEAMS = [
  { id: "demo-team-cadete-a", name: "Cadete A — Sporting Saladar", category: "Cadete" },
  { id: "demo-team-infantil-b", name: "Infantil B — Sporting Saladar", category: "Infantil" },
  { id: "demo-team-empty", name: "Prebenjamín C (Equipo Vacío)", category: "Prebenjamín" },
];

const MOCK_SEASONS = [
  { id: "demo-season-26-27", name: "Temporada 26/27 (Activa)", isActive: true },
  { id: "demo-season-25-26", name: "Temporada 25/26 (Cerrada / Histórica)", isActive: false },
];

const MOCK_CADETE_PLAYERS: MockPlayer[] = [
  { id: "p1", firstName: "Hugo", lastName: "Navarro", dorsal: 10, position: "Centrocampista", avatarUrl: null },
  { id: "p2", firstName: "Marc", lastName: "García", dorsal: 7, position: "Extremo Derecho", avatarUrl: null },
  { id: "p3", firstName: "Álvaro", lastName: "Martínez", dorsal: 4, position: "Defensa Central", avatarUrl: null },
  { id: "p4", firstName: "Mateo", lastName: "Sánchez", dorsal: 1, position: "Portero", avatarUrl: null },
  { id: "p5", firstName: "Lucas", lastName: "Fernández", dorsal: 9, position: "Delantero Centro", avatarUrl: null },
  { id: "p6", firstName: "David", lastName: "López", dorsal: 11, position: "Lateral Izquierdo", avatarUrl: null },
];

const MOCK_INFANTIL_PLAYERS: MockPlayer[] = [
  { id: "p7", firstName: "Adrián", lastName: "Soler", dorsal: 8, position: "Centrocampista", avatarUrl: null },
  { id: "p8", firstName: "Pablo", lastName: "Cano", dorsal: 5, position: "Defensa", avatarUrl: null },
  { id: "p9", firstName: "Iker", lastName: "Molina", dorsal: 1, position: "Portero", avatarUrl: null },
  { id: "p10", firstName: "Leo", lastName: "Torres", dorsal: 9, position: "Delantero", avatarUrl: null },
];

const MOCK_ENTRIES_ACTIVE_CADETE: Record<string, MockWellnessEntry> = {
  p1: {
    playerId: "p1",
    attendanceStatus: "confirmed",
    wellnessStatus: "completed",
    ratings: { sleepQuality: 2, fatigue: 4, soreness: 5, stress: 3, mood: 2 },
    discomfort: { hasDiscomfort: true, zone: "Isquiotibial derecho", intensity: 8, notes: "Pinchazo al sprintar en el entreno anterior" },
    submittedAt: "16:45",
  },
  p2: {
    playerId: "p2",
    attendanceStatus: "confirmed",
    wellnessStatus: "completed",
    ratings: { sleepQuality: 4, fatigue: 2, soreness: 2, stress: 1, mood: 4 },
    discomfort: { hasDiscomfort: false, zone: null, intensity: null, notes: null },
    submittedAt: "17:10",
  },
  p3: {
    playerId: "p3",
    attendanceStatus: "confirmed",
    wellnessStatus: "completed",
    ratings: { sleepQuality: 3, fatigue: 3, soreness: 3, stress: 2, mood: 3 },
    discomfort: { hasDiscomfort: true, zone: "Cuádriceps", intensity: 5, notes: "Sobrecarga leve" },
    submittedAt: "17:02",
  },
  p4: {
    playerId: "p4",
    attendanceStatus: "confirmed",
    wellnessStatus: "pending",
  },
  p5: {
    playerId: "p5",
    attendanceStatus: "absent",
    wellnessStatus: "not_required",
    notes: "Ausencia justificada comunicada por tutor (Gripe)",
  },
  p6: {
    playerId: "p6",
    attendanceStatus: "confirmed",
    wellnessStatus: "completed",
    ratings: { sleepQuality: 5, fatigue: 1, soreness: 1, stress: 1, mood: 5 },
    discomfort: { hasDiscomfort: false, zone: null, intensity: null, notes: null },
    submittedAt: "16:30",
  },
};

const MOCK_ENTRIES_ACTIVE_INFANTIL: Record<string, MockWellnessEntry> = {
  p7: {
    playerId: "p7",
    attendanceStatus: "confirmed",
    wellnessStatus: "completed",
    ratings: { sleepQuality: 4, fatigue: 2, soreness: 1, stress: 1, mood: 4 },
    discomfort: { hasDiscomfort: false, zone: null, intensity: null, notes: null },
    submittedAt: "17:15",
  },
  p8: {
    playerId: "p8",
    attendanceStatus: "confirmed",
    wellnessStatus: "completed",
    ratings: { sleepQuality: 2, fatigue: 4, soreness: 4, stress: 3, mood: 2 },
    discomfort: { hasDiscomfort: true, zone: "Aductor", intensity: 7, notes: "Molestia al golpear balón" },
    submittedAt: "17:20",
  },
  p9: {
    playerId: "p9",
    attendanceStatus: "confirmed",
    wellnessStatus: "pending",
  },
  p10: {
    playerId: "p10",
    attendanceStatus: "pending",
    wellnessStatus: "pending",
  },
};

const MOCK_PLAYER_SESSIONS: Record<string, MockSessionRecord[]> = {
  p1: [
    { id: "s1", date: "2026-10-15", title: "Entrenamiento Táctico Previo", minutes: 80, rpe: 8, attendanceStatus: "Presente" },
    { id: "s2", date: "2026-10-13", title: "Sesión de Fuerza y Resistencia", minutes: 75, rpe: 7, attendanceStatus: "Presente" },
    { id: "s3", date: "2026-10-11", title: "Competición Jornada 4", minutes: 90, rpe: 9, attendanceStatus: "Titular (90 min)" },
    { id: "s4", date: "2026-10-09", title: "Recuperación Activa", minutes: 0, rpe: 3, attendanceStatus: "Preservado (0 min)" },
  ],
  p2: [
    { id: "s5", date: "2026-10-15", title: "Entrenamiento Táctico Previo", minutes: 80, rpe: 6, attendanceStatus: "Presente" },
    { id: "s6", date: "2026-10-13", title: "Sesión de Fuerza y Resistencia", minutes: 75, rpe: 5, attendanceStatus: "Presente" },
  ],
};

// ============================================================================
// COMPONENTE: DRAWER DE JUGADOR EN MEMORIA (SIN SUPABASE NI CONSULTAS)
// ============================================================================

function getAlertTitle(type: string): string {
  switch (type) {
    case 'fatigue_warning': return 'Fatiga Elevada';
    case 'soreness_warning': return 'Dolor Muscular';
    case 'discomfort_reported': return 'Molestia Física';
    case 'high_exertion': return 'Esfuerzo Extremo';
    default: return 'Aviso Físico';
  }
}

interface DemoPlayerPerformanceDrawerProps {
  player: MockPlayer;
  entry?: MockWellnessEntry;
  alerts: InformationalAlert[];
  canViewDiscomfort: boolean;
  onClose: () => void;
}

function DemoPlayerPerformanceDrawer({
  player,
  entry,
  alerts,
  canViewDiscomfort,
  onClose,
}: DemoPlayerPerformanceDrawerProps) {
  const sessions = MOCK_PLAYER_SESSIONS[player.id] || [
    { id: "s-def", date: "2026-10-15", title: "Entrenamiento Táctico", minutes: 75, rpe: 6, attendanceStatus: "Presente" }
  ];

  const totalMinutes = sessions.reduce((acc, s) => acc + (s.minutes || 0), 0);
  const evaluatedLoads = sessions.filter(s => s.minutes !== null && s.rpe !== null);
  const totalLoad = evaluatedLoads.reduce((acc, s) => acc + (s.minutes! * s.rpe!), 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden">
        {/* Header Drawer */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg shadow-sm">
              {player.dorsal ?? "#"}
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 leading-tight">
                {player.firstName} {player.lastName}
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {player.position} • Dorsal {player.dorsal ?? "S/D"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            title="Cerrar ficha"
          >
            <X size={20} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Banner de Estado Hoy */}
          <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar size={13} /> Sesión de Hoy
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                entry?.wellnessStatus === 'completed'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : entry?.wellnessStatus === 'not_required'
                  ? 'bg-slate-200 text-slate-700'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {entry?.wellnessStatus === 'completed' ? 'Cuestionario Completado' : entry?.wellnessStatus === 'not_required' ? 'No Requerido' : 'Pendiente de Responder'}
              </span>
            </div>

            {/* Alertas del jugador */}
            {alerts.length > 0 && (
              <div className="space-y-2 mb-3">
                {alerts.map((al, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      al.level === 'attention'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">{getAlertTitle(al.type)}</div>
                      <div className="text-[11px] mt-0.5 opacity-90">{al.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Desglose de 5 métricas Hooper */}
            {entry?.ratings ? (
              <div className="grid grid-cols-5 gap-1.5 pt-2">
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <Moon className="w-4 h-4 mx-auto text-indigo-500 mb-1" />
                  <div className="text-[10px] text-slate-500 font-semibold">Sueño</div>
                  <div className="text-sm font-black text-slate-900">{entry.ratings.sleepQuality}/5</div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <Battery className="w-4 h-4 mx-auto text-amber-500 mb-1" />
                  <div className="text-[10px] text-slate-500 font-semibold">Fatiga</div>
                  <div className="text-sm font-black text-slate-900">{entry.ratings.fatigue}/5</div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <Activity className="w-4 h-4 mx-auto text-rose-500 mb-1" />
                  <div className="text-[10px] text-slate-500 font-semibold">Dolor</div>
                  <div className="text-sm font-black text-slate-900">{entry.ratings.soreness}/5</div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <Flame className="w-4 h-4 mx-auto text-orange-500 mb-1" />
                  <div className="text-[10px] text-slate-500 font-semibold">Estrés</div>
                  <div className="text-sm font-black text-slate-900">{entry.ratings.stress}/5</div>
                </div>
                <div className="p-2 rounded-xl bg-white border border-slate-200 text-center">
                  <Smile className="w-4 h-4 mx-auto text-emerald-500 mb-1" />
                  <div className="text-[10px] text-slate-500 font-semibold">Ánimo</div>
                  <div className="text-sm font-black text-slate-900">{entry.ratings.mood}/5</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic py-2 text-center">
                {entry?.wellnessStatus === 'not_required'
                  ? entry.notes || 'El jugador está ausente de la sesión.'
                  : 'A la espera de que el futbolista o familia cumplimente el formulario previo.'}
              </div>
            )}
          </div>

          {/* Bloque de Molestia y Confidencialidad */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-2 flex items-center justify-between">
              <span>Informe de Molestias Físicas</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                canViewDiscomfort ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {canViewDiscomfort ? <Eye size={11} /> : <EyeOff size={11} />}
                {canViewDiscomfort ? 'Vista Médica / Técnica' : 'Vista Restringida (Familiar)'}
              </span>
            </h4>

            {entry?.discomfort?.hasDiscomfort ? (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-rose-900">
                      Molestia Activa Reportada
                    </span>
                    {canViewDiscomfort ? (
                      <span className="text-[11px] font-black px-2 py-0.5 rounded bg-rose-200 text-rose-900">
                        Intensidad: {entry.discomfort.intensity}/10
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-rose-700">Registrada</span>
                    )}
                  </div>

                  {canViewDiscomfort ? (
                    <>
                      <div className="text-xs text-rose-800">
                        <strong>Zona anatómica:</strong> {entry.discomfort.zone}
                      </div>
                      {entry.discomfort.notes && (
                        <div className="text-xs text-rose-700 mt-1 italic">
                          "{entry.discomfort.notes}"
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-slate-600 mt-1.5 p-2 bg-white/80 rounded-lg border border-rose-200/50 flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        Detalles clínicos redactados para roles familiares. Notificado al cuerpo médico y preparador físico.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Sin molestias físicas reportadas para el día de hoy.</span>
              </div>
            )}
          </div>

          {/* Historial de Cargas y Sesiones */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                Historial de Sesiones (Carga sRPE)
              </h4>
              <div className="text-xs text-slate-500 font-semibold">
                Total: <strong className="text-slate-900">{totalMinutes} min</strong> • Carga: <strong className="text-slate-900">{totalLoad} UA</strong>
              </div>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              {sessions.map(s => {
                const sRpe = s.minutes !== null && s.rpe !== null ? s.minutes * s.rpe : null;
                return (
                  <div key={s.id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{s.title}</div>
                      <div className="text-[11px] text-slate-400">{s.date} • {s.attendanceStatus}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-900">
                        {s.minutes !== null ? `${s.minutes} min` : '—'} • RPE {s.rpe ?? '—'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Carga: {sRpe !== null ? `${sRpe} UA` : 'Pendiente'}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Drawer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl transition-colors"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL: RUTA DEMO DEL PANEL DE RENDIMIENTO
// ============================================================================

export default function PerformanceDemoPage() {
  const [selectedTeamId, setSelectedTeamId] = useState<string>("demo-team-cadete-a");
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("demo-season-26-27");
  const [isTechnicalRole, setIsTechnicalRole] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'discomfort'>('all');
  const [selectedPlayerForDrawer, setSelectedPlayerForDrawer] = useState<MockPlayer | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const todaySpainStr = getSpainDateString(new Date());

  // Simulación del cambio de equipo o temporada con vaciado inmediato de datos
  const handleTeamChange = (newTeamId: string) => {
    setIsLoading(true);
    setSelectedTeamId(newTeamId);
    setSelectedPlayerForDrawer(null);
    setTimeout(() => {
      setIsLoading(false);
    }, 250);
  };

  const handleSeasonChange = (newSeasonId: string) => {
    setIsLoading(true);
    setSelectedSeasonId(newSeasonId);
    setSelectedPlayerForDrawer(null);
    setTimeout(() => {
      setIsLoading(false);
    }, 250);
  };

  // Resolución de datos según equipo y temporada seleccionados
  const currentTeam = MOCK_TEAMS.find(t => t.id === selectedTeamId)!;
  const isHistoricalSeason = selectedSeasonId === "demo-season-25-26";
  const isEmptyTeam = selectedTeamId === "demo-team-empty";

  let players: MockPlayer[] = [];
  let entriesMap: Record<string, MockWellnessEntry> = {};

  if (!isEmptyTeam && !isHistoricalSeason) {
    if (selectedTeamId === "demo-team-cadete-a") {
      players = MOCK_CADETE_PLAYERS;
      entriesMap = MOCK_ENTRIES_ACTIVE_CADETE;
    } else if (selectedTeamId === "demo-team-infantil-b") {
      players = MOCK_INFANTIL_PLAYERS;
      entriesMap = MOCK_ENTRIES_ACTIVE_INFANTIL;
    }
  }

  // Agregados Hooper
  const completedEntries = players
    .map(p => entriesMap[p.id])
    .filter((e): e is MockWellnessEntry => e?.wellnessStatus === 'completed');

  const completedCount = completedEntries.length;
  const pendingCount = players.filter(p => !entriesMap[p.id] || entriesMap[p.id].wellnessStatus === 'pending').length;
  const discomfortCount = completedEntries.filter(e => e.discomfort?.hasDiscomfort).length;

  let avgSleep = 0, avgFatigue = 0, avgSoreness = 0, avgStress = 0, avgMood = 0;
  if (completedCount > 0) {
    avgSleep = completedEntries.reduce((s, e) => s + (e.ratings?.sleepQuality || 0), 0) / completedCount;
    avgFatigue = completedEntries.reduce((s, e) => s + (e.ratings?.fatigue || 0), 0) / completedCount;
    avgSoreness = completedEntries.reduce((s, e) => s + (e.ratings?.soreness || 0), 0) / completedCount;
    avgStress = completedEntries.reduce((s, e) => s + (e.ratings?.stress || 0), 0) / completedCount;
    avgMood = completedEntries.reduce((s, e) => s + (e.ratings?.mood || 0), 0) / completedCount;
  }

  const avgHooperGlobal = completedCount > 0 ? (avgSleep + avgFatigue + avgSoreness + avgStress + avgMood).toFixed(1) : null;

  // Alertas calculadas con sanitización de rol
  const allAlerts: { player: MockPlayer; alert: InformationalAlert }[] = [];
  for (const p of players) {
    const entry = entriesMap[p.id];
    if (entry?.wellnessStatus === 'completed' && entry.ratings) {
      let discomfortForAlert: DiscomfortDetails | undefined = undefined;
      if (entry.discomfort?.hasDiscomfort) {
        discomfortForAlert = {
          hasDiscomfort: true,
          zone: isTechnicalRole ? entry.discomfort.zone : null,
          intensity: isTechnicalRole ? entry.discomfort.intensity : null,
          notes: isTechnicalRole ? entry.discomfort.notes : null,
        };
      }
      const playerAlerts = generateInformationalAlerts(entry.ratings, discomfortForAlert);
      for (const al of playerAlerts) {
        allAlerts.push({ player: p, alert: al });
      }
    }
  }

  // Filtrado de plantilla
  const filteredPlayers = players.filter(p => {
    const entry = entriesMap[p.id];
    if (statusFilter === 'completed') return entry?.wellnessStatus === 'completed';
    if (statusFilter === 'pending') return !entry || entry.wellnessStatus === 'pending';
    if (statusFilter === 'discomfort') return entry?.discomfort?.hasDiscomfort;
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-16">
      {/* ====================================================================== */}
      {/* BANNER PERSISTENTE DEMO AQUELLA RUTA NUNCA CONECTA A SUPABASE */}
      {/* ====================================================================== */}
      <header className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-black">
            <Sparkles className="w-4 h-4 text-amber-600" />
            <span className="uppercase tracking-wider">Modo Demostración Aislado — Centro de Rendimiento</span>
            <span className="bg-amber-200/80 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <ShieldCheck size={11} /> 100% En Memoria
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Selector de Simulación de Rol */}
            <div className="flex items-center gap-1.5 bg-white/90 p-1 rounded-xl border border-amber-300/60 shadow-xs">
              <span className="font-bold text-[11px] text-slate-600 px-1.5 flex items-center gap-1">
                {isTechnicalRole ? <Eye size={12} className="text-blue-600" /> : <EyeOff size={12} className="text-amber-600" />}
                Rol visual:
              </span>
              <button
                type="button"
                onClick={() => setIsTechnicalRole(true)}
                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all ${
                  isTechnicalRole ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cuerpo Técnico
              </button>
              <button
                type="button"
                onClick={() => setIsTechnicalRole(false)}
                className={`px-2 py-0.5 rounded-lg font-bold text-[11px] transition-all ${
                  !isTechnicalRole ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Familiar / Jugador
              </button>
            </div>

            <div className="text-[11px] text-amber-900/80 font-mono">
              Fecha Peninsular: <strong>{todaySpainStr}</strong>
            </div>
          </div>
        </div>
      </header>

      {/* ====================================================================== */}
      {/* CUERPO DEL PANEL DE RENDIMIENTO */}
      {/* ====================================================================== */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Cabecera del Panel con Selectores de Equipo y Temporada */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5">
              <Activity className="text-blue-600 w-7 h-7 shrink-0" />
              <span>Centro de Rendimiento Global</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Monitoreo diario de bienestar (Hooper), alertas biomecánicas y control de fatiga.
            </p>
          </div>

          {/* Selectores de Equipo y Temporada */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Selector de Equipo */}
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Equipo</label>
              <select
                value={selectedTeamId}
                onChange={(e) => handleTeamChange(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {MOCK_TEAMS.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Selector de Temporada */}
            <div className="flex flex-col">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Temporada</label>
              <select
                value={selectedSeasonId}
                onChange={(e) => handleSeasonChange(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              >
                {MOCK_SEASONS.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* ESTADOS DE CARGA O VACÍO */}
        {/* ================================================================== */}
        {isLoading ? (
          <div className="p-12 text-center rounded-3xl bg-white border border-slate-200 shadow-xs">
            <RefreshCw className="w-8 h-8 mx-auto text-blue-600 animate-spin mb-3" />
            <p className="font-bold text-sm text-slate-800">Cargando métricas del equipo...</p>
            <p className="text-xs text-slate-400 mt-1">Vaciando datos previos y resolviendo estado de la plantilla.</p>
          </div>
        ) : isHistoricalSeason ? (
          <div className="p-10 rounded-3xl bg-slate-100 border border-slate-200 text-center">
            <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <h3 className="font-bold text-base text-slate-800">Temporada Cerrada (25/26)</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              Esta temporada está archivada en modo histórico. El cuestionario Hooper y las alertas en vivo solo operan sobre la temporada activa 26/27.
            </p>
          </div>
        ) : isEmptyTeam || players.length === 0 ? (
          <div className="p-10 rounded-3xl bg-white border border-slate-200 text-center">
            <Users className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <h3 className="font-bold text-base text-slate-800">Plantilla Sin Jugadores</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              No hay futbolistas inscritos en este equipo para la temporada seleccionada.
            </p>
          </div>
        ) : (
          <>
            {/* ================================================================ */}
            {/* TARJETAS RESUMEN DE BIENESTAR DE HOY */}
            {/* ================================================================ */}
            <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Hooper Global */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Puntuación Hooper</span>
                  <Activity size={15} className="text-blue-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {avgHooperGlobal ?? '—'}
                  <span className="text-xs text-slate-400 font-semibold ml-1">/ 25</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {completedCount} de {players.length} evaluados
                </p>
              </div>

              {/* Calidad de Sueño */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Sueño</span>
                  <Moon size={15} className="text-indigo-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {completedCount > 0 ? avgSleep.toFixed(1) : '—'}
                  <span className="text-xs text-slate-400 font-semibold ml-1">/ 5</span>
                </div>
                <p className="text-[10px] text-emerald-600 font-bold mt-1">5 = Óptimo descanso</p>
              </div>

              {/* Fatiga */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Fatiga</span>
                  <Battery size={15} className="text-amber-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {completedCount > 0 ? avgFatigue.toFixed(1) : '—'}
                  <span className="text-xs text-slate-400 font-semibold ml-1">/ 5</span>
                </div>
                <p className={`text-[10px] font-bold mt-1 ${avgFatigue >= 4 ? 'text-rose-600' : 'text-slate-500'}`}>
                  {avgFatigue >= 4 ? 'Atención: Fatiga Alta' : '1 = Menor fatiga'}
                </p>
              </div>

              {/* Dolor Muscular */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Dolor / Agujetas</span>
                  <Flame size={15} className="text-rose-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {completedCount > 0 ? avgSoreness.toFixed(1) : '—'}
                  <span className="text-xs text-slate-400 font-semibold ml-1">/ 5</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">1 = Sin dolor</p>
              </div>

              {/* Estrés */}
              <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Estrés</span>
                  <Smile size={15} className="text-orange-500" />
                </div>
                <div className="text-2xl font-black text-slate-900 mt-1">
                  {completedCount > 0 ? avgStress.toFixed(1) : '—'}
                  <span className="text-xs text-slate-400 font-semibold ml-1">/ 5</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">1 = Muy relajado</p>
              </div>

              {/* Molestias Físicas Activas */}
              <div className={`p-4 rounded-2xl border shadow-xs ${
                discomfortCount > 0 ? 'bg-rose-50/80 border-rose-200' : 'bg-white border-slate-200'
              }`}>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Molestias</span>
                  <AlertTriangle size={15} className={discomfortCount > 0 ? 'text-rose-600' : 'text-slate-400'} />
                </div>
                <div className={`text-2xl font-black mt-1 ${discomfortCount > 0 ? 'text-rose-900' : 'text-slate-900'}`}>
                  {discomfortCount}
                  <span className="text-xs text-slate-400 font-semibold ml-1">jugadores</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  {discomfortCount > 0 ? 'Requieren valoración' : 'Sin incidencias'}
                </p>
              </div>
            </section>

            {/* ================================================================ */}
            {/* ALERTAS ACTIVAS DEL EQUIPO */}
            {/* ================================================================ */}
            {allAlerts.length > 0 && (
              <section className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="text-amber-500 w-4 h-4" />
                    <span>Alertas Informadas Hoy ({allAlerts.length})</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Calculadas determinísticamente por umbrales Hooper
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {allAlerts.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedPlayerForDrawer(item.player)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-sm ${
                        item.alert.level === 'attention'
                          ? 'bg-rose-50/70 border-rose-200 hover:border-rose-300'
                          : 'bg-amber-50/70 border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-xs text-slate-900">
                          {item.player.firstName} {item.player.lastName} (#{item.player.dorsal})
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          item.alert.level === 'attention' ? 'bg-rose-200 text-rose-900' : 'bg-amber-200 text-amber-900'
                        }`}>
                          {item.alert.level === 'attention' ? 'Atención' : 'Info'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-slate-800">{getAlertTitle(item.alert.type)}</div>
                      <div className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{item.alert.message}</div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ================================================================ */}
            {/* TABLA DE PLANTILLA Y DETALLE INDIVIDUAL */}
            {/* ================================================================ */}
            <section className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-slate-900 text-base">Estado de la Plantilla</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {currentTeam.name} • Sesión de Hoy ({todaySpainStr})
                  </p>
                </div>

                {/* Filtro de Estado */}
                <div className="inline-flex rounded-xl bg-slate-100 p-0.5 border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Todos ({players.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('completed')}
                    className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'completed' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Completados ({completedCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('pending')}
                    className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'pending' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Pendientes ({pendingCount})
                  </button>
                  <button
                    onClick={() => setStatusFilter('discomfort')}
                    className={`px-3 py-1 rounded-lg transition-all ${statusFilter === 'discomfort' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    Molestias ({discomfortCount})
                  </button>
                </div>
              </div>

              {/* Listado */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Jugador</th>
                      <th className="py-3 px-4">Asistencia Hoy</th>
                      <th className="py-3 px-4">Bienestar (Hooper)</th>
                      <th className="py-3 px-4 text-center">Sueño</th>
                      <th className="py-3 px-4 text-center">Fatiga</th>
                      <th className="py-3 px-4 text-center">Dolor</th>
                      <th className="py-3 px-4 text-center">Estrés</th>
                      <th className="py-3 px-4 text-center">Ánimo</th>
                      <th className="py-3 px-4">Molestias</th>
                      <th className="py-3 px-4 text-right">Ficha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPlayers.map(p => {
                      const entry = entriesMap[p.id];
                      const isCompleted = entry?.wellnessStatus === 'completed';
                      const isPending = !entry || entry.wellnessStatus === 'pending';
                      const isNotRequired = entry?.wellnessStatus === 'not_required';

                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPlayerForDrawer(p)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        >
                          {/* Jugador */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center justify-center border border-slate-200">
                                {p.dorsal ?? '—'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                  {p.firstName} {p.lastName}
                                </div>
                                <div className="text-[10px] text-slate-400">{p.position}</div>
                              </div>
                            </div>
                          </td>

                          {/* Asistencia */}
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              entry?.attendanceStatus === 'confirmed'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : entry?.attendanceStatus === 'absent'
                                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>
                              {entry?.attendanceStatus === 'confirmed' ? 'Confirmado' : entry?.attendanceStatus === 'absent' ? 'Ausente' : 'Pendiente'}
                            </span>
                          </td>

                          {/* Estado Wellness */}
                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              isCompleted
                                ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                : isNotRequired
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}>
                              {isCompleted ? 'Completado' : isNotRequired ? 'No Requerido' : 'Pendiente'}
                            </span>
                          </td>

                          {/* 5 Escalas */}
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                            {entry?.ratings ? `${entry.ratings.sleepQuality}` : '—'}
                          </td>
                          <td className={`py-3 px-4 text-center font-mono font-bold ${
                            entry?.ratings && entry.ratings.fatigue >= 4 ? 'text-rose-600' : 'text-slate-800'
                          }`}>
                            {entry?.ratings ? `${entry.ratings.fatigue}` : '—'}
                          </td>
                          <td className={`py-3 px-4 text-center font-mono font-bold ${
                            entry?.ratings && entry.ratings.soreness >= 4 ? 'text-rose-600' : 'text-slate-800'
                          }`}>
                            {entry?.ratings ? `${entry.ratings.soreness}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                            {entry?.ratings ? `${entry.ratings.stress}` : '—'}
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                            {entry?.ratings ? `${entry.ratings.mood}` : '—'}
                          </td>

                          {/* Molestias */}
                          <td className="py-3 px-4">
                            {entry?.discomfort?.hasDiscomfort ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
                                <span className="font-bold text-rose-800 text-[11px]">
                                  {isTechnicalRole ? entry.discomfort.zone : 'Molestia registrada'}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">—</span>
                            )}
                          </td>

                          {/* Botón Ficha */}
                          <td className="py-3 px-4 text-right">
                            <span className="text-blue-600 font-bold text-[11px] group-hover:underline flex items-center justify-end gap-1">
                              Ficha <ChevronRight size={13} />
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {/* ====================================================================== */}
      {/* DRAWER DE JUGADOR (SI HAY UNO SELECCIONADO) */}
      {/* ====================================================================== */}
      {selectedPlayerForDrawer && (
        <DemoPlayerPerformanceDrawer
          player={selectedPlayerForDrawer}
          entry={entriesMap[selectedPlayerForDrawer.id]}
          alerts={allAlerts
            .filter(a => a.player.id === selectedPlayerForDrawer.id)
            .map(a => a.alert)}
          canViewDiscomfort={isTechnicalRole}
          onClose={() => setSelectedPlayerForDrawer(null)}
        />
      )}
    </div>
  );
}
