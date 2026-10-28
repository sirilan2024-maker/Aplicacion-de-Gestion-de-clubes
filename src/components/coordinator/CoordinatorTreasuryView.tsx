"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Wallet, RefreshCw, Compass, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { getCoordinatorPlayerFeesStatusAction } from "@/app/actions/coordinator-actions";
import { CoordinatorFeesSection } from "@/components/coordinator/CoordinatorFeesSection";
import { CoordinatorPaymentsData } from "@/types/coordinator";

export default function CoordinatorTreasuryView() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    seasonName: string;
    teams: Array<{ id: string; name: string; category: string; color: string | null }>;
    summary: CoordinatorPaymentsData["summary"];
    players: CoordinatorPaymentsData["players"];
  } | null>(null);

  const [selectedTeamId, setSelectedTeamId] = useState<string>("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCoordinatorPlayerFeesStatusAction();
      if (res && res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error("[CoordinatorTreasuryView] Error cargando cuotas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedTeam = data?.teams?.find((t) => t.id === selectedTeamId);

  return (
    <div className="p-3 sm:p-5 md:p-6 max-w-7xl mx-auto space-y-4 md:space-y-6 animate-in fade-in duration-300">
      {/* Cabecera Principal de Coordinación */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white shadow-xs shrink-0">
            <Wallet className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-black text-slate-900 tracking-tight">
                Tesorería y Finanzas
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                Coordinación
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                Solo Lectura
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium mt-0.5 truncate">
              Supervisión de regularidad y cuotas · {data?.seasonName || "Temporada 26/27"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
          <button
            onClick={() => router.push("/admin/coordinador")}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer border border-slate-200/80 flex-1 sm:flex-initial"
          >
            <Compass className="w-3.5 h-3.5 text-slate-600" />
            <span>Panel Coordinador</span>
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs flex-1 sm:flex-initial"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
        </div>
      </div>

      {/* Componente Central de Cuotas y Pagos */}
      {loading && !data ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
          <p className="font-bold text-slate-700">Cargando datos de cuotas y jugadores...</p>
        </div>
      ) : (
        <CoordinatorFeesSection
          data={data ? { summary: data.summary, players: data.players } : undefined}
          selectedTeamId={selectedTeamId}
          selectedTeamName={selectedTeam?.name}
          teams={data?.teams}
          onSelectTeamId={setSelectedTeamId}
        />
      )}
    </div>
  );
}
