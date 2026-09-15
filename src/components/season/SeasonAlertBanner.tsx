"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, X, ArrowRight, Calendar, Lock } from "lucide-react";
import { useSeason } from "@/components/providers/SeasonProvider";

interface ActiveSeason {
  id: string;
  name: string;
  end_date: string;
  daysLeft: number;
}

export default function SeasonAlertBanner() {
  const router = useRouter();
  const { selectedSeason, activeSeason, isViewingHistorical, setSelectedSeasonId } = useSeason();
  const [seasonAlert, setSeasonAlert] = useState<ActiveSeason | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const dismissedKey = "season_banner_dismissed";
    const dismissedUntil = localStorage.getItem(dismissedKey);
    if (dismissedUntil && new Date(dismissedUntil) > new Date()) {
      setDismissed(true);
      return;
    }
    fetchSeasonAlert();
  }, []);

  async function fetchSeasonAlert() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("club_id, role")
      .eq("id", user.id)
      .single();

    if (!profile?.club_id) return;
    if (profile.role !== "admin") return;
    setIsAdmin(true);

    const { data: currentActive } = await supabase
      .from("seasons")
      .select("id, name, end_date")
      .eq("club_id", profile.club_id)
      .eq("is_active", true)
      .single();

    if (!currentActive) return;

    const endDate = new Date(currentActive.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = endDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysLeft <= 30) {
      setSeasonAlert({ ...currentActive, daysLeft });
    }
  }

  function handleDismiss() {
    const until = new Date();
    until.setDate(until.getDate() + 3);
    localStorage.setItem("season_banner_dismissed", until.toISOString());
    setDismissed(true);
  }

  // 1. Historical Safe Box Banner (takes priority if viewing historical season)
  if (isViewingHistorical && selectedSeason) {
    return (
      <div className="w-full rounded-xl border border-blue-200 bg-blue-900/90 text-blue-50 px-4 py-3.5 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-800 text-blue-200 shrink-0">
            <Lock size={18} />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
              <span>🔒 MODO CAJA FUERTE HISTÓRICA</span>
              <span className="bg-blue-800 text-blue-200 text-[10px] px-2 py-0.5 rounded-full font-mono">{selectedSeason.name}</span>
            </p>
            <p className="text-xs text-blue-200 mt-0.5">
              Estás consultando datos archivados de una temporada pasada en modo solo lectura.
            </p>
          </div>
        </div>
        {activeSeason && (
          <button
            onClick={() => setSelectedSeasonId(activeSeason.id)}
            className="shrink-0 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 text-xs font-semibold transition-colors"
          >
            Volver a Temporada Activa ({activeSeason.name})
            <ArrowRight size={14} />
          </button>
        )}
      </div>
    );
  }

  // 2. Expiry warning for active season
  if (!isAdmin || !seasonAlert || dismissed) return null;

  const isUrgent = seasonAlert.daysLeft <= 7;
  const isExpired = seasonAlert.daysLeft <= 0;

  return (
    <div
      className={`w-full rounded-xl border px-4 py-4 sm:px-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shadow-sm relative animate-in fade-in slide-in-from-top-2 duration-500 ${
        isExpired
          ? "bg-red-50 border-red-200"
          : isUrgent
          ? "bg-orange-50 border-orange-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0 pr-6 sm:pr-0">
        <div
          className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full ${
            isExpired
              ? "bg-red-100 text-red-600"
              : isUrgent
              ? "bg-orange-100 text-orange-600"
              : "bg-amber-100 text-amber-600"
          }`}
        >
          {isExpired ? <AlertTriangle size={20} /> : <Calendar size={20} />}
        </div>

        <div className="flex-1 min-w-0 pt-0.5">
          <p
            className={`text-sm font-semibold leading-tight ${
              isExpired ? "text-red-800" : isUrgent ? "text-orange-800" : "text-amber-800"
            }`}
          >
            {isExpired
              ? `⏰ La temporada "${seasonAlert.name}" ha finalizado`
              : `⏰ La temporada "${seasonAlert.name}" termina en ${seasonAlert.daysLeft} día${seasonAlert.daysLeft !== 1 ? "s" : ""}`}
          </p>
          <p
            className={`text-xs mt-1 leading-snug ${
              isExpired ? "text-red-600" : isUrgent ? "text-orange-600" : "text-amber-600"
            }`}
          >
            {isExpired
              ? "Ve a Temporadas para cerrarla y comenzar la nueva."
              : "Recuerda cerrar la temporada antes de que finalice para archivar los datos correctamente."}
          </p>
        </div>
      </div>

      <button
        onClick={() => router.push("/admin/temporadas")}
        className={`flex-shrink-0 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 sm:px-3 sm:py-1.5 text-sm sm:text-xs font-semibold transition-colors mt-2 sm:mt-0 w-full sm:w-auto ${
          isExpired
            ? "bg-red-600 text-white hover:bg-red-700"
            : isUrgent
            ? "bg-orange-600 text-white hover:bg-orange-700"
            : "bg-amber-600 text-white hover:bg-amber-700"
        }`}
      >
        Gestionar temporada
        <ArrowRight size={14} className="sm:w-3 sm:h-3" />
      </button>

      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 sm:static sm:top-auto sm:right-auto flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        title="Ocultar 3 días"
      >
        <X size={18} className="sm:w-4 sm:h-4" />
      </button>
    </div>
  );
}
