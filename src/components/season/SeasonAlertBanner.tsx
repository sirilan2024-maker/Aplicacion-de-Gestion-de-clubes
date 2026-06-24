"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, X, ArrowRight, Calendar } from "lucide-react";

interface ActiveSeason {
  id: string;
  name: string;
  end_date: string;
  daysLeft: number;
}

export default function SeasonAlertBanner() {
  const router = useRouter();
  const [season, setSeason] = useState<ActiveSeason | null>(null);
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

    const { data: activeSeason } = await supabase
      .from("seasons")
      .select("id, name, end_date")
      .eq("club_id", profile.club_id)
      .eq("is_active", true)
      .single();

    if (!activeSeason) return;

    const endDate = new Date(activeSeason.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffMs = endDate.getTime() - today.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    // Only show if ≤30 days remaining
    if (daysLeft <= 30) {
      setSeason({ ...activeSeason, daysLeft });
    }
  }

  function handleDismiss() {
    // Dismiss for 3 days
    const until = new Date();
    until.setDate(until.getDate() + 3);
    localStorage.setItem("season_banner_dismissed", until.toISOString());
    setDismissed(true);
  }

  if (!isAdmin || !season || dismissed) return null;

  const isUrgent = season.daysLeft <= 7;
  const isExpired = season.daysLeft <= 0;

  return (
    <div
      className={`w-full rounded-xl border px-5 py-4 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500 ${
        isExpired
          ? "bg-red-50 border-red-200"
          : isUrgent
          ? "bg-orange-50 border-orange-200"
          : "bg-amber-50 border-amber-200"
      }`}
    >
      {/* Icon */}
      <div
        className={`flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full ${
          isExpired
            ? "bg-red-100 text-red-600"
            : isUrgent
            ? "bg-orange-100 text-orange-600"
            : "bg-amber-100 text-amber-600"
        }`}
      >
        {isExpired ? (
          <AlertTriangle size={20} />
        ) : (
          <Calendar size={20} />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold ${
            isExpired ? "text-red-800" : isUrgent ? "text-orange-800" : "text-amber-800"
          }`}
        >
          {isExpired
            ? `⏰ La temporada "${season.name}" ha finalizado`
            : `⏰ La temporada "${season.name}" termina en ${season.daysLeft} día${season.daysLeft !== 1 ? "s" : ""}`}
        </p>
        <p
          className={`text-xs mt-0.5 ${
            isExpired ? "text-red-600" : isUrgent ? "text-orange-600" : "text-amber-600"
          }`}
        >
          {isExpired
            ? "Ve a Temporadas para cerrarla y comenzar la nueva."
            : "Recuerda cerrar la temporada antes de que finalice para archivar los datos correctamente."}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push("/admin/temporadas")}
        className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
          isExpired
            ? "bg-red-600 text-white hover:bg-red-700"
            : isUrgent
            ? "bg-orange-600 text-white hover:bg-orange-700"
            : "bg-amber-600 text-white hover:bg-amber-700"
        }`}
      >
        Gestionar temporada
        <ArrowRight size={13} />
      </button>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        title="Ocultar 3 días"
      >
        <X size={16} />
      </button>
    </div>
  );
}
