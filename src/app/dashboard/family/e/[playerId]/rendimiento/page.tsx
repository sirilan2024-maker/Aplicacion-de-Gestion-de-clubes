"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Activity, Clock, Flame } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function FamilyPerformancePage() {
  const params = useParams();
  const playerId = typeof params.playerId === 'string' ? params.playerId : '';

  const [loading, setLoading] = useState(true);
  const [playerInfo, setPlayerInfo] = useState<any>(null);
  const [stats, setStats] = useState({ totalMinutes: 0, matchesPlayed: 0, avgRpe: 0, rpeCount: 0 });

  useEffect(() => {
    fetchPerformance();
  }, [playerId]);

  const fetchPerformance = async () => {
    setLoading(true);
    const supabase = createClient();
    try {
      const { data: pData, error: pError } = await supabase
        .from('players')
        .select('first_name, team_id')
        .eq('id', playerId)
        .single();
        
      if (pError) throw pError;
      setPlayerInfo(pData);

      // Fetch Minutes Played from Convocatorias
      const { data: convData, error: convError } = await supabase
        .from('convocatorias')
        .select('minutos_jugados')
        .eq('player_id', playerId)
        .gt('minutos_jugados', 0);

      if (convError) throw convError;

      let totalMinutes = 0;
      let matchesPlayed = convData?.length || 0;
      
      convData?.forEach(c => {
        totalMinutes += c.minutos_jugados;
      });

      // Fetch RPE from training metrics
      // First we need the ID of the RPE metric for this club
      const { data: clubData } = await supabase.from('players').select('club_id').eq('id', playerId).single();
      
      let avgRpe = 0;
      let rpeCount = 0;

      if (clubData?.club_id) {
        const { data: rpeMetric } = await supabase
          .from('club_metrics')
          .select('id')
          .eq('club_id', clubData.club_id)
          .ilike('name', '%RPE%')
          .limit(1)
          .maybeSingle();

        if (rpeMetric) {
          const { data: ptData } = await supabase
            .from('player_training_metrics')
            .select('value_number')
            .eq('player_id', playerId)
            .eq('metric_id', rpeMetric.id)
            .not('value_number', 'is', null);

          if (ptData && ptData.length > 0) {
            rpeCount = ptData.length;
            const sumRpe = ptData.reduce((acc, curr) => acc + (curr.value_number || 0), 0);
            avgRpe = sumRpe / rpeCount;
          }
        }
      }

      setStats({ totalMinutes, matchesPlayed, avgRpe: Math.round(avgRpe * 10) / 10, rpeCount });

    } catch (err: any) {
      toast.error("Error al cargar rendimiento: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Toaster position="top-right" />
      
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
          <Activity size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rendimiento Físico</h1>
          <p className="text-gray-500 text-sm">Estadísticas de {playerInfo?.first_name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl">
            <Clock size={32} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Minutos Jugados</p>
            <p className="text-3xl font-bold text-gray-900">{stats.totalMinutes} <span className="text-lg font-normal text-gray-500">min</span></p>
            <p className="text-sm text-gray-500 mt-1">En {stats.matchesPlayed} partidos</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-xl">
            <Flame size={32} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Esfuerzo Medio (RPE)</p>
            <p className="text-3xl font-bold text-gray-900">{stats.avgRpe || '-'}<span className="text-lg font-normal text-gray-500"> / 10</span></p>
            <p className="text-sm text-gray-500 mt-1">En {stats.rpeCount} entrenamientos</p>
          </div>
        </div>
      </div>

    </div>
  );
}
