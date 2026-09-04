"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trophy, ShieldCheck, AlertCircle, RefreshCw, Calendar, ChevronDown, ChevronUp, Home, Plane, Award } from "lucide-react";
import { FFCVStandingRecord } from "@/lib/ffcv/types";

interface FFCVStandingsProps {
  ffcvGroupId?: string | null;
  ffcvTeamId?: string | null;
  ffcvUrl?: string | null;
  teamName: string;
}

export function FFCVStandings({
  ffcvGroupId,
  ffcvTeamId,
  teamName,
}: FFCVStandingsProps) {
  const [standings, setStandings] = useState<FFCVStandingRecord[]>([]);
  const [loading, setLoading] = useState(!!ffcvGroupId);
  const [error, setError] = useState<string | null>(null);
  const [selectedJornada, setSelectedJornada] = useState<number>(1);
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Fetch standings from Supabase
  useEffect(() => {
    if (!ffcvGroupId) {
      setStandings([]);
      setLoading(false);
      return;
    }

    async function loadStandings() {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error: sbError } = await supabase
          .from("ffcv_standings")
          .select("*")
          .eq("ffcv_group_id", ffcvGroupId)
          .order("matchday", { ascending: true })
          .order("position", { ascending: true });

        if (sbError) {
          throw new Error(sbError.message);
        }

        if (data) {
          setStandings(data as FFCVStandingRecord[]);
          // Default to first/latest matchday available
          const jSet = Array.from(new Set(data.map((s: any) => s.matchday))).sort((a: any, b: any) => a - b);
          if (jSet.length > 0) {
            setSelectedJornada(jSet[0] as number);
          }
        }
      } catch (err: any) {
        console.error("Error loading FFCV standings from Supabase:", err);
        setError(err.message || "Error al cargar la clasificación oficial.");
      } finally {
        setLoading(false);
      }
    }

    loadStandings();
  }, [ffcvGroupId]);

  // Available matchdays in database
  const availableJornadas = useMemo(() => {
    const jSet = new Set<number>();
    standings.forEach((s) => jSet.add(s.matchday));
    if (jSet.size === 0) return [1];
    return Array.from(jSet).sort((a, b) => a - b);
  }, [standings]);

  // Filtered standings for the selected matchday
  const currentStandings = useMemo(() => {
    return standings
      .filter((s) => s.matchday === selectedJornada)
      .sort((a, b) => a.position - b.position);
  }, [standings, selectedJornada]);

  // Pre-expand our team on mobile
  useEffect(() => {
    if (currentStandings.length > 0) {
      const ourRow = currentStandings.find((row) =>
        ffcvTeamId
          ? row.team_ffcv_id === ffcvTeamId
          : (row.team_name.toLowerCase().includes("sporting") && row.team_name.toLowerCase().includes("saladar")) ||
            row.team_name.toLowerCase().includes(teamName.toLowerCase())
      );
      if (ourRow) {
        const key = ourRow.team_ffcv_id || String(ourRow.position);
        setExpandedTeams(new Set([key]));
      }
    }
  }, [currentStandings, ffcvTeamId, teamName]);

  const toggleTeamExpansion = (key: string) => {
    setExpandedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  if (!ffcvGroupId) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Trophy className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">Sin Clasificación FFCV Vinculada</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Este equipo no tiene asignado un grupo de la FFCV. Cuando se configure en la base de datos, aparecerá aquí la tabla de clasificación oficial.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header con controles */}
      <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap gap-3 justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-amber-50 rounded-xl border border-amber-200/60">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
              Oficial FFCV
            </span>
            <h3 className="font-extrabold text-slate-900 text-base mt-0.5">
              Clasificación Oficial del Grupo
            </h3>
          </div>
        </div>

        {/* Selector de Jornadas */}
        {availableJornadas.length > 1 && (
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-medium text-slate-600">Jornada:</span>
            <select
              value={selectedJornada}
              onChange={(e) => setSelectedJornada(Number(e.target.value))}
              className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
            >
              {availableJornadas.map((j) => (
                <option key={j} value={j}>
                  Jornada {j}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white gap-3">
          <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-slate-500 text-xs font-medium">Cargando clasificación oficial desde Supabase...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 p-8 text-center border-b border-red-200 space-y-2">
          <AlertCircle className="mx-auto text-red-400" size={32} />
          <h3 className="text-sm font-bold text-red-800">Error al cargar la clasificación</h3>
          <p className="text-red-600 text-xs">{error}</p>
        </div>
      ) : currentStandings.length === 0 ? (
        <div className="bg-slate-50 p-12 text-center border-b border-gray-200">
          <h3 className="text-sm font-bold text-slate-700">No hay datos de clasificación para esta jornada</h3>
        </div>
      ) : (
        <>
          {/* ========================================================= */}
          {/* VISTA DESKTOP / TABLET GRANDE (Tabla tradicional completa) */}
          {/* ========================================================= */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 bg-slate-50 border-b border-slate-200 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-4 py-3 text-center w-12">Pos</th>
                  <th className="px-4 py-3">Equipo</th>
                  <th className="px-4 py-3 text-center w-16 text-blue-700 bg-blue-50/50">Pts</th>
                  <th className="px-4 py-3 text-center w-12" title="Partidos Jugados">PJ</th>
                  <th className="px-4 py-3 text-center w-12 hidden md:table-cell text-emerald-700" title="Ganados">PG</th>
                  <th className="px-4 py-3 text-center w-12 hidden md:table-cell text-amber-700" title="Empatados">PE</th>
                  <th className="px-4 py-3 text-center w-12 hidden md:table-cell text-rose-700" title="Perdidos">PP</th>
                  <th className="px-4 py-3 text-center w-12 hidden lg:table-cell" title="Goles a Favor">GF</th>
                  <th className="px-4 py-3 text-center w-12 hidden lg:table-cell" title="Goles en Contra">GC</th>
                  <th className="px-4 py-3 text-center w-12 hidden lg:table-cell" title="Diferencia de Goles">DG</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {currentStandings.map((row, idx) => {
                  const isOurTeam = ffcvTeamId
                    ? row.team_ffcv_id === ffcvTeamId
                    : (row.team_name.toLowerCase().includes("sporting") && row.team_name.toLowerCase().includes("saladar")) ||
                      row.team_name.toLowerCase().includes(teamName.toLowerCase());

                  return (
                    <tr
                      key={row.id || idx}
                      className={`transition-colors ${
                        isOurTeam
                          ? "bg-blue-50/90 border-l-4 border-l-blue-600 shadow-xs"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Posición con indicador de zona */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {row.zone_color && (
                            <span
                              className="w-1.5 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: row.zone_color }}
                              title="Zona de clasificación FFCV"
                            />
                          )}
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                              row.position === 1
                                ? "bg-amber-400 text-amber-950 shadow-xs"
                                : row.position === 2
                                ? "bg-slate-300 text-slate-900 shadow-xs"
                                : row.position === 3
                                ? "bg-orange-300 text-orange-950 shadow-xs"
                                : isOurTeam
                                ? "bg-blue-600 text-white shadow-xs"
                                : "text-slate-600"
                            }`}
                          >
                            {row.position}
                          </span>
                        </div>
                      </td>

                      {/* Escudo y Nombre */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
                            {row.shield_url ? (
                              <img
                                src={row.shield_url}
                                alt={row.team_name}
                                className="w-full h-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <ShieldCheck className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <span
                            className={`truncate max-w-[200px] sm:max-w-none ${
                              isOurTeam
                                ? "font-black text-blue-900 text-sm flex items-center gap-2"
                                : "font-semibold text-slate-800"
                            }`}
                          >
                            {row.team_name}
                            {isOurTeam && (
                              <span className="text-[9px] uppercase font-black px-1.5 py-0.5 bg-blue-600 text-white rounded shrink-0 shadow-2xs">
                                Nuestro Equipo
                              </span>
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Puntos */}
                      <td className="px-4 py-3 text-center font-black text-slate-900 text-base bg-blue-50/20">
                        {row.points}
                      </td>

                      {/* Estadísticas */}
                      <td className="px-4 py-3 text-center text-slate-700 font-semibold">{row.played}</td>
                      <td className="px-4 py-3 text-center text-emerald-700 font-bold">{row.won}</td>
                      <td className="px-4 py-3 text-center text-amber-700 font-semibold">{row.drawn}</td>
                      <td className="px-4 py-3 text-center text-rose-600 font-semibold">{row.lost}</td>
                      <td className="px-4 py-3 text-center text-slate-600 hidden lg:table-cell">{row.goals_for}</td>
                      <td className="px-4 py-3 text-center text-slate-600 hidden lg:table-cell">{row.goals_against}</td>
                      <td
                        className={`px-4 py-3 text-center hidden lg:table-cell font-bold ${
                          row.goal_difference > 0
                            ? "text-emerald-600"
                            : row.goal_difference < 0
                            ? "text-rose-600"
                            : "text-slate-500"
                        }`}
                      >
                        {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ========================================================= */}
          {/* VISTA MÓVIL (Tarjetas y Filas Expandibles tipo Acordeón)  */}
          {/* ========================================================= */}
          <div className="block md:hidden divide-y divide-slate-100 p-2 sm:p-3 space-y-2.5">
            {currentStandings.map((row, idx) => {
              const isOurTeam = ffcvTeamId
                ? row.team_ffcv_id === ffcvTeamId
                : (row.team_name.toLowerCase().includes("sporting") && row.team_name.toLowerCase().includes("saladar")) ||
                  row.team_name.toLowerCase().includes(teamName.toLowerCase());

              const teamKey = row.team_ffcv_id || String(row.position || idx);
              const isExpanded = expandedTeams.has(teamKey);

              return (
                <div
                  key={row.id || teamKey}
                  className={`rounded-2xl border transition-all overflow-hidden ${
                    isOurTeam
                      ? "bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
                      : "bg-white border-slate-200 shadow-2xs hover:border-slate-300"
                  }`}
                >
                  {/* Fila Principal / Cabecera de la Tarjeta Táctil */}
                  <button
                    type="button"
                    onClick={() => toggleTeamExpansion(teamKey)}
                    aria-expanded={isExpanded}
                    className="w-full text-left p-3 flex flex-col gap-2.5 focus:outline-none cursor-pointer"
                  >
                    {/* Top Row: Posición, Escudo, Nombre y Puntos */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Posición con marca de zona */}
                        <div className="flex items-center gap-1 shrink-0">
                          {row.zone_color && (
                            <span
                              className="w-1 h-5 rounded-full"
                              style={{ backgroundColor: row.zone_color }}
                              title="Zona FFCV"
                            />
                          )}
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                              row.position === 1
                                ? "bg-amber-400 text-amber-950 shadow-xs"
                                : row.position === 2
                                ? "bg-slate-300 text-slate-900 shadow-xs"
                                : row.position === 3
                                ? "bg-orange-300 text-orange-950 shadow-xs"
                                : isOurTeam
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {row.position}
                          </span>
                        </div>

                        {/* Escudo */}
                        <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
                          {row.shield_url ? (
                            <img
                              src={row.shield_url}
                              alt={row.team_name}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <ShieldCheck className="w-4 h-4 text-slate-400" />
                          )}
                        </div>

                        {/* Nombre del equipo */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span
                              className={`text-xs leading-tight line-clamp-1 ${
                                isOurTeam ? "font-black text-blue-900 text-[13px]" : "font-bold text-slate-800"
                              }`}
                            >
                              {row.team_name}
                            </span>
                            {isOurTeam && (
                              <span className="text-[8px] uppercase font-black px-1.5 py-0.2 bg-blue-600 text-white rounded shrink-0">
                                Nuestro Equipo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Puntos y Chevron */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="px-2.5 py-1 bg-blue-50 border border-blue-200/80 rounded-xl text-center">
                          <span className="text-sm font-black text-blue-900 leading-none">
                            {row.points}
                          </span>
                          <span className="text-[9px] font-bold text-blue-600 uppercase ml-1">
                            pts
                          </span>
                        </div>
                        <div className="p-1 text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Fila de Estadísticas Compactas Siempre Visibles (Sin scroll horizontal) */}
                    <div className="grid grid-cols-7 gap-1 bg-slate-50/90 rounded-xl p-1.5 border border-slate-100 text-center">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase">PJ</span>
                        <span className="text-xs font-bold text-slate-700">{row.played}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-emerald-600 uppercase">PG</span>
                        <span className="text-xs font-bold text-emerald-700">{row.won}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-amber-600 uppercase">PE</span>
                        <span className="text-xs font-bold text-amber-700">{row.drawn}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-rose-600 uppercase">PP</span>
                        <span className="text-xs font-bold text-rose-700">{row.lost}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase">GF</span>
                        <span className="text-xs font-bold text-slate-700">{row.goals_for}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase">GC</span>
                        <span className="text-xs font-bold text-slate-700">{row.goals_against}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-semibold text-slate-400 uppercase">DG</span>
                        <span
                          className={`text-xs font-bold ${
                            row.goal_difference > 0
                              ? "text-emerald-600"
                              : row.goal_difference < 0
                              ? "text-rose-600"
                              : "text-slate-600"
                          }`}
                        >
                          {row.goal_difference > 0 ? `+${row.goal_difference}` : row.goal_difference}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Panel Expandido con Estadísticas Completas */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-white/60 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pt-1">
                        Desglose Oficial FFCV
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Casa / Local */}
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-extrabold text-slate-700 uppercase">
                            <Home className="w-3 h-3 text-blue-600" />
                            <span>En Casa</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-600">
                            <span>PJ: <strong className="text-slate-800">{row.home_played}</strong></span>
                            <span>PG: <strong className="text-emerald-700">{row.home_won}</strong></span>
                            <span>PE: <strong className="text-amber-700">{row.home_drawn}</strong></span>
                            <span>PP: <strong className="text-rose-700">{row.home_lost}</strong></span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold text-right pt-0.5">
                            Pts Casa: <span className="text-blue-900 font-extrabold">{row.home_points}</span>
                          </div>
                        </div>

                        {/* Fuera / Visitante */}
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-extrabold text-slate-700 uppercase">
                            <Plane className="w-3 h-3 text-indigo-600" />
                            <span>Fuera</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-slate-600">
                            <span>PJ: <strong className="text-slate-800">{row.away_played}</strong></span>
                            <span>PG: <strong className="text-emerald-700">{row.away_won}</strong></span>
                            <span>PE: <strong className="text-amber-700">{row.away_drawn}</strong></span>
                            <span>PP: <strong className="text-rose-700">{row.away_lost}</strong></span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-bold text-right pt-0.5">
                            Pts Fuera: <span className="text-indigo-900 font-extrabold">{row.away_points}</span>
                          </div>
                        </div>
                      </div>

                      {/* Detalles adicionales si existen (Puntos sanción, Coeficiente, Racha) */}
                      {(row.penalty_points > 0 || row.raw_data?.coeficiente || (row.raw_data?.racha_partidos && row.raw_data.racha_partidos.length > 0)) && (
                        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                          {row.penalty_points > 0 && (
                            <div className="text-rose-600 font-bold flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Sanción: -{row.penalty_points} pts</span>
                            </div>
                          )}
                          {row.raw_data?.coeficiente && (
                            <div className="font-medium">
                              Coef: <strong className="text-slate-800">{row.raw_data.coeficiente}</strong>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

