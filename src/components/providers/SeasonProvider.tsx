"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  is_unlocked?: boolean;
}

interface SeasonContextType {
  seasons: Season[];
  activeSeason: Season | null;
  selectedSeason: Season | null;
  selectedSeasonId: string | null;
  setSelectedSeasonId: (seasonId: string) => void;
  isViewingHistorical: boolean;
  isReadOnly: boolean;
  loading: boolean;
  refetchSeasons: () => Promise<void>;
}

const SeasonContext = createContext<SeasonContextType>({
  seasons: [],
  activeSeason: null,
  selectedSeason: null,
  selectedSeasonId: null,
  setSelectedSeasonId: () => {},
  isViewingHistorical: false,
  isReadOnly: false,
  loading: true,
  refetchSeasons: async () => {},
});

const STORAGE_KEY = "sporting_selected_season_id";

export function SeasonProvider({ children }: { children: React.ReactNode }) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [selectedSeasonId, setSelectedSeasonIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSeasons = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase.from("profiles").select("club_id").eq("id", user.id).single();
      if (!profile?.club_id) {
        setLoading(false);
        return;
      }

      const { data: seasonsData } = await supabase
        .from("seasons")
        .select("*")
        .eq("club_id", profile.club_id)
        .order("start_date", { ascending: false });

      if (seasonsData && seasonsData.length > 0) {
        setSeasons(seasonsData);
        const active = seasonsData.find((s) => s.is_active) || seasonsData[0];
        setActiveSeason(active);

        const storedId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        const matchingStored = storedId ? seasonsData.find((s) => s.id === storedId) : null;

        if (matchingStored) {
          setSelectedSeasonIdState(matchingStored.id);
        } else if (active) {
          setSelectedSeasonIdState(active.id);
        }
      }
    } catch (err) {
      console.error("Error cargando temporadas en Context:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSeasons();
  }, []);

  const setSelectedSeasonId = (id: string) => {
    setSelectedSeasonIdState(id);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, id);
    }
  };

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId) || activeSeason;
  const isViewingHistorical = selectedSeason ? !selectedSeason.is_active : false;
  const isMasterUnlocked = Boolean(selectedSeason?.is_unlocked || selectedSeason?.name?.includes("🔓"));
  const isReadOnly = isViewingHistorical && !isMasterUnlocked;

  return (
    <SeasonContext.Provider
      value={{
        seasons,
        activeSeason,
        selectedSeason,
        selectedSeasonId: selectedSeason?.id || null,
        setSelectedSeasonId,
        isViewingHistorical,
        isReadOnly,
        loading,
        refetchSeasons: fetchSeasons,
      }}
    >
      {children}
    </SeasonContext.Provider>
  );
}

export function useSeason() {
  return useContext(SeasonContext);
}
