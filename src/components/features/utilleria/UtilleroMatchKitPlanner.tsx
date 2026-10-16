"use client";

import React, { useEffect, useState, useTransition } from "react";
import {
  Shirt,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Bell,
  Calendar,
  MapPin,
  Filter,
  CheckCheck,
  ChevronDown,
  Info
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getWeekendKitScheduleAction,
  toggleMatchKitPreparedAction,
  updateMatchKitSelectionAction,
  sendUtilleroWeeklyAlertAction,
  MatchKitItem,
  WeekendKitScheduleSummary
} from "@/app/actions/utillero-actions";
import { MatchKitBadge } from "@/components/features/matches/MatchKitBadge";

function formatMadridMatchDate(isoStr: string) {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return { dateStr: isoStr, timeStr: "", dayName: "" };
    const parts = new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(d);
    const weekday = parts.find((p) => p.type === "weekday")?.value || "";
    const day = parts.find((p) => p.type === "day")?.value || "00";
    const month = parts.find((p) => p.type === "month")?.value || "00";
    const hour = parts.find((p) => p.type === "hour")?.value || "00";
    const minute = parts.find((p) => p.type === "minute")?.value || "00";
    return {
      dateStr: `${day}/${month}`,
      timeStr: `${hour}:${minute} h`,
      dayName: weekday.charAt(0).toUpperCase() + weekday.slice(1),
    };
  } catch {
    return { dateStr: isoStr, timeStr: "", dayName: "" };
  }
}

export function UtilleroMatchKitPlanner() {
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchKitItem[]>([]);
  const [summary, setSummary] = useState<WeekendKitScheduleSummary | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "conflicts" | "prepared">("all");
  const [isPending, startTransition] = useTransition();
  const [sendingAlert, setSendingAlert] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadSchedule = async () => {
    setLoading(true);
    try {
      const res = await getWeekendKitScheduleAction();
      if (res.success && res.matches && res.summary) {
        setMatches(res.matches);
        setSummary(res.summary);
      } else {
        toast.error(res.error || "No se pudo cargar la hoja de ruta de equipaciones");
      }
    } catch {
      toast.error("Error al conectar con el servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  const handleTogglePrepared = async (matchId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setTogglingId(matchId);

    // Actualización optimista en UI
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, equipacionPreparada: nextStatus } : m))
    );
    setSummary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        preparedCount: prev.preparedCount + (nextStatus ? 1 : -1),
        pendingCount: prev.pendingCount + (nextStatus ? -1 : 1),
      };
    });

    try {
      const res = await toggleMatchKitPreparedAction(matchId, nextStatus);
      if (res.success) {
        toast.success(nextStatus ? "Ropa marcada como lista ✅" : "Marcada como pendiente ⏳");
      } else {
        toast.error("Error: " + res.error);
        loadSchedule(); // Revertir en error
      }
    } catch {
      toast.error("Error de comunicación");
      loadSchedule();
    } finally {
      setTogglingId(null);
    }
  };

  const handleOverrideKit = async (matchId: string, equipacion: "primera" | "segunda") => {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, equipacionAsignada: equipacion } : m))
    );

    try {
      const res = await updateMatchKitSelectionAction(matchId, equipacion);
      if (res.success) {
        toast.success(`Equipación cambiada a ${equipacion === "segunda" ? "2ª Roja" : "1ª Azul"}`);
      } else {
        toast.error("Error al actualizar equipación: " + res.error);
        loadSchedule();
      }
    } catch {
      toast.error("Error de comunicación");
      loadSchedule();
    }
  };

  const handleSendWeeklyAlert = async () => {
    if (!confirm("¿Deseas enviar un aviso urgente a los utilleros y coordinadores con la lista de equipaciones del fin de semana?")) {
      return;
    }

    setSendingAlert(true);
    try {
      const res = await sendUtilleroWeeklyAlertAction();
      if (res.success) {
        toast.success(res.message || "Aviso enviado correctamente a los utilleros");
      } else {
        toast.error("Error al enviar aviso: " + res.error);
      }
    } catch {
      toast.error("Error al enviar notificación");
    } finally {
      setSendingAlert(false);
    }
  };

  const filteredMatches = matches.filter((m) => {
    if (filter === "pending") return !m.equipacionPreparada;
    if (filter === "prepared") return m.equipacionPreparada;
    if (filter === "conflicts") return m.conflictoEquipacion || m.equipacionAsignada === "segunda";
    return true;
  });

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center space-y-3 bg-white rounded-2xl border border-slate-200">
        <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-bold text-slate-500">Analizando rivales y equipaciones oficiales FFCV...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-300">
      {/* ── 1. BARRA DE MÉTRICAS Y RESUMEN DE LA JORNADA ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Partidos Jornada</span>
              <span className="text-lg sm:text-xl font-black text-slate-900">{summary.totalMatches}</span>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Shirt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">1ª Azul Oficial</span>
              <span className="text-lg sm:text-xl font-black text-blue-700">{summary.primeraCount}</span>
            </div>
          </div>

          <div
            className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border shadow-2xs flex items-center gap-2.5 sm:gap-3 ${
              summary.segundaCount > 0
                ? "bg-rose-50/70 border-rose-200 text-rose-950"
                : "bg-white border-slate-200"
            }`}
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 ${
                summary.segundaCount > 0
                  ? "bg-white border-rose-300 text-rose-600"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <Shirt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider block truncate">2ª Roja (Conflicto)</span>
                {summary.conflictCount > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-ping" />
                )}
              </div>
              <span className="text-lg sm:text-xl font-black text-rose-700">{summary.segundaCount}</span>
            </div>
          </div>

          <div className="bg-white p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-2.5 sm:gap-3">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl border flex items-center justify-center shrink-0 ${
                summary.pendingCount === 0
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : "bg-amber-50 border-amber-200 text-amber-600"
              }`}
            >
              {summary.pendingCount === 0 ? <CheckCheck className="w-4 h-4 sm:w-5 sm:h-5" /> : <Clock className="w-4 h-4 sm:w-5 sm:h-5" />}
            </div>
            <div className="min-w-0">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block truncate">Preparación</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-black text-emerald-700">{summary.preparedCount}</span>
                <span className="text-xs font-semibold text-slate-400">/{summary.totalMatches}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. ALERTA DESTACADA DE CONFLICTOS DE COLOR (SI EXISTEN) ── */}
      {summary && summary.segundaCount > 0 && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <div className="p-2 rounded-xl bg-white border border-amber-200 text-amber-600 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-extrabold text-slate-900 leading-snug">
                Atención Utillería: {summary.segundaCount} partido{summary.segundaCount > 1 ? "s" : ""} con 2ª Equipación Roja obligatoria
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-600 mt-0.5 leading-relaxed">
                El rival viste de azul en la FFCV. Equipación visitante roja obligatoria para evitar incidencias arbitrales.
              </p>
            </div>
          </div>

          <button
            onClick={handleSendWeeklyAlert}
            disabled={sendingAlert}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2.5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <Bell className={`w-3.5 h-3.5 ${sendingAlert ? "animate-spin" : ""}`} />
            {sendingAlert ? "Enviando aviso..." : "Enviar aviso a Utilleros"}
          </button>
        </div>
      )}

      {/* ── 3. CONTROLES Y FILTROS ── */}
      <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold overflow-x-auto max-w-full scrollbar-none gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              filter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Todos ({matches.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              filter === "pending" ? "bg-white text-amber-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ⏳ Pendientes ({summary?.pendingCount || 0})
          </button>
          <button
            onClick={() => setFilter("conflicts")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              filter === "conflicts" ? "bg-white text-rose-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            👕 2ª Roja ({summary?.segundaCount || 0})
          </button>
          <button
            onClick={() => setFilter("prepared")}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg transition-all shrink-0 ${
              filter === "prepared" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ✅ Listas ({summary?.preparedCount || 0})
          </button>
        </div>

        <button
          onClick={loadSchedule}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
          title="Refrescar y comprobar colores FFCV"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Actualizar FFCV</span>
        </button>
      </div>

      {/* ── 4. LISTADO DE PARTIDOS PARA PREPARACIÓN DE EQUIPACIONES ── */}
      {filteredMatches.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
          <Shirt className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No hay partidos que coincidan con el filtro</p>
          <p className="text-xs text-slate-400">Todos los partidos seleccionados están al día en preparación.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredMatches.map((match) => {
            const { dateStr, timeStr, dayName } = formatMadridMatchDate(match.fechaHora);
            const isSegunda = match.equipacionAsignada === "segunda";
            const isToggling = togglingId === match.id;

            return (
              <div
                key={match.id}
                className={`rounded-2xl border transition-all shadow-xs flex flex-col justify-between overflow-hidden ${
                  match.equipacionPreparada
                    ? "bg-white border-emerald-300/80 ring-1 ring-emerald-200/50"
                    : isSegunda
                    ? "bg-white border-rose-300 ring-1 ring-rose-200/60"
                    : "bg-white border-slate-200 hover:border-indigo-300"
                }`}
              >
                {/* 1. Cabecera de la ficha: Fecha/Hora y Badges superiores */}
                <div className="p-3 sm:p-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                  {/* Fecha y Hora en España */}
                  <div className="inline-flex items-center gap-1.5 font-bold text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs text-xs">
                    <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="uppercase text-[11px] font-black">{dayName}, {dateStr}</span>
                    <span className="text-slate-300">·</span>
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-black text-slate-900 text-xs">{timeStr}</span>
                  </div>

                  {/* Estado de Local/Visitante y Ropa */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-lg border ${
                      match.esLocal
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-amber-700 bg-amber-50 border-amber-200"
                    }`}>
                      {match.esLocal ? "Local" : "Visitante"}
                    </span>

                    <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                      match.equipacionPreparada
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                        : "bg-amber-100/70 text-amber-900 border-amber-300"
                    }`}>
                      {match.equipacionPreparada ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Lista</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                          <span>Pendiente</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* 2. Cuerpo de la ficha: Enfrentamiento deportivo */}
                <div className="p-3.5 sm:p-4 space-y-3">
                  {/* Bloque de Equipos (Local vs Visitante) */}
                  <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80 space-y-2">
                    {/* Equipo Local */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {match.esLocal ? (
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: match.teamColor || "#4F46E5" }}
                          />
                        ) : (
                          <span className="w-3 h-3 rounded-full shrink-0 bg-slate-300" />
                        )}
                        <span className={`text-xs sm:text-sm leading-snug break-words ${
                          match.esLocal ? "font-black text-indigo-950" : "font-extrabold text-slate-800"
                        }`}>
                          {match.esLocal ? match.teamName : match.rivalNombre}
                        </span>
                      </div>
                      {match.esLocal && match.teamCategory && (
                        <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 shrink-0">
                          {match.teamCategory}
                        </span>
                      )}
                    </div>

                    {/* Divisor VS */}
                    <div className="flex items-center gap-2">
                      <div className="h-px bg-slate-200 flex-1" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">VS</span>
                      <div className="h-px bg-slate-200 flex-1" />
                    </div>

                    {/* Equipo Visitante */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {!match.esLocal ? (
                          <span
                            className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                            style={{ backgroundColor: match.teamColor || "#4F46E5" }}
                          />
                        ) : (
                          <span className="w-3 h-3 rounded-full shrink-0 bg-slate-300" />
                        )}
                        <span className={`text-xs sm:text-sm leading-snug break-words ${
                          !match.esLocal ? "font-black text-indigo-950" : "font-extrabold text-slate-800"
                        }`}>
                          {!match.esLocal ? match.teamName : match.rivalNombre}
                        </span>
                      </div>
                      {!match.esLocal && match.teamCategory && (
                        <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 shrink-0">
                          {match.teamCategory}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lugar / Campo de juego */}
                  {match.lugar && !["local", "visitante"].includes(match.lugar.toLowerCase()) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 px-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium">{match.lugar}</span>
                    </div>
                  )}

                  {/* 3. SECCIÓN DESTACADA: Equipación a Preparar (Grande y Clara) */}
                  <div className={`p-3 rounded-xl border flex flex-col gap-1.5 transition-all ${
                    isSegunda
                      ? "bg-rose-50 border-rose-300 text-rose-950 shadow-2xs"
                      : "bg-blue-50/80 border-blue-200 text-blue-950 shadow-2xs"
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isSegunda
                          ? "bg-white border-rose-300 text-rose-600 shadow-2xs"
                          : "bg-white border-blue-300 text-blue-600 shadow-2xs"
                      }`}>
                        <Shirt className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black tracking-tight uppercase">
                            {isSegunda ? "2ª Equipación (Roja)" : "1ª Equipación (Azul)"}
                          </span>
                          {match.conflictoEquipacion && (
                            <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-200 text-rose-900 border border-rose-300 shrink-0">
                              Conflicto Color
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] opacity-80 font-medium mt-0.5">
                          {isSegunda
                            ? "Camiseta roja, pantalón y medias rojas oficiales."
                            : "Camiseta azul, pantalón y medias azules oficiales."}
                        </p>
                      </div>
                    </div>

                    {/* Advertencia de coincidencia si el rival viste de azul */}
                    {match.conflictoEquipacion && (
                      <div className="mt-1 pt-2 border-t border-rose-200/80 flex items-start gap-1.5 text-[11px] text-rose-900 font-bold leading-snug">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <span>
                          Rival viste de azul{match.rivalCamisetaColor ? ` (${match.rivalCamisetaColor})` : ""}: Obligatorio vestir de rojo para evitar sanción arbitral.
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. Pie de la ficha: Botón táctil grande y selector manual */}
                <div className="p-3 sm:p-3.5 bg-slate-50/80 border-t border-slate-100 space-y-2.5">
                  {/* Botón táctil grande de preparación (Full width, excelente en móviles) */}
                  <button
                    onClick={() => handleTogglePrepared(match.id, match.equipacionPreparada)}
                    disabled={isToggling}
                    className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-60 ${
                      match.equipacionPreparada
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20"
                        : "bg-white hover:bg-amber-50 text-slate-800 border-2 border-dashed border-amber-300 hover:border-amber-400"
                    }`}
                  >
                    {isToggling ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : match.equipacionPreparada ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
                        <span>✅ ROPA LISTA EN BOLSA (Preparada)</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        <span>⏳ ROPA PENDIENTE · Tocar para marcar lista</span>
                      </>
                    )}
                  </button>

                  {/* Selector rápido manual para excepciones */}
                  <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-slate-500 font-medium">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Asignar manual:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOverrideKit(match.id, "primera")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                          match.equipacionAsignada === "primera"
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                        title="Forzar 1ª Equipación (Azul)"
                      >
                        👕 1ª Azul
                      </button>
                      <button
                        onClick={() => handleOverrideKit(match.id, "segunda")}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                          match.equipacionAsignada === "segunda"
                            ? "bg-rose-600 text-white shadow-2xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                        }`}
                        title="Forzar 2ª Equipación (Roja)"
                      >
                        👕 2ª Roja
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
