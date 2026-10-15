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
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* ── 1. BARRA DE MÉTRICAS Y RESUMEN DE LA JORNADA ── */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-700 shrink-0">
              <Calendar className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Partidos Jornada</span>
              <span className="text-xl font-black text-slate-900">{summary.totalMatches}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">1ª Azul Oficial</span>
              <span className="text-xl font-black text-blue-700">{summary.primeraCount}</span>
            </div>
          </div>

          <div
            className={`p-4 rounded-2xl border shadow-2xs flex items-center gap-3 ${
              summary.segundaCount > 0
                ? "bg-rose-50/70 border-rose-200 text-rose-950"
                : "bg-white border-slate-200"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                summary.segundaCount > 0
                  ? "bg-white border-rose-300 text-rose-600"
                  : "bg-slate-50 border-slate-200 text-slate-400"
              }`}
            >
              <Shirt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">2ª Roja (Conflicto)</span>
                {summary.conflictCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                )}
              </div>
              <span className="text-xl font-black text-rose-700">{summary.segundaCount}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                summary.pendingCount === 0
                  ? "bg-emerald-50 border-emerald-200 text-emerald-600"
                  : "bg-amber-50 border-amber-200 text-amber-600"
              }`}
            >
              {summary.pendingCount === 0 ? <CheckCheck className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado Preparación</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-emerald-700">{summary.preparedCount}</span>
                <span className="text-xs font-semibold text-slate-400">/ {summary.totalMatches} listas</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. ALERTA DESTACADA DE CONFLICTOS DE COLOR (SI EXISTEN) ── */}
      {summary && summary.segundaCount > 0 && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white border border-amber-200 text-amber-600 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900">
                Atención Utillería: {summary.segundaCount} partido{summary.segundaCount > 1 ? "s" : ""} requiere{summary.segundaCount > 1 ? "n" : ""} 2ª Equipación Roja
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                Los rivales visten con camiseta azul en sus actas oficiales FFCV. El equipo visitante debe vestir obligatoriamente de rojo para evitar sanción arbitral.
              </p>
            </div>
          </div>

          <button
            onClick={handleSendWeeklyAlert}
            disabled={sendingAlert}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <Bell className={`w-3.5 h-3.5 ${sendingAlert ? "animate-spin" : ""}`} />
            {sendingAlert ? "Enviando aviso..." : "Enviar aviso a Utilleros"}
          </button>
        </div>
      )}

      {/* ── 3. CONTROLES Y FILTROS ── */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "all" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Todos ({matches.length})
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "pending" ? "bg-white text-amber-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ⏳ Pendientes ({summary?.pendingCount || 0})
          </button>
          <button
            onClick={() => setFilter("conflicts")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "conflicts" ? "bg-white text-rose-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            👕 2ª Roja ({summary?.segundaCount || 0})
          </button>
          <button
            onClick={() => setFilter("prepared")}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === "prepared" ? "bg-white text-emerald-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            ✅ Listas ({summary?.preparedCount || 0})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadSchedule}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer ml-auto"
            title="Refrescar y comprobar colores FFCV"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar FFCV</span>
          </button>
        </div>
      </div>

      {/* ── 4. LISTADO DE PARTIDOS PARA PREPARACIÓN DE EQUIPACIONES ── */}
      {filteredMatches.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
          <Shirt className="w-8 h-8 mx-auto text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No hay partidos que coincidan con el filtro</p>
          <p className="text-xs text-slate-400">Todos los partidos seleccionados están al día en preparación.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filteredMatches.map((match) => {
            const { dateStr, timeStr, dayName } = formatMadridMatchDate(match.fechaHora);
            const isSegunda = match.equipacionAsignada === "segunda";
            const isToggling = togglingId === match.id;

            return (
              <div
                key={match.id}
                className={`p-4 rounded-2xl border transition-all shadow-2xs flex flex-col justify-between gap-3.5 ${
                  match.equipacionPreparada
                    ? "bg-emerald-50/30 border-emerald-200/80"
                    : isSegunda
                    ? "bg-rose-50/40 border-rose-200 hover:border-rose-300"
                    : "bg-white border-slate-200 hover:border-indigo-300"
                }`}
              >
                {/* Cabecera de la tarjeta: Equipo, Categoría y Fecha */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: match.teamColor || "#4F46E5" }}
                      />
                      <h3 className="font-black text-sm text-slate-900 truncate">{match.teamName}</h3>
                      {match.teamCategory && (
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 shrink-0">
                          {match.teamCategory}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
                      <span className="font-bold text-slate-700">
                        {match.esLocal ? "Local vs" : "Visitante @"} {match.rivalNombre}
                      </span>
                    </div>
                  </div>

                  {/* Fecha y Hora en España */}
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-black uppercase text-slate-700 block">
                      {dayName} {dateStr}
                    </span>
                    <span className="text-xs font-bold text-indigo-600 block">{timeStr}</span>
                  </div>
                </div>

                {/* Badge Visual de Equipación */}
                <div className="space-y-1.5">
                  <MatchKitBadge
                    equipacionAsignada={match.equipacionAsignada}
                    equipacionPreparada={match.equipacionPreparada}
                    conflictoEquipacion={match.conflictoEquipacion}
                    rivalCamisetaColor={match.rivalCamisetaColor}
                    esLocal={match.esLocal}
                    size="sm"
                    showPreparedStatus={false}
                    showConflictDetails={true}
                  />

                  {/* Información adicional del rival si viste de azul */}
                  {match.rivalCamisetaColor && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                      <Info className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        Equipación rival registrada: <strong className="text-slate-800">{match.rivalCamisetaColor}</strong>
                      </span>
                    </div>
                  )}

                  {match.lugar && !["local", "visitante"].includes(match.lugar.toLowerCase()) && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">{match.lugar}</span>
                    </div>
                  )}
                </div>

                {/* Footer de Acciones: Selector manual de equipación y Botón checklist */}
                <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  {/* Selector rápido para utillero */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOverrideKit(match.id, "primera")}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                        match.equipacionAsignada === "primera"
                          ? "bg-blue-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      title="Forzar 1ª Equipación (Azul)"
                    >
                      1ª Azul
                    </button>
                    <button
                      onClick={() => handleOverrideKit(match.id, "segunda")}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${
                        match.equipacionAsignada === "segunda"
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      title="Forzar 2ª Equipación (Roja)"
                    >
                      2ª Roja
                    </button>
                  </div>

                  {/* Botón de Checklist interactivo */}
                  <button
                    onClick={() => handleTogglePrepared(match.id, match.equipacionPreparada)}
                    disabled={isToggling}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs ${
                      match.equipacionPreparada
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                        : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-300"
                    }`}
                  >
                    {isToggling ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : match.equipacionPreparada ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        <span>Ropa lista en bolsa ✅</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        <span>Marcar como preparada ⏳</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
