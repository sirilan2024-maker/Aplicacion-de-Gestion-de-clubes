"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DailyWellnessForm, PlayerOption } from "@/components/features/performance/DailyWellnessForm";
import { Loader2, Target } from "lucide-react";

export default function PlayerWellnessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = typeof params.eventId === 'string' ? params.eventId : '';

  const initialPlayerId = searchParams.get('p') || '';
  const token = searchParams.get('token') || '';
  const tokenExp = searchParams.get('exp') ? parseInt(searchParams.get('exp')!) : undefined;

  const [loading, setLoading] = useState(true);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [teamName, setTeamName] = useState("");
  const [selectedPlayerId, setSelectedPlayerId] = useState(initialPlayerId);
  const [isLockedPlayer, setIsLockedPlayer] = useState(Boolean(initialPlayerId));

  useEffect(() => {
    fetchData();
  }, [eventId]);

  const fetchData = async () => {
    if (!eventId) return;
    const supabase = createClient();

    // Fetch Event
    const { data: evData, error: evErr } = await supabase
      .from('team_events')
      .select('*, teams (name)')
      .eq('id', eventId)
      .single();

    if (evErr || !evData) {
      setLoading(false);
      return;
    }

    setEventDetails(evData);
    setTeamName(evData.teams?.name || "Equipo");

    // Fetch Players
    const { data: plData } = await supabase
      .from('players')
      .select('id, first_name, last_name')
      .eq('team_id', evData.team_id)
      .order('first_name');

    if (plData) {
      setPlayers(plData);
      if (initialPlayerId && plData.some((p: any) => p.id === initialPlayerId)) {
        setSelectedPlayerId(initialPlayerId);
        setIsLockedPlayer(true);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-500 font-medium text-sm">Cargando cuestionario de bienestar...</p>
      </div>
    );
  }

  if (!eventDetails) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-sm text-center max-w-md w-full border border-gray-100">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Sesión no encontrada</h2>
          <p className="text-gray-500 text-sm">
            El enlace de bienestar no es válido o el entrenamiento ha sido modificado.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 py-8">
      <DailyWellnessForm
        eventId={eventId}
        eventDetails={eventDetails}
        players={players}
        initialPlayerId={selectedPlayerId}
        isLockedPlayer={isLockedPlayer}
        token={token || undefined}
        tokenExp={tokenExp || undefined}
        teamName={teamName}
      />
    </div>
  );
}
