"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Building2, ChevronRight, Loader2, Trophy, Target, Activity, 
  AlertTriangle, ShieldAlert, CheckCircle2, TrendingUp, TrendingDown,
  ArrowUpDown, Filter, Printer, ExternalLink, Users, Calendar, BarChart3,
  Layers, Info, Sparkles, Check, Send, Bot, FileText, Lightbulb, AlertCircle,
  Eye, CheckCircle, Sliders, Play, ArrowRight, ShieldCheck, UserCheck,
  Scale, Compass, GitMerge, FileQuestion, HelpCircle, Briefcase, Network, RefreshCw, Zap, BookmarkCheck, CheckSquare, LayoutDashboard, History, Clock
} from "lucide-react";
import Link from "next/link";
import { MethodologyNavHeader } from "@/components/methodology/MethodologyNavHeader";
import {
  reconstructCycleState,
  ReconstructedCycleStateResult
} from "@/lib/methodology/methodologyObservabilityEngine";

export default function MethodologyAuditHistoryPage() {
  const supabase = createClient();

  const [isLoading, setIsLoading] = useState(true);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [reconstructed, setReconstructed] = useState<ReconstructedCycleStateResult | null>(null);

  // Lista determinista de eventos simulados en memoria
  const [events, setEvents] = useState<any[]>([
    {
      event_id: "evt-1",
      event_type: "CICLO_CREADO",
      actor: { id: "Director Metodológico", role: "ADMIN" },
      entity: { id: "ciclo-2026-27", type: "MACROCICLO" },
      club_id: "club-sporting-saladar",
      timestamp: "2026-08-01T09:00:00.000Z",
      details: { name: "Macrociclo 2026-27" }
    },
    {
      event_id: "evt-2",
      event_type: "PLANIFICACION_REGISTRADA",
      actor: { id: "Coordinador F11", role: "COORDINADOR" },
      entity: { id: "ciclo-2026-27", type: "MACROCICLO" },
      club_id: "club-sporting-saladar",
      timestamp: "2026-08-05T10:00:00.000Z",
      details: { sessionsCount: 40 }
    },
    {
      event_id: "evt-3",
      event_type: "DECISION_APROBADA",
      actor: { id: "Director Metodológico", role: "ADMIN" },
      entity: { id: "prop-1", type: "PROPUESTA" },
      club_id: "club-sporting-saladar",
      timestamp: "2026-08-10T11:30:00.000Z",
      details: { decisionId: "dec-1", note: "Modulación de carga" }
    }
  ]);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedSeasonId) {
      loadAuditData(selectedSeasonId);
    }
  }, [selectedSeasonId]);

  const loadInitialData = async () => {
    try {
      const { data: seasonList } = await supabase
        .from("seasons")
        .select("*")
        .order("start_date", { ascending: false });

      if (seasonList && seasonList.length > 0) {
        setSeasons(seasonList);
        const active = seasonList.find(s => s.is_active) || seasonList[0];
        setSelectedSeasonId(active.id);
      } else {
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Error cargando temporadas en auditoría:", err);
      setIsLoading(false);
    }
  };

  const loadAuditData = (seasonId: string) => {
    setIsLoading(true);
    try {
      const res = reconstructCycleState({
        events,
        cycleId: "ciclo-2026-27",
        clubId: "club-sporting-saladar"
      });
      setReconstructed(res);
    } catch (err) {
      console.error("Error reconstruyendo ciclo:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <p className="text-sm font-bold text-slate-500">Cargando Centro de Auditoría Histórica y Reconstrucción...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black uppercase px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-800">
              Observabilidad Metodológica & Auditoría Forense
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            <History className="w-7 h-7 text-purple-600 shrink-0" />
            Centro de Auditoría Histórica y Reconstrucción
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Eventos inmutables → Trazabilidad bidireccional → Reconstrucción histórica de ciclos sin información futura.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <MethodologyNavHeader />

          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
          >
            {seasons.map(s => (
              <option key={s.id} value={s.id}>{s.name} {s.is_active ? "(Activa)" : ""}</option>
            ))}
          </select>
          <Link
            href="/admin/metodologia/centro-control"
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            Centro de Control 360º
          </Link>
        </div>
      </div>

      {/* Tarjetas de Reconstrucción de Estado */}
      {reconstructed && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Estado del Ciclo</span>
            <div className="text-2xl font-black text-purple-900">{reconstructed.state_at_target}</div>
            <span className="text-[11px] text-purple-600 font-bold">{reconstructed.events_replayed} eventos reensamblados</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Sesiones Planificadas</span>
            <div className="text-2xl font-black text-slate-900">{reconstructed.metrics.plannedSessions}</div>
            <span className="text-[11px] text-slate-500 font-bold">En el punto temporal</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Decisiones Registradas</span>
            <div className="text-2xl font-black text-emerald-600">{reconstructed.metrics.decisionsCount}</div>
            <span className="text-[11px] text-emerald-600 font-bold">Auditoría humana trazable</span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Integridad Histórica</span>
            <div className="text-2xl font-black text-blue-900">INMUTABLE</div>
            <span className="text-[11px] text-blue-600 font-bold">0 sobrescrituras</span>
          </div>
        </div>
      )}

      {/* Línea Temporal de Eventos Metodológicos Inmutables */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-purple-600" />
            Línea Temporal de Eventos Metodológicos
          </h3>
          <span className="text-xs font-bold text-slate-400">
            {events.length} eventos inmutables
          </span>
        </div>

        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.event_id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900">{e.event_type}</span>
                <span className="text-[10px] text-slate-400 font-bold">{new Date(e.timestamp).toLocaleString("es-ES")}</span>
              </div>
              <p className="text-xs text-slate-600">Actor: <strong>{e.actor.id}</strong> ({e.actor.role}) • Entidad: <strong>{e.entity.id}</strong></p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
