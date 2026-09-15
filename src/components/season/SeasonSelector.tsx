"use client";

import React from "react";
import { useSeason } from "@/components/providers/SeasonProvider";
import { Calendar, ChevronDown, Lock, Unlock } from "lucide-react";

export function SeasonSelector() {
  const { seasons, selectedSeason, setSelectedSeasonId, loading } = useSeason();

  if (loading || seasons.length === 0) {
    return null;
  }

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg px-3 py-1.5 transition-all text-xs font-medium text-slate-200 shadow-sm">
        <Calendar size={14} className="text-blue-400 shrink-0" />
        <select
          value={selectedSeason?.id || ""}
          onChange={(e) => setSelectedSeasonId(e.target.value)}
          className="bg-transparent text-slate-200 outline-none cursor-pointer pr-4 font-semibold text-xs appearance-none focus:ring-0"
        >
          {seasons.map((season) => (
            <option key={season.id} value={season.id} className="bg-slate-900 text-slate-200 font-normal">
              {season.is_active
                ? `🟢 ${season.name} (Activa)`
                : season.name.includes("🔓") || season.is_unlocked
                ? `🔓 ${season.name} (Reabierta)`
                : `🔒 ${season.name} (Archivada)`}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="text-slate-400 shrink-0 pointer-events-none -ml-4" />
      </div>
    </div>
  );
}
