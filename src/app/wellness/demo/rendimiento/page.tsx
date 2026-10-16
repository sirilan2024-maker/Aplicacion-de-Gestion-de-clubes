"use client";

import React, { useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  FileText,
  Heart,
  Home,
  Info,
  Lock,
  Moon,
  Search,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";

import {
  HooperRatings,
  DiscomfortDetails,
  getSpainDateString,
} from "@/lib/performance/wellness-service";

// ============================================================================
// MODELOS Y DATOS FICTICIOS EN MEMORIA (100% AISLADOS DE PRODUCCIÓN)
// ============================================================================

export interface MockPlayer {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  dorsal: number | null;
  position: string;
  posCode: string;
  posClass: string;
  avatarInitials: string;
  hooper: number;
  sleep: number;
  fatigue: number;
  soreness: number;
  stress: number;
  mood: number;
  status: "completed" | "pending";
  hasDiscomfort: boolean;
  discomfortZone?: string;
  discomfortIntensity?: number;
  discomfortDuration?: string;
  discomfortType?: string;
  discomfortNote?: string;
  sessions: {
    date: string;
    rpe: number;
    min: number;
    note: string;
  }[];
}

const CADETE_A_PLAYERS: MockPlayer[] = [
  {
    id: "p1",
    name: "Javier Martín",
    firstName: "Javier",
    lastName: "Martín",
    dorsal: 10,
    position: "Delantero",
    posCode: "DEL",
    posClass: "bg-blue-100 text-blue-700",
    avatarInitials: "JM",
    hooper: 19.8,
    sleep: 7.8,
    fatigue: 5.2,
    soreness: 1.3,
    stress: 3.1,
    mood: 8.0,
    status: "pending",
    hasDiscomfort: true,
    discomfortZone: "Isquiotibial derecho",
    discomfortIntensity: 8,
    discomfortDuration: "2 días",
    discomfortType: "Contractura",
    discomfortNote: "Requiere seguimiento médico y control de carga.",
    sessions: [
      { date: "Hoy", rpe: 7.5, min: 82, note: "-" },
      { date: "11 may", rpe: 6.0, min: 76, note: "Buenas sensaciones" },
      { date: "09 may", rpe: 8.5, min: 90, note: "Molestia isquiotibial" },
      { date: "06 may", rpe: 5.0, min: 70, note: "-" },
      { date: "04 may", rpe: 7.0, min: 80, note: "-" },
    ],
  },
  {
    id: "p2",
    name: "Carlos Ruiz",
    firstName: "Carlos",
    lastName: "Ruiz",
    dorsal: 7,
    position: "Mediocentro",
    posCode: "MED",
    posClass: "bg-teal-100 text-teal-800",
    avatarInitials: "CR",
    hooper: 18.5,
    sleep: 7.1,
    fatigue: 5.9,
    soreness: 2.8,
    stress: 3.7,
    mood: 7.5,
    status: "completed",
    hasDiscomfort: false,
    sessions: [
      { date: "Hoy", rpe: 6.5, min: 85, note: "-" },
      { date: "11 may", rpe: 6.0, min: 75, note: "Ritmo adecuado" },
      { date: "09 may", rpe: 7.0, min: 90, note: "-" },
    ],
  },
  {
    id: "p3",
    name: "Diego López",
    firstName: "Diego",
    lastName: "López",
    dorsal: 11,
    position: "Extremo",
    posCode: "EXT",
    posClass: "bg-purple-100 text-purple-800",
    avatarInitials: "DL",
    hooper: 17.9,
    sleep: 6.8,
    fatigue: 6.1,
    soreness: 2.5,
    stress: 3.9,
    mood: 7.2,
    status: "pending",
    hasDiscomfort: true,
    discomfortZone: "Cuádriceps",
    discomfortIntensity: 6,
    discomfortDuration: "1 día",
    discomfortType: "Sobrecarga",
    discomfortNote: "Sobrecarga en golpeos de media distancia.",
    sessions: [
      { date: "Hoy", rpe: 7.0, min: 80, note: "-" },
      { date: "11 may", rpe: 6.5, min: 75, note: "-" },
    ],
  },
  {
    id: "p4",
    name: "Álvaro Sánchez",
    firstName: "Álvaro",
    lastName: "Sánchez",
    dorsal: 6,
    position: "Defensa",
    posCode: "DEF",
    posClass: "bg-rose-100 text-rose-800",
    avatarInitials: "AS",
    hooper: 20.2,
    sleep: 8.1,
    fatigue: 4.7,
    soreness: 1.2,
    stress: 2.8,
    mood: 8.5,
    status: "completed",
    hasDiscomfort: false,
    sessions: [
      { date: "Hoy", rpe: 5.5, min: 90, note: "Óptima recuperación" },
    ],
  },
  {
    id: "p5",
    name: "Hugo Torres",
    firstName: "Hugo",
    lastName: "Torres",
    dorsal: 3,
    position: "Defensa",
    posCode: "DEF",
    posClass: "bg-rose-100 text-rose-800",
    avatarInitials: "HT",
    hooper: 16.7,
    sleep: 6.4,
    fatigue: 6.8,
    soreness: 3.1,
    stress: 4.2,
    mood: 6.5,
    status: "completed",
    hasDiscomfort: false,
    sessions: [
      { date: "Hoy", rpe: 8.0, min: 85, note: "Exigencia máxima" },
    ],
  },
  {
    id: "p6",
    name: "Mateo Fernández",
    firstName: "Mateo",
    lastName: "Fernández",
    dorsal: 8,
    position: "Mediocentro",
    posCode: "MED",
    posClass: "bg-teal-100 text-teal-800",
    avatarInitials: "MF",
    hooper: 18.1,
    sleep: 7.5,
    fatigue: 5.6,
    soreness: 2.0,
    stress: 3.4,
    mood: 7.8,
    status: "pending",
    hasDiscomfort: false,
    sessions: [
      { date: "Hoy", rpe: 6.0, min: 80, note: "-" },
    ],
  },
];

const INFANTIL_B_PLAYERS: MockPlayer[] = [
  { id: "ib1", name: "Lucas Molina", firstName: "Lucas", lastName: "Molina", dorsal: 9, position: "Delantero", posCode: "DEL", posClass: "bg-blue-100 text-blue-700", avatarInitials: "LM", hooper: 19.2, sleep: 8.0, fatigue: 4.5, soreness: 1.5, stress: 2.9, mood: 8.1, status: "completed", hasDiscomfort: false, sessions: [] },
  { id: "ib2", name: "Sergio Ramos", firstName: "Sergio", lastName: "Ramos", dorsal: 4, position: "Defensa", posCode: "DEF", posClass: "bg-rose-100 text-rose-800", avatarInitials: "SR", hooper: 17.5, sleep: 7.0, fatigue: 5.8, soreness: 2.2, stress: 3.5, mood: 7.0, status: "completed", hasDiscomfort: false, sessions: [] },
  { id: "ib3", name: "David Gil", firstName: "David", lastName: "Gil", dorsal: 1, position: "Portero", posCode: "POR", posClass: "bg-amber-100 text-amber-800", avatarInitials: "DG", hooper: 20.0, sleep: 8.5, fatigue: 3.8, soreness: 1.0, stress: 2.0, mood: 9.0, status: "completed", hasDiscomfort: false, sessions: [] },
  { id: "ib4", name: "Pablo Soto", firstName: "Pablo", lastName: "Soto", dorsal: 10, position: "Mediapunta", posCode: "MED", posClass: "bg-teal-100 text-teal-800", avatarInitials: "PS", hooper: 16.9, sleep: 6.5, fatigue: 6.2, soreness: 2.8, stress: 4.0, mood: 6.8, status: "pending", hasDiscomfort: false, sessions: [] },
];

// ============================================================================
// COMPONENTE EXCLUSIVO DEMO: DRAWER DE RENDIMIENTO DE JUGADOR
// (SIN CONSULTAS A SUPABASE NI DEPENDENCIAS EXTERNAS)
// ============================================================================

interface DemoPlayerPerformanceDrawerProps {
  player: MockPlayer;
  currentRole: "tech" | "med" | "fam";
  onClose: () => void;
}

function DemoPlayerPerformanceDrawer({
  player,
  currentRole,
  onClose,
}: DemoPlayerPerformanceDrawerProps) {
  const [activeTab, setActiveTab] = useState<"resumen" | "hooper" | "molestias" | "historial">("resumen");

  const isTechnicalOrMedical = currentRole === "tech" || currentRole === "med";

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Drawer */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-sm">
              {player.avatarInitials}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                {player.name}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold text-slate-500">
                  #{player.dorsal} • {player.position}
                </span>
                {player.hasDiscomfort && (
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    ● Molestia activa
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors font-bold text-sm"
            title="Cerrar ficha"
          >
            <X size={16} />
          </button>
        </div>

        {/* Pestañas de Navegación del Drawer */}
        <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold">
          {(["resumen", "hooper", "molestias", "historial"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-full capitalize transition-all ${
                activeTab === tab
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Cuerpo del Drawer */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Tarjeta 1: Valoración Hooper */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 mb-3">
              <Activity size={15} className="text-blue-600" />
              <span>Valoración Hooper</span>
            </div>

            <div className="flex items-center gap-5">
              <div className="flex flex-col items-center justify-center w-22 h-22 rounded-full border-4 border-emerald-500 shrink-0">
                <div className="text-lg font-black text-slate-900 leading-none">
                  {player.hooper}
                </div>
                <div className="text-[10px] font-bold text-slate-400">/ 25</div>
                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full mt-1">
                  Buena
                </span>
              </div>

              <div className="flex-1 space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>🌙 Sueño</span>
                  <strong className="text-slate-900">{player.sleep} / 10</strong>
                </div>
                <div className="flex justify-between">
                  <span>⚡ Fatiga</span>
                  <strong className="text-slate-900">{player.fatigue} / 10</strong>
                </div>
                <div className="flex justify-between">
                  <span>🩹 Dolor Muscular</span>
                  <strong className="text-slate-900">{player.soreness} / 10</strong>
                </div>
                <div className="flex justify-between">
                  <span>🧠 Estrés</span>
                  <strong className="text-slate-900">{player.stress} / 10</strong>
                </div>
                <div className="flex justify-between">
                  <span>⚠️ Molestias</span>
                  <strong className={player.hasDiscomfort ? "text-rose-600" : "text-slate-900"}>
                    {player.hasDiscomfort ? `${player.discomfortIntensity}.0 / 10` : "0.0 / 10"}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Molestias Actuales y Protección de Confidencialidad */}
          {player.hasDiscomfort ? (
            !isTechnicalOrMedical ? (
              // Vista Redactada para Familiar / Jugador
              <div className="p-4 rounded-2xl border border-amber-200 bg-amber-50 text-amber-900 text-xs flex items-center gap-3">
                <Lock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <strong className="block text-amber-950 font-bold mb-0.5">
                    Información de Salud Confidencial
                  </strong>
                  <span>
                    Los detalles anatómicos y el diagnóstico clínico están reservados al cuerpo técnico y médico para proteger la privacidad del deportista.
                  </span>
                </div>
              </div>
            ) : (
              // Vista Completa para Cuerpo Técnico o Médico
              <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/70">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-rose-900">
                    <AlertTriangle size={15} className="text-rose-600" />
                    <span>Molestias actuales</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded-full">
                    {currentRole === "med" ? "Diagnóstico Clínico" : "Informe Técnico"}
                  </span>
                </div>

                <div className="flex gap-4 items-center mt-3">
                  {/* Silueta Anatómica Humana SVG con isquiotibial resaltado */}
                  <div className="w-24 h-32 bg-white rounded-xl border border-rose-200 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 100 150" className="w-20 h-28">
                      <circle cx="50" cy="15" r="9" fill="#cbd5e1" />
                      <path d="M38,25 L62,25 L60,65 L40,65 Z" fill="#cbd5e1" />
                      <path d="M38,65 L62,65 L60,80 L40,80 Z" fill="#cbd5e1" />
                      <path d="M40,80 L49,80 L47,135 L42,135 Z" fill="#cbd5e1" />
                      <path d="M51,80 L60,80 L58,135 L53,135 Z" fill="#cbd5e1" />
                      {/* Zona resaltada en rojo según la lesión */}
                      <ellipse cx="55.5" cy="98" rx="4.5" ry="12" fill="#ef4444" opacity="0.9" />
                    </svg>
                  </div>

                  <div className="flex-1 space-y-1 text-xs">
                    <div className="font-extrabold text-rose-900 text-sm">
                      {player.discomfortZone}
                    </div>
                    <div className="font-extrabold text-rose-700 text-xs">
                      Intensidad: {player.discomfortIntensity}/10
                    </div>
                    <div className="text-slate-600">
                      <strong>Duración:</strong> {player.discomfortDuration}
                    </div>
                    <div className="text-slate-600">
                      <strong>Tipo:</strong> {player.discomfortType}
                    </div>
                    <div className="text-[11px] text-slate-700 bg-white p-2 rounded-lg border border-rose-200 mt-2">
                      • {player.discomfortNote}
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Sin molestias físicas reportadas en la sesión de hoy.</span>
            </div>
          )}

          {/* Tarjeta 3: Historial de Sesiones sRPE */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2 text-xs font-extrabold text-slate-800 mb-2">
              <BarChart3 size={15} className="text-blue-600" />
              <span>Historial de sesiones (sRPE)</span>
            </div>

            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 uppercase font-black">
                  <th className="py-1.5 px-2">Fecha</th>
                  <th className="py-1.5 px-2">sRPE</th>
                  <th className="py-1.5 px-2">Minutos</th>
                  <th className="py-1.5 px-2">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {player.sessions.map((s, idx) => (
                  <tr key={idx}>
                    <td className="py-2 px-2 font-bold text-slate-800">{s.date}</td>
                    <td className="py-2 px-2">
                      <span
                        className={`font-black ${
                          s.rpe >= 8 ? "text-rose-600" : "text-emerald-700"
                        }`}
                      >
                        {s.rpe}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-slate-600">{s.min}</td>
                    <td className="py-2 px-2 text-slate-500 text-[11px]">{s.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjeta 4: Aviso de Confidencialidad Médica */}
          <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50 text-blue-900 text-[11px] leading-relaxed">
            <strong className="block font-bold mb-0.5">ℹ️ Información clínica</strong>
            Los datos de molestias son confidenciales y solo visibles para el cuerpo técnico y personal médico autorizado.
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// COMPONENTE PRINCIPAL DE LA RUTA DEMO: CENTRO DE RENDIMIENTO
// ============================================================================

export default function PerformanceDemoPage() {
  const [selectedTeam, setSelectedTeam] = useState<"cadete_a" | "infantil_b" | "prebenjamin_c">("cadete_a");
  const [selectedSeason, setSelectedSeason] = useState<"26_27" | "25_26">("26_27");
  const [currentRole, setCurrentRole] = useState<"tech" | "med" | "fam">("tech");
  const [currentFilter, setCurrentFilter] = useState<"todos" | "completados" | "pendientes" | "molestias">("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedPlayerForDrawer, setSelectedPlayerForDrawer] = useState<MockPlayer | null>(null);

  const todaySpainStr = "13 may 2025, 16:42";

  // Control de cambio de equipo con cierre garantizado del drawer
  const handleTeamChange = (val: "cadete_a" | "infantil_b" | "prebenjamin_c") => {
    setSelectedPlayerForDrawer(null); // Corrige cierre inmediato
    setSelectedTeam(val);
  };

  // Control de cambio de temporada con cierre garantizado del drawer
  const handleSeasonChange = (val: "26_27" | "25_26") => {
    setSelectedPlayerForDrawer(null); // Corrige cierre inmediato
    setSelectedSeason(val);
  };

  // Apertura de drawer por ID
  const handleOpenDrawerById = (playerId: string) => {
    const list = selectedTeam === "cadete_a" ? CADETE_A_PLAYERS : INFANTIL_B_PLAYERS;
    const found = list.find((p) => p.id === playerId) || CADETE_A_PLAYERS[0];
    setSelectedPlayerForDrawer(found);
  };

  // Selección de futbolistas según equipo activo
  const activePlayers =
    selectedSeason === "25_26" || selectedTeam === "prebenjamin_c"
      ? []
      : selectedTeam === "cadete_a"
      ? CADETE_A_PLAYERS
      : INFANTIL_B_PLAYERS;

  // Filtrado de futbolistas
  const filteredPlayers = activePlayers.filter((p) => {
    if (currentFilter === "completados" && p.status !== "completed") return false;
    if (currentFilter === "pendientes" && p.status !== "pending") return false;
    if (currentFilter === "molestias" && !p.hasDiscomfort) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const total = activePlayers.length;
  const pendingCount = activePlayers.filter((p) => p.status === "pending").length;
  const discomfortCount = activePlayers.filter((p) => p.hasDiscomfort).length;
  const avgHooper = total > 0 ? (activePlayers.reduce((s, p) => s + p.hooper, 0) / total).toFixed(1) : "—";
  const avgSleep = total > 0 ? (activePlayers.reduce((s, p) => s + p.sleep, 0) / total).toFixed(1) : "—";
  const avgFatigue = total > 0 ? (activePlayers.reduce((s, p) => s + p.fatigue, 0) / total).toFixed(1) : "—";
  const avgSoreness = total > 0 ? (activePlayers.reduce((s, p) => s + p.soreness, 0) / total).toFixed(1) : "—";
  const avgStress = total > 0 ? (activePlayers.reduce((s, p) => s + p.stress, 0) / total).toFixed(1) : "—";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex overflow-x-hidden font-sans">
      {/* ====================================================================== */}
      {/* 1. BARRA LATERAL IZQUIERDA (DARK NAVY) IDENTICA A LA IMAGEN */}
      {/* ====================================================================== */}
      <aside className="w-60 bg-[#0b1329] text-white shrink-0 min-h-screen sticky top-0 h-screen hidden md:flex flex-col border-r border-[#172554] z-30">
        {/* Cabecera Sidebar */}
        <div className="p-5 border-b border-[#172554] flex items-center gap-3">
          <div className="w-9 h-9 bg-linear-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md shadow-blue-500/30">
            <BarChart3 size={20} />
          </div>
          <div>
            <div className="font-extrabold text-sm tracking-tight text-white leading-none">
              ANTIGRAVITY
            </div>
            <div className="text-[11px] font-semibold text-blue-300 mt-1">
              Demo - Rendimiento
            </div>
          </div>
        </div>

        {/* Navegación Sidebar */}
        <nav className="p-3 flex-1 flex flex-col gap-1 text-xs font-semibold text-slate-400">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
            <Home size={17} />
            <span>Inicio</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-600/30 cursor-pointer">
            <BarChart3 size={17} />
            <span>Rendimiento</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
            <Heart size={17} />
            <span>Bienestar</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
            <Users size={17} />
            <span>Equipos</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
            <Calendar size={17} />
            <span>Calendario</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
            <UserCheck size={17} />
            <span>Jugadores</span>
          </div>

          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 hover:text-white transition-colors cursor-pointer">
            <FileText size={17} />
            <span>Informes</span>
          </div>
        </nav>

        {/* Footer Sidebar con Estado en Memoria */}
        <div className="p-3.5 border-t border-[#172554] space-y-3">
          <div className="bg-[#111e40] border border-[#1d3368] rounded-xl p-3">
            <div className="flex items-center gap-2 text-[11px] font-black text-emerald-400 uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>DEMO EN MEMORIA</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Todos los datos son ficticios y se gestionan en el navegador.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Clock size={13} />
            <span>Fecha actual (ES): <strong className="text-slate-300">{todaySpainStr}</strong></span>
          </div>
        </div>
      </aside>

      {/* ====================================================================== */}
      {/* 2. AREA PRINCIPAL                                                      */}
      {/* ====================================================================== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Banner Superior de Demostración */}
        <header className="bg-sky-50 border-b border-sky-100 px-6 py-2.5 flex items-center justify-between text-xs text-sky-900 sticky top-0 z-20">
          <div className="inline-flex items-center gap-2 bg-sky-200/70 text-sky-800 font-extrabold px-3 py-0.5 rounded-full">
            <ShieldCheck size={13} />
            <span>Modo demostración • 100% En memoria</span>
          </div>
          <div className="text-slate-500 font-medium hidden sm:block">
            Datos ficticios • Sin conexión • 13 may 2025 (ES)
          </div>
        </header>

        <main className="p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Header de la Página con los 3 Selectores */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Centro de Rendimiento
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Bienestar, carga y rendimiento de tu equipo
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Selector de Equipo */}
              <div className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 flex flex-col shadow-xs">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Equipo
                </label>
                <select
                  value={selectedTeam}
                  onChange={(e) => handleTeamChange(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-900 outline-hidden cursor-pointer"
                >
                  <option value="cadete_a">⚽ Cadete A (6 jugadores)</option>
                  <option value="infantil_b">⚽ Infantil B (4 jugadores)</option>
                  <option value="prebenjamin_c">⚽ Prebenjamín C (0 jugadores)</option>
                </select>
              </div>

              {/* Selector de Temporada */}
              <div className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 flex flex-col shadow-xs">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Temporada
                </label>
                <select
                  value={selectedSeason}
                  onChange={(e) => handleSeasonChange(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-900 outline-hidden cursor-pointer"
                >
                  <option value="26_27">📅 Temporada 26/27 (Activa)</option>
                  <option value="25_26">🔒 Temporada 25/26 (Cerrada)</option>
                </select>
              </div>

              {/* Selector de Rol Visual */}
              <div className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 flex flex-col shadow-xs">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Rol visual
                </label>
                <select
                  value={currentRole}
                  onChange={(e) => setCurrentRole(e.target.value as any)}
                  className="bg-transparent text-xs font-bold text-slate-900 outline-hidden cursor-pointer"
                >
                  <option value="tech">👤 Cuerpo Técnico</option>
                  <option value="med">🩺 Personal Médico</option>
                  <option value="fam">👨‍👩‍👦 Familiar / Jugador</option>
                </select>
              </div>
            </div>
          </div>

          {/* Banner de Advertencia de Temporada Cerrada (Regla 1) */}
          {selectedSeason === "25_26" && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center gap-3">
              <Lock className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <strong>Temporada 25/26 archivada (Modo Solo Lectura Histórico):</strong>
                <span className="block mt-0.5">
                  En cumplimiento de la Regla 1 de AGENTS.md, la temporada 25/26 está cerrada y no se cruzan datos con la temporada activa 26/27.
                </span>
              </div>
            </div>
          )}

          {/* Estado de Plantilla Vacía */}
          {selectedSeason !== "25_26" && selectedTeam === "prebenjamin_c" && (
            <div className="p-12 text-center rounded-2xl bg-white border border-slate-200">
              <Users className="w-10 h-10 mx-auto text-slate-400 mb-2" />
              <h3 className="font-extrabold text-base text-slate-800">
                Plantilla vacía (Prebenjamín C)
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                No hay futbolistas inscritos en este grupo para la temporada activa.
              </p>
            </div>
          )}

          {/* Panel Operativo con Datos Activos */}
          {selectedSeason === "26_27" && selectedTeam !== "prebenjamin_c" && (
            <>
              {/* ============================================================== */}
              {/* 3. FILA DE 6 METRICAS KPI CON GAUGE Y SPARKLINES               */}
              {/* ============================================================== */}
              <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {/* Hooper Global */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500">
                    <ShieldCheck size={15} className="text-blue-600" />
                    <span>Hooper Global</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                      <svg className="w-14 h-14 -rotate-90" viewBox="0 0 60 60">
                        <circle cx="30" cy="30" r="25" fill="none" stroke="#f1f5f9" strokeWidth="6" />
                        <circle cx="30" cy="30" r="25" fill="none" stroke="#0d9488" strokeWidth="6" strokeDasharray="157" strokeDashoffset="40" strokeLinecap="round" />
                      </svg>
                      <div className="absolute text-center leading-none">
                        <span className="font-black text-xs text-slate-900">{avgHooper}</span>
                        <span className="block text-[8px] font-bold text-slate-400">/ 25</span>
                      </div>
                    </div>
                    <div>
                      <svg className="w-16 h-8" viewBox="0 0 70 32">
                        <path d="M0,24 Q15,20 30,16 T50,10 T70,8" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                      </svg>
                      <div className="text-[10px] font-extrabold text-emerald-600 mt-0.5">
                        ↑ +0.8 <span className="text-slate-400 font-medium">vs. sem. ant.</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sueño */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500">
                    <Moon size={15} className="text-blue-600" />
                    <span>Sueño</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <div className="text-2xl font-black text-slate-900">
                        {avgSleep} <span className="text-xs font-bold text-slate-400">/ 10</span>
                      </div>
                      <div className="text-[11px] font-extrabold text-emerald-600 mt-0.5">
                        ↑ +0.2
                      </div>
                    </div>
                    <svg className="w-16 h-8" viewBox="0 0 70 32">
                      <path d="M0,20 Q20,15 35,22 T70,12" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Fatiga */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500">
                    <Zap size={15} className="text-amber-500" />
                    <span>Fatiga</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <div className="text-2xl font-black text-slate-900">
                        {avgFatigue} <span className="text-xs font-bold text-slate-400">/ 10</span>
                      </div>
                      <div className="text-[11px] font-extrabold text-emerald-600 mt-0.5">
                        ↓ -0.6
                      </div>
                    </div>
                    <svg className="w-16 h-8" viewBox="0 0 70 32">
                      <path d="M0,10 Q25,18 45,14 T70,22" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Dolor Muscular */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500">
                    <Activity size={15} className="text-rose-600" />
                    <span>Dolor Muscular</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <div className="text-2xl font-black text-slate-900">
                        {avgSoreness} <span className="text-xs font-bold text-slate-400">/ 10</span>
                      </div>
                      <div className="text-[11px] font-extrabold text-emerald-600 mt-0.5">
                        ↓ -0.3
                      </div>
                    </div>
                    <svg className="w-16 h-8" viewBox="0 0 70 32">
                      <path d="M0,14 Q20,22 40,16 T70,24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Estrés */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500">
                    <Brain size={15} className="text-purple-600" />
                    <span>Estrés</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <div className="text-2xl font-black text-slate-900">
                        {avgStress} <span className="text-xs font-bold text-slate-400">/ 10</span>
                      </div>
                      <div className="text-[11px] font-extrabold text-emerald-600 mt-0.5">
                        ↓ -0.5
                      </div>
                    </div>
                    <svg className="w-16 h-8" viewBox="0 0 70 32">
                      <path d="M0,18 Q30,12 50,20 T70,14" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Molestias Activas */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-500">
                    <AlertTriangle size={15} className="text-rose-600" />
                    <span>Molestias Activas</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <div className="text-2xl font-black text-rose-700">
                        {discomfortCount}
                      </div>
                      <div className="text-[11px] font-bold text-slate-400 mt-0.5">
                        de {total} jugadores
                      </div>
                    </div>
                    <svg className="w-16 h-8" viewBox="0 0 70 32">
                      <path d="M0,24 Q25,10 45,26 T70,12" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>
              </section>

              {/* ============================================================== */}
              {/* 4. SECCIÓN DE ALERTAS DEL EQUIPO (3 TARJETAS PASTEL)           */}
              {/* ============================================================== */}
              <section className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-600" />
                    <h3 className="font-black text-sm text-slate-900">Alertas del equipo</h3>
                    <span className="bg-rose-100 text-rose-800 text-[11px] font-black px-2 py-0.5 rounded-full">
                      3
                    </span>
                  </div>
                  <button
                    onClick={() => setCurrentFilter("molestias")}
                    className="text-xs font-bold text-blue-600 hover:underline"
                  >
                    Ver todas →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Alerta 1: Javier Martín */}
                  <div
                    onClick={() => handleOpenDrawerById("p1")}
                    className="p-3.5 rounded-xl bg-rose-50/80 border border-rose-200 hover:shadow-xs cursor-pointer transition-transform hover:-translate-y-0.5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="bg-rose-200 text-rose-900 font-black px-2 py-0.5 rounded-md text-[10px]">
                        ⚠️ ATENCIÓN
                      </span>
                      <span className="text-slate-400 font-semibold">Hoy</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-black text-xs shrink-0">
                        JM
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-extrabold text-slate-900 truncate">Javier Martín</div>
                        <div className="text-[11px] text-slate-600 truncate">
                          {currentRole === "fam" ? (
                            <em>Molestia física reportada (confidencial)</em>
                          ) : (
                            <>Molestia: <strong className="text-rose-700">Isquiotibial derecho</strong></>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {currentRole === "fam" ? "Estado: En seguimiento" : "Intensidad: 8/10"}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>

                  {/* Alerta 2: Diego López */}
                  <div
                    onClick={() => handleOpenDrawerById("p3")}
                    className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200 hover:shadow-xs cursor-pointer transition-transform hover:-translate-y-0.5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="bg-amber-200 text-amber-900 font-black px-2 py-0.5 rounded-md text-[10px]">
                        ⚠️ ATENCIÓN
                      </span>
                      <span className="text-slate-400 font-semibold">Hoy</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-black text-xs shrink-0">
                        DL
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-extrabold text-slate-900 truncate">Diego López</div>
                        <div className="text-[11px] text-slate-600 truncate">
                          {currentRole === "fam" ? (
                            <em>Molestia muscular leve</em>
                          ) : (
                            <>Molestia: <strong className="text-amber-800">Cuádriceps</strong></>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {currentRole === "fam" ? "Estado: Cuestionario recibido" : "Intensidad: 6/10"}
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>

                  {/* Alerta 3: Mateo Fernández */}
                  <div
                    onClick={() => handleOpenDrawerById("p6")}
                    className="p-3.5 rounded-xl bg-sky-50/80 border border-sky-200 hover:shadow-xs cursor-pointer transition-transform hover:-translate-y-0.5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="bg-sky-200 text-sky-900 font-black px-2 py-0.5 rounded-md text-[10px]">
                        ℹ️ INFO
                      </span>
                      <span className="text-slate-400 font-semibold">Hoy</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-200 text-slate-800 flex items-center justify-center font-black text-xs shrink-0">
                        MF
                      </div>
                      <div className="flex-1 min-w-0 text-xs">
                        <div className="font-extrabold text-slate-900 truncate">Mateo Fernández</div>
                        <div className="text-[11px] text-slate-600 truncate">Cuestionario pendiente de envío</div>
                        <div className="text-[11px] text-slate-400">Sin molestias reportadas</div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>
                </div>
              </section>

              {/* ============================================================== */}
              {/* 5. TABLA DE PLANTILLA Y FILTROS                                */}
              {/* ============================================================== */}
              <section className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setCurrentFilter("todos")}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                        currentFilter === "todos"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setCurrentFilter("completados")}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                        currentFilter === "completados"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      Completados
                    </button>
                    <button
                      onClick={() => setCurrentFilter("pendientes")}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                        currentFilter === "pendientes"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>Pendientes</span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 rounded-full font-black">
                        {pendingCount}
                      </span>
                    </button>
                    <button
                      onClick={() => setCurrentFilter("molestias")}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold inline-flex items-center gap-1.5 transition-all ${
                        currentFilter === "molestias"
                          ? "bg-blue-600 text-white shadow-xs"
                          : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>Con Molestias</span>
                      <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 rounded-full font-black">
                        {discomfortCount}
                      </span>
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar jugador..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-48 sm:w-60"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-[11px] font-black uppercase text-slate-400 tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4">Jugador</th>
                        <th className="py-3 px-3">Posición</th>
                        <th className="py-3 px-3">Hooper</th>
                        <th className="py-3 px-3">Sueño</th>
                        <th className="py-3 px-3">Fatiga</th>
                        <th className="py-3 px-3">Dolor</th>
                        <th className="py-3 px-3">Estrés</th>
                        <th className="py-3 px-3">Molestias</th>
                        <th className="py-3 px-3">Estado</th>
                        <th className="py-3 px-4"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredPlayers.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="py-8 text-center text-slate-400">
                            No se encontraron jugadores con los filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        filteredPlayers.map((player) => (
                          <tr
                            key={player.id}
                            onClick={() => setSelectedPlayerForDrawer(player)}
                            className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs shrink-0">
                                  {player.avatarInitials}
                                </div>
                                <div>
                                  <div className="font-extrabold text-slate-900">{player.name}</div>
                                  <div className="text-[11px] text-slate-400">
                                    #{player.dorsal} • {player.position}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-md font-extrabold text-[10px] ${player.posClass}`}>
                                {player.posCode}
                              </span>
                            </td>

                            <td className="py-3 px-3">
                              <span className="bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full text-xs">
                                {player.hooper}
                              </span>
                            </td>

                            <td className="py-3 px-3 font-bold text-slate-700">{player.sleep}</td>
                            <td className="py-3 px-3 font-bold text-slate-700">{player.fatigue}</td>
                            <td className="py-3 px-3 font-bold text-slate-700">{player.soreness}</td>
                            <td className="py-3 px-3 font-bold text-slate-700">{player.stress}</td>

                            <td className="py-3 px-3">
                              {player.hasDiscomfort ? (
                                currentRole === "fam" ? (
                                  <span className="bg-amber-100 text-amber-800 text-[11px] font-extrabold px-2 py-0.5 rounded-md">
                                    ● Molestia
                                  </span>
                                ) : (
                                  <span
                                    className={`text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                                      (player.discomfortIntensity || 0) >= 7
                                        ? "bg-rose-100 text-rose-800"
                                        : "bg-amber-100 text-amber-800"
                                    }`}
                                  >
                                    {player.discomfortZone}
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>

                            <td className="py-3 px-3">
                              <span
                                className={`text-[11px] font-black px-2.5 py-0.5 rounded-full ${
                                  player.status === "completed"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {player.status === "completed" ? "Completado" : "Pendiente"}
                              </span>
                            </td>

                            <td className="py-3 px-4 text-right text-slate-400">
                              <ChevronRight size={16} />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* ============================================================== */}
              {/* 6. LISTADO INFERIOR DE OTROS EQUIPOS                           */}
              {/* ============================================================== */}
              <section className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 text-xs">
                <div className="p-3.5 px-5 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-extrabold text-slate-800">
                    <span>⚽</span>
                    <span>Infantil B (4 jugadores)</span>
                  </div>
                  <button
                    onClick={() => handleTeamChange("infantil_b")}
                    className="font-bold text-blue-600 hover:underline"
                  >
                    Ver equipo →
                  </button>
                </div>

                <div className="p-3.5 px-5 flex items-center justify-between">
                  <div className="flex items-center gap-2 font-extrabold text-slate-800">
                    <span>⚽</span>
                    <span>Prebenjamín C (0 jugadores)</span>
                  </div>
                  <span className="text-slate-400 font-semibold">Plantilla vacía</span>
                </div>
              </section>
            </>
          )}
        </main>
      </div>

      {/* ====================================================================== */}
      {/* 7. FICHA LATERAL (DEMO PLAYER PERFORMANCE DRAWER)                      */}
      {/* ====================================================================== */}
      {selectedPlayerForDrawer && (
        <DemoPlayerPerformanceDrawer
          player={selectedPlayerForDrawer}
          currentRole={currentRole}
          onClose={() => setSelectedPlayerForDrawer(null)}
        />
      )}
    </div>
  );
}
