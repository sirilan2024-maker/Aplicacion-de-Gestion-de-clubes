'use client';

import React, { useEffect, useState } from 'react';
import { 
  Activity, Clock, Goal, Target, Users, Trophy, Shield, 
  TrendingUp, Sparkles, AlertCircle, RefreshCw 
} from 'lucide-react';
import { getTeamTacticalAnalyticsAction } from '@/app/actions/tactical-actions';
import { TacticalAnalyticsResult } from '@/lib/performance/tactical-analytics-service';

interface TacticalAnalyticsCardProps {
  teamId: string;
}

export function TacticalAnalyticsCard({ teamId }: TacticalAnalyticsCardProps) {
  const [data, setData] = useState<TacticalAnalyticsResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId || teamId === 'todos') {
      setData(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      const res = await getTeamTacticalAnalyticsAction(teamId);
      if (!isMounted) return;

      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'No se pudieron cargar las estadísticas tácticas.');
      }
      setLoading(false);
    };

    fetchAnalytics();
    return () => {
      isMounted = false;
    };
  }, [teamId]);

  if (!teamId || teamId === 'todos') {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex items-center justify-center gap-3 text-slate-500 min-h-[160px]">
        <RefreshCw className="w-5 h-5 text-indigo-600 animate-spin" />
        <span className="text-xs font-bold">Cargando análisis táctico de competición...</span>
      </div>
    );
  }

  if (error || !data) {
    return null;
  }

  const maxIntervalGoals = Math.max(
    1,
    ...data.timeIntervals.map(i => Math.max(i.scored, i.conceded))
  );

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-6 p-5 sm:p-6 animate-in fade-in duration-300">
      {/* 1. Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-indigo-600 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-slate-900 text-base sm:text-lg">
                Rendimiento Táctico de Partidos
              </h3>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                data.isBrave
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}>
                {data.isBrave ? "Liga Brave" : "Oficial FFCV"}
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              Patrones de gol por minuto, tipología de finalización y dinámicas de equipo
            </p>
          </div>
        </div>

        {/* Resumen rápido de goles */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span>Goles a favor: <b>{data.totalScored}</b></span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
            <span>Encajados: <b>{data.totalConceded}</b></span>
          </div>
        </div>
      </div>

      {/* 2. Grid de Distribución Temporal y Tipos de Gol */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Columna Izquierda (7 cols): Cronología y Tramos de Gol */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
              <Clock className="w-4 h-4 text-indigo-500" />
              Goles por Franja de Tiempo (15 min)
            </span>
            <div className="flex items-center gap-3 text-[11px] font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" /> Marcados
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shrink-0" /> Encajados
              </span>
            </div>
          </div>

          <div className="space-y-2.5 bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/70">
            {data.timeIntervals.map((interval) => {
              const scoredWidth = Math.round((interval.scored / maxIntervalGoals) * 100);
              const concededWidth = Math.round((interval.conceded / maxIntervalGoals) * 100);

              return (
                <div key={interval.interval} className="space-y-1">
                  <div className="flex justify-between items-baseline text-[11px] font-bold">
                    <span className="text-slate-600 w-14 shrink-0">{interval.interval}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-700 font-extrabold">{interval.scored} favor</span>
                      <span className="text-slate-300">/</span>
                      <span className="text-rose-600 font-extrabold">{interval.conceded} contra</span>
                    </div>
                  </div>

                  {/* Doble barra comparativa */}
                  <div className="grid grid-cols-2 gap-1.5 h-3">
                    {/* Barra a favor (crece de izq a dcha) */}
                    <div className="bg-slate-200/60 rounded-full overflow-hidden flex justify-end">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(scoredWidth > 0 ? 8 : 0, scoredWidth)}%` }}
                        title={`${interval.scored} goles marcados`}
                      />
                    </div>

                    {/* Barra en contra (crece de izq a dcha) */}
                    <div className="bg-slate-200/60 rounded-full overflow-hidden flex justify-start">
                      <div
                        className="h-full bg-rose-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(concededWidth > 0 ? 8 : 0, concededWidth)}%` }}
                        title={`${interval.conceded} goles encajados`}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Columna Derecha (5 cols): Tipología de Finalización y Duplas */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          {/* Tipología de Gol */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
              <Target className="w-4 h-4 text-emerald-600" />
              Tipología de Remates a Favor
            </span>

            {data.goalTypes.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {data.goalTypes.map(gt => (
                  <div key={gt.type} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] font-bold text-slate-500 block truncate">{gt.type}</span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className="text-base font-black text-slate-900">{gt.count}</span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                        {gt.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-400 font-medium">
                Sin tipologías de gol registradas aún.
              </div>
            )}
          </div>

          {/* Duplas Clave */}
          {data.topDuplas && data.topDuplas.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                <Users className="w-4 h-4 text-indigo-600" />
                Química de Duplas (Asistencia ➔ Gol)
              </span>
              <div className="space-y-1.5">
                {data.topDuplas.slice(0, 3).map((dp, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-indigo-50/60 rounded-lg border border-indigo-200/60 text-xs">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="font-bold text-slate-700 truncate">{dp.assistant}</span>
                      <span className="text-indigo-400 font-black">➔</span>
                      <span className="font-black text-indigo-950 truncate">{dp.scorer}</span>
                    </div>
                    <span className="font-black text-indigo-700 bg-white px-2 py-0.5 rounded shadow-2xs border border-indigo-200 shrink-0">
                      {dp.count} {dp.count === 1 ? 'gol' : 'goles'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
