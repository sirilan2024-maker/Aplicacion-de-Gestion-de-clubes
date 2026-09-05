"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Trophy, ShieldCheck, User, AlertCircle, RefreshCw, Clock, MapPin, Award, ArrowRightLeft, ShieldAlert, FileText, ArrowRight, FolderOpen } from "lucide-react";
import { getFFCVMatchReportAction } from "@/app/actions/ffcv-actions";
import { FFCVRawMatchDetails } from "@/lib/ffcv/types";

interface FFCVActaModalProps {
  codacta: string;
  matchId?: string;
  teamId?: string;
  homeTeamName?: string;
  awayTeamName?: string;
  onClose: () => void;
}

export function FFCVActaModal({
  codacta,
  matchId,
  teamId,
  homeTeamName,
  awayTeamName,
  onClose,
}: FFCVActaModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FFCVRawMatchDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
      if (!codacta) {
        setError("Identificador de acta no disponible");
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const res = await getFFCVMatchReportAction(codacta);
        if (res.success && res.data) {
          setData(res.data);
        } else {
          setError(res.error || "No se pudo obtener el acta oficial de la federación.");
        }
      } catch (err: any) {
        setError(err.message || "Error al consultar el acta");
      } finally {
        setLoading(false);
      }
    }
    loadReport();
  }, [codacta]);

  // Helper function to check if player is titular (handles "1", 1, true)
  const isTitular = (p: any) => {
    return String(p?.titular) === "1" || p?.titular === 1 || p?.titular === true;
  };

  const localTitulares = (data?.jugadores_equipo_local || []).filter(isTitular);
  const localSuplentes = (data?.jugadores_equipo_local || []).filter(p => !isTitular(p));
  const awayTitulares = (data?.jugadores_equipo_visitante || []).filter(isTitular);
  const awaySuplentes = (data?.jugadores_equipo_visitante || []).filter(p => !isTitular(p));

  const hasCards = (data?.tarjetas_equipo_local && data.tarjetas_equipo_local.length > 0) ||
                   (data?.tarjetas_equipo_visitante && data.tarjetas_equipo_visitante.length > 0);

  const hasSubs = (data?.sustituciones_equipo_local && data.sustituciones_equipo_local.length > 0) ||
                  (data?.sustituciones_equipo_visitante && data.sustituciones_equipo_visitante.length > 0);

  const hasGoals = (data?.goles_equipo_local && data.goles_equipo_local.length > 0) ||
                   (data?.goles_equipo_visitante && data.goles_equipo_visitante.length > 0);

  const isClosed = String(data?.acta_cerrada) === "1";

  const handleNavigateToActas = () => {
    onClose();
    const targetUrl = teamId
      ? `/dashboard/equipos/${teamId}/partidos?view=actas&codacta=${codacta}&matchId=${matchId || codacta}`
      : `/dashboard/matches?view=actas&codacta=${codacta}&matchId=${matchId || codacta}`;
    router.push(targetUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex items-center justify-between border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-xl border border-blue-400/30">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 px-2 py-0.5 rounded">
                  Acta Oficial FFCV #{codacta}
                </span>
                {isClosed ? (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded">
                    Acta Cerrada y Validada
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500/30 text-amber-300 px-2 py-0.5 rounded">
                    Programado / Provisional
                  </span>
                )}
              </div>
              <h3 className="text-base sm:text-lg font-black text-white mt-1">
                {data?.equipo_local || homeTeamName || "Local"} vs {data?.equipo_visitante || awayTeamName || "Visitante"}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
              <p className="text-xs font-semibold text-slate-500">Cargando acta oficial desde la federación...</p>
            </div>
          ) : error ? (
            <div className="p-8 bg-amber-50/80 border border-amber-200 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-amber-900 text-sm">Acta oficial FFCV no disponible todavía</h4>
              <p className="text-xs text-amber-700 max-w-md mx-auto">
                {error.includes("404") || error.includes("not found") || error.includes("No se pudo")
                  ? "El acta electrónica de este partido aún no ha sido redactada o validada por el comité técnico arbitral de la FFCV."
                  : error}
              </p>
            </div>
          ) : data ? (
            <>
              {/* Información General del Partido */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Fecha y Hora</span>
                    <span className="text-xs font-bold text-slate-800">
                      {data.fecha || "-"} • {data.hora || "-"} h
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Campo Deportivo</span>
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {data.campo || "Por determinar"}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
                  <Trophy className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="truncate">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Competición y Grupo</span>
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {data.nombre_competicion || "FFCV"} {data.nombre_grupo ? `- ${data.nombre_grupo}` : ""} (J{data.jornada || "1"})
                    </span>
                  </div>
                </div>
              </div>

              {/* Marcador Central */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex-1 text-center font-bold text-slate-900 text-sm sm:text-base">
                  {data.equipo_local || homeTeamName}
                </div>
                <div className="px-6 flex flex-col items-center justify-center">
                  {isClosed || (data.goles_local !== undefined && data.goles_local !== null && data.goles_local !== "") ? (
                    <div className="text-3xl font-black text-slate-900 tracking-wider">
                      {data.goles_local ?? 0} - {data.goles_visitante ?? 0}
                    </div>
                  ) : (
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
                      Programado
                    </span>
                  )}
                </div>
                <div className="flex-1 text-center font-bold text-slate-900 text-sm sm:text-base">
                  {data.equipo_visitante || awayTeamName}
                </div>
              </div>

              {/* Árbitros */}
              {data.arbitros_partido && data.arbitros_partido.length > 0 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" />
                    Equipo Arbitral
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                    {data.arbitros_partido.map((arb: any, idx: number) => (
                      <div key={idx} className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                        <span className="font-semibold">{arb.nombre_arbitro || arb.nombre || "Árbitro"}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{arb.tipo_arbitro || arb.tipo || arb.cargo || "Principal"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Goles del Partido */}
              {hasGoals && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    Goles Anotados
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Goles Local */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">{data.equipo_local || "Local"}</span>
                      {data.goles_equipo_local && data.goles_equipo_local.length > 0 ? (
                        data.goles_equipo_local.map((g: any, idx: number) => (
                          <div key={idx} className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-900 flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span>⚽</span>
                              <span>{g.nombre_jugador || g.jugador || g.nombre || "Gol"}</span>
                              {g.tipo_gol && <span className="text-[10px] text-emerald-700 italic">({g.tipo_gol})</span>}
                            </div>
                            <span className="text-emerald-700 font-bold">{g.minuto ? `${g.minuto}'` : ""}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin goles</span>
                      )}
                    </div>

                    {/* Goles Visitante */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">{data.equipo_visitante || "Visitante"}</span>
                      {data.goles_equipo_visitante && data.goles_equipo_visitante.length > 0 ? (
                        data.goles_equipo_visitante.map((g: any, idx: number) => (
                          <div key={idx} className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-900 flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                              <span>⚽</span>
                              <span>{g.nombre_jugador || g.jugador || g.nombre || "Gol"}</span>
                              {g.tipo_gol && <span className="text-[10px] text-emerald-700 italic">({g.tipo_gol})</span>}
                            </div>
                            <span className="text-emerald-700 font-bold">{g.minuto ? `${g.minuto}'` : ""}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin goles</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tarjetas y Amonestaciones */}
              {hasCards && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500" />
                    Tarjetas y Amonestaciones
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tarjetas Local */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">{data.equipo_local || "Local"}</span>
                      {data.tarjetas_equipo_local && data.tarjetas_equipo_local.length > 0 ? (
                        data.tarjetas_equipo_local.map((t: any, idx: number) => {
                          const isRed = t.codigo_tipo_amonestacion === "2" || t.tipo_tarjeta === "roja" || t.tarjeta === "roja" || t.segunda_amarilla === "1";
                          return (
                            <div key={idx} className={`p-2 rounded-lg text-xs font-semibold flex justify-between items-center border ${isRed ? "bg-red-50 border-red-100 text-red-900" : "bg-amber-50 border-amber-100 text-amber-900"}`}>
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-block w-2.5 h-3.5 rounded-xs ${isRed ? "bg-red-600" : "bg-amber-400"}`}></span>
                                <span>{t.nombre_jugador || t.jugador || t.nombre || "Amonestado"}</span>
                                {t.segunda_amarilla === "1" && <span className="text-[9px] font-bold text-red-600 uppercase">(2ª Amarilla)</span>}
                              </div>
                              <span className="font-bold">{t.minuto ? `${t.minuto}'` : ""}</span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin tarjetas</span>
                      )}
                    </div>

                    {/* Tarjetas Visitante */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">{data.equipo_visitante || "Visitante"}</span>
                      {data.tarjetas_equipo_visitante && data.tarjetas_equipo_visitante.length > 0 ? (
                        data.tarjetas_equipo_visitante.map((t: any, idx: number) => {
                          const isRed = t.codigo_tipo_amonestacion === "2" || t.tipo_tarjeta === "roja" || t.tarjeta === "roja" || t.segunda_amarilla === "1";
                          return (
                            <div key={idx} className={`p-2 rounded-lg text-xs font-semibold flex justify-between items-center border ${isRed ? "bg-red-50 border-red-100 text-red-900" : "bg-amber-50 border-amber-100 text-amber-900"}`}>
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-block w-2.5 h-3.5 rounded-xs ${isRed ? "bg-red-600" : "bg-amber-400"}`}></span>
                                <span>{t.nombre_jugador || t.jugador || t.nombre || "Amonestado"}</span>
                                {t.segunda_amarilla === "1" && <span className="text-[9px] font-bold text-red-600 uppercase">(2ª Amarilla)</span>}
                              </div>
                              <span className="font-bold">{t.minuto ? `${t.minuto}'` : ""}</span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin tarjetas</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sustituciones / Cambios */}
              {hasSubs && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <ArrowRightLeft className="w-4 h-4 text-blue-600" />
                    Sustituciones
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Sustituciones Local */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">{data.equipo_local || "Local"}</span>
                      {data.sustituciones_equipo_local && data.sustituciones_equipo_local.length > 0 ? (
                        data.sustituciones_equipo_local.map((s: any, idx: number) => (
                          <div key={idx} className="p-2 bg-blue-50/60 border border-blue-100 rounded-lg text-xs flex justify-between items-center">
                            <div className="space-y-0.5">
                              <div className="text-emerald-700 font-semibold flex items-center gap-1">
                                <span>▲</span>
                                <span>{s.jugador_entra || s.nombre_entra || "Entra"}</span>
                              </div>
                              <div className="text-rose-600 font-semibold flex items-center gap-1">
                                <span>▼</span>
                                <span>{s.jugador_sale || s.nombre_sale || "Sale"}</span>
                              </div>
                            </div>
                            <span className="text-slate-500 font-bold">{s.minuto ? `${s.minuto}'` : ""}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin cambios</span>
                      )}
                    </div>

                    {/* Sustituciones Visitante */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">{data.equipo_visitante || "Visitante"}</span>
                      {data.sustituciones_equipo_visitante && data.sustituciones_equipo_visitante.length > 0 ? (
                        data.sustituciones_equipo_visitante.map((s: any, idx: number) => (
                          <div key={idx} className="p-2 bg-blue-50/60 border border-blue-100 rounded-lg text-xs flex justify-between items-center">
                            <div className="space-y-0.5">
                              <div className="text-emerald-700 font-semibold flex items-center gap-1">
                                <span>▲</span>
                                <span>{s.jugador_entra || s.nombre_entra || "Entra"}</span>
                              </div>
                              <div className="text-rose-600 font-semibold flex items-center gap-1">
                                <span>▼</span>
                                <span>{s.jugador_sale || s.nombre_sale || "Sale"}</span>
                              </div>
                            </div>
                            <span className="text-slate-500 font-bold">{s.minuto ? `${s.minuto}'` : ""}</span>
                          </div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">Sin cambios</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Alineaciones Oficiales */}
              {((data.jugadores_equipo_local && data.jugadores_equipo_local.length > 0) || (data.jugadores_equipo_visitante && data.jugadores_equipo_visitante.length > 0)) && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Alineaciones Oficiales
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Alineación Local */}
                    <div className="space-y-3">
                      <div className="border-b border-slate-200 pb-1.5">
                        <span className="text-xs font-black text-slate-900 uppercase block">{data.equipo_local || "Local"}</span>
                      </div>
                      
                      {/* Titulares */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block bg-blue-50 px-2 py-0.5 rounded">
                          Titulares ({localTitulares.length})
                        </span>
                        {localTitulares.map((j: any, idx: number) => (
                          <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-100 text-xs flex items-center justify-between">
                            <span className="font-semibold text-slate-800">
                              {j.dorsal ? `${j.dorsal}. ` : ""}{j.nombre_jugador || j.nombre || j.jugador}
                            </span>
                            <span className="text-[10px] text-blue-600 font-bold">Titular</span>
                          </div>
                        ))}
                      </div>

                      {/* Suplentes */}
                      {localSuplentes.length > 0 && (
                        <div className="space-y-1 pt-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block bg-slate-100 px-2 py-0.5 rounded">
                            Suplentes ({localSuplentes.length})
                          </span>
                          {localSuplentes.map((j: any, idx: number) => (
                            <div key={idx} className="p-1.5 bg-slate-50/60 rounded border border-slate-100 text-xs flex items-center justify-between">
                              <span className="font-medium text-slate-600">
                                {j.dorsal ? `${j.dorsal}. ` : ""}{j.nombre_jugador || j.nombre || j.jugador}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">Suplente</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Alineación Visitante */}
                    <div className="space-y-3">
                      <div className="border-b border-slate-200 pb-1.5">
                        <span className="text-xs font-black text-slate-900 uppercase block">{data.equipo_visitante || "Visitante"}</span>
                      </div>

                      {/* Titulares */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-blue-700 uppercase tracking-wider block bg-blue-50 px-2 py-0.5 rounded">
                          Titulares ({awayTitulares.length})
                        </span>
                        {awayTitulares.map((j: any, idx: number) => (
                          <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-100 text-xs flex items-center justify-between">
                            <span className="font-semibold text-slate-800">
                              {j.dorsal ? `${j.dorsal}. ` : ""}{j.nombre_jugador || j.nombre || j.jugador}
                            </span>
                            <span className="text-[10px] text-blue-600 font-bold">Titular</span>
                          </div>
                        ))}
                      </div>

                      {/* Suplentes */}
                      {awaySuplentes.length > 0 && (
                        <div className="space-y-1 pt-2">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block bg-slate-100 px-2 py-0.5 rounded">
                            Suplentes ({awaySuplentes.length})
                          </span>
                          {awaySuplentes.map((j: any, idx: number) => (
                            <div key={idx} className="p-1.5 bg-slate-50/60 rounded border border-slate-100 text-xs flex items-center justify-between">
                              <span className="font-medium text-slate-600">
                                {j.dorsal ? `${j.dorsal}. ` : ""}{j.nombre_jugador || j.nombre || j.jugador}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">Suplente</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sección 2: ACCESO A LA SECCIÓN DE ACTAS DE LA APLICACIÓN */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-50 text-blue-700 rounded-xl border border-blue-100">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Gestor y Visor de Actas del Club
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        Accede directamente a la sección de Actas del club para consultar el acta, conciliar estadísticas o gestionar el partido
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleNavigateToActas}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm shrink-0 self-start sm:self-auto cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>Ver acta en Actas</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700">Identificador federativo oficial:</span>
                    <code className="bg-slate-200/70 text-slate-800 px-2 py-0.5 rounded font-mono text-[11px] font-bold">#{codacta}</code>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Navegación interna en Equipos → Actas</span>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleNavigateToActas}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Ver acta en Actas</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}




