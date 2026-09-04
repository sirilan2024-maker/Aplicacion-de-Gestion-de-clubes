"use client";

import React, { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Clock, MapPin, Trophy, ShieldCheck, ChevronLeft, ChevronRight, FileText, AlertCircle, RefreshCw } from "lucide-react";
import { FFCVMatchRecord, FFCVGroupRecord } from "@/lib/ffcv/types";
import { FFCVActaModal } from "./FFCVActaModal";

interface FFCVMatchesSectionProps {
  ffcvGroupId?: string | null;
  ffcvTeamId?: string | null;
  teamName: string;
  initialMatches?: FFCVMatchRecord[];
  groupInfo?: FFCVGroupRecord | null;
}

export function FFCVMatchesSection({
  ffcvGroupId,
  ffcvTeamId,
  teamName,
  initialMatches = [],
  groupInfo,
}: FFCVMatchesSectionProps) {
  const [matches, setMatches] = useState<FFCVMatchRecord[]>(initialMatches);
  const [loading, setLoading] = useState(initialMatches.length === 0 && !!ffcvGroupId);
  const [selectedJornada, setSelectedJornada] = useState<number>(1);
  const [viewingActa, setViewingActa] = useState<{ codacta: string; homeName: string; awayName: string } | null>(null);

  // Fetch FFCV matches from Supabase
  useEffect(() => {
    if (!ffcvGroupId) {
      setLoading(false);
      return;
    }

    async function loadFFCVMatches() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("ffcv_matches")
          .select("*")
          .eq("ffcv_group_id", ffcvGroupId)
          .order("matchday", { ascending: true })
          .order("match_date", { ascending: true })
          .order("match_time", { ascending: true });

        if (!error && data) {
          setMatches(data as FFCVMatchRecord[]);
          // Default to first matchday or current matchday
          if (data.length > 0) {
            const matchdays = Array.from(new Set(data.map((m: any) => m.matchday))).sort((a: any, b: any) => a - b);
            if (matchdays.length > 0) {
              setSelectedJornada(matchdays[0] as number);
            }
          }
        }
      } catch (err) {
        console.error("Error loading FFCV matches from Supabase:", err);
      } finally {
        setLoading(false);
      }
    }

    loadFFCVMatches();
  }, [ffcvGroupId]);

  // Available matchdays in competition (e.g., 1 to 30)
  const availableJornadas = useMemo(() => {
    if (groupInfo?.total_matchdays && groupInfo.total_matchdays > 0) {
      return Array.from({ length: groupInfo.total_matchdays }, (_, i) => i + 1);
    }
    const jSet = new Set<number>();
    matches.forEach((m) => jSet.add(m.matchday));
    if (jSet.size > 0) {
      const maxJ = Math.max(...Array.from(jSet));
      return Array.from({ length: maxJ }, (_, i) => i + 1);
    }
    return Array.from({ length: 30 }, (_, i) => i + 1);
  }, [matches, groupInfo]);

  // Smart initial matchday selection
  useEffect(() => {
    if (matches.length > 0) {
      const now = new Date();
      // Find first matchday with an unplayed match or match in future
      const upcomingMatch = matches.find((m) => {
        if (m.status === "scheduled") return true;
        if (m.match_date && new Date(m.match_date) >= now) return true;
        return false;
      });

      if (upcomingMatch && upcomingMatch.matchday) {
        setSelectedJornada(upcomingMatch.matchday);
      } else {
        const firstJ = matches[0]?.matchday || 1;
        setSelectedJornada(firstJ);
      }
    }
  }, [matches]);

  // Current matchday matches
  const currentMatches = useMemo(() => {
    return matches.filter((m) => m.matchday === selectedJornada);
  }, [matches, selectedJornada]);

  // Handle Jornada Navigation
  const handlePrevJornada = () => {
    const currentIdx = availableJornadas.indexOf(selectedJornada);
    if (currentIdx > 0) {
      setSelectedJornada(availableJornadas[currentIdx - 1]);
    }
  };

  const handleNextJornada = () => {
    const currentIdx = availableJornadas.indexOf(selectedJornada);
    if (currentIdx >= 0 && currentIdx < availableJornadas.length - 1) {
      setSelectedJornada(availableJornadas[currentIdx + 1]);
    }
  };

  if (!ffcvGroupId) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-sm">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Trophy className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-slate-800 text-base">Sin Competición FFCV Vinculada</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Este equipo no tiene asignado un grupo de la FFCV. Cuando se configure en la base de datos, aparecerá aquí el calendario oficial de partidos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con Navegación de Jornadas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                Calendario Oficial FFCV
              </span>
              {groupInfo?.competition_name && (
                <span className="text-xs font-bold text-slate-500">
                  {groupInfo.competition_name} {groupInfo.group_name ? `- ${groupInfo.group_name}` : ""}
                </span>
              )}
            </div>
            <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
              Partidos de la Jornada {selectedJornada}
            </h3>
          </div>
        </div>

        {/* Selector de Jornada */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevJornada}
            disabled={availableJornadas.indexOf(selectedJornada) <= 0}
            className="p-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-700 transition-colors"
            title="Jornada anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedJornada}
              onChange={(e) => setSelectedJornada(Number(e.target.value))}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
            >
              {availableJornadas.map((j) => (
                <option key={j} value={j}>
                  Jornada {j}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNextJornada}
            disabled={availableJornadas.indexOf(selectedJornada) >= availableJornadas.length - 1}
            className="p-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 rounded-xl border border-slate-200 text-slate-700 transition-colors"
            title="Jornada siguiente"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid de Partidos */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center gap-3 shadow-sm">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-500">Cargando partidos oficiales desde Supabase...</p>
        </div>
      ) : currentMatches.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-2 shadow-sm">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="font-bold text-slate-700 text-sm">Jornada {selectedJornada}</h4>
          <p className="text-xs text-slate-500">No hay partidos disponibles para esta jornada.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentMatches.map((m) => {
            const isOurTeamHome = ffcvTeamId ? m.home_team_ffcv_id === ffcvTeamId : m.home_team_name.toLowerCase().includes(teamName.toLowerCase());
            const isOurTeamAway = ffcvTeamId ? m.away_team_ffcv_id === ffcvTeamId : m.away_team_name.toLowerCase().includes(teamName.toLowerCase());
            const isOurTeamMatch = isOurTeamHome || isOurTeamAway;

            const isPlayed = m.status === "played" && m.home_score !== null && m.away_score !== null;
            const isPostponed = m.status === "postponed";
            const isSuspended = m.status === "suspended";

            return (
              <div
                key={m.ffcv_match_id}
                className={`rounded-2xl border transition-all p-4 flex flex-col justify-between gap-3 shadow-sm ${
                  isOurTeamMatch
                    ? "bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20 shadow-md"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                {/* Header Tarjeta */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      isPlayed
                        ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                        : isPostponed
                        ? "bg-amber-100 text-amber-700 border border-amber-200"
                        : isSuspended
                        ? "bg-rose-100 text-rose-700 border border-rose-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}>
                      {isPlayed ? "Finalizado" : isPostponed ? "Aplazado" : isSuspended ? "Suspendido" : "Programado"}
                    </span>
                    {isOurTeamMatch && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-xs">
                        Nuestro Partido
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span>{m.match_date ? new Date(m.match_date).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : "Fecha por definir"}</span>
                    {m.match_time && (
                      <>
                        <span className="text-slate-300">•</span>
                        <span>{m.match_time.slice(0, 5)} h</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Equipos y Marcador */}
                <div className="flex items-center justify-between py-2 gap-2">
                  {/* Local */}
                  <div className="flex flex-col items-center flex-1 text-center min-w-0">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 mb-1.5 shadow-xs shrink-0">
                      {m.home_shield_url ? (
                        <img
                          src={m.home_shield_url}
                          alt={m.home_team_name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <ShieldCheck className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <span className={`text-xs leading-snug line-clamp-2 ${isOurTeamHome ? "font-black text-blue-900" : "font-bold text-slate-800"}`}>
                      {m.home_team_name}
                    </span>
                  </div>

                  {/* Marcador Central */}
                  <div className="px-3 flex flex-col items-center justify-center shrink-0">
                    {isPlayed ? (
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-black text-slate-900">{m.home_score}</span>
                        <span className="text-slate-300 font-bold">-</span>
                        <span className="text-2xl font-black text-slate-900">{m.away_score}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="text-slate-300 font-black text-lg italic tracking-wider">VS</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Sin jugar</span>
                      </div>
                    )}
                  </div>

                  {/* Visitante */}
                  <div className="flex flex-col items-center flex-1 text-center min-w-0">
                    <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 mb-1.5 shadow-xs shrink-0">
                      {m.away_shield_url ? (
                        <img
                          src={m.away_shield_url}
                          alt={m.away_team_name}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <ShieldCheck className="w-6 h-6 text-slate-400" />
                      )}
                    </div>
                    <span className={`text-xs leading-snug line-clamp-2 ${isOurTeamAway ? "font-black text-blue-900" : "font-bold text-slate-800"}`}>
                      {m.away_team_name}
                    </span>
                  </div>
                </div>

                {/* Footer Tarjeta: Campo y Botón de Acta Oficial */}
                <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-500 w-full sm:w-auto truncate">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate font-medium">{m.pitch_name || "Campo por determinar"}</span>
                  </div>

                  {m.codacta && (
                    <button
                      onClick={() => setViewingActa({
                        codacta: m.codacta!,
                        homeName: m.home_team_name,
                        awayName: m.away_team_name
                      })}
                      className="w-full sm:w-auto px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
                    >
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <span>Ver acta oficial FFCV</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Acta Oficial FFCV */}
      {viewingActa && (
        <FFCVActaModal
          codacta={viewingActa.codacta}
          homeTeamName={viewingActa.homeName}
          awayTeamName={viewingActa.awayName}
          onClose={() => setViewingActa(null)}
        />
      )}
    </div>
  );
}
