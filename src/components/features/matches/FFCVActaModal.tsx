"use client";

import React, { useEffect, useState } from "react";
import { X, Trophy, ShieldCheck, User, AlertCircle, RefreshCw, Clock, MapPin, Award } from "lucide-react";
import { getFFCVMatchReportAction } from "@/app/actions/ffcv-actions";
import { FFCVRawMatchDetails } from "@/lib/ffcv/types";

interface FFCVActaModalProps {
  codacta: string;
  homeTeamName?: string;
  awayTeamName?: string;
  onClose: () => void;
}

export function FFCVActaModal({
  codacta,
  homeTeamName,
  awayTeamName,
  onClose,
}: FFCVActaModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FFCVRawMatchDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReport() {
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
                {data?.acta_cerrada === "1" ? (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-300 px-2 py-0.5 rounded">
                    Acta Cerrada
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
            <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
              <h4 className="font-bold text-red-900 text-sm">No se pudo cargar el acta</h4>
              <p className="text-xs text-red-600">{error}</p>
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
                      {data.nombre_competicion || "FFCV"} - {data.nombre_grupo || "Grupo"} (J{data.jornada || "1"})
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
                  {data.acta_cerrada === "1" || (data.goles_local !== undefined && data.goles_local !== null && data.goles_local !== "") ? (
                    <div className="text-3xl font-black text-slate-900 tracking-wider">
                      {data.goles_local || 0} - {data.goles_visitante || 0}
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
                        <span className="font-semibold">{arb.nombre || arb.nombre_arbitro || "Árbitro"}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{arb.tipo || arb.cargo || "Principal"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Goles del Partido */}
              {((data.goles_equipo_local && data.goles_equipo_local.length > 0) || (data.goles_equipo_visitante && data.goles_equipo_visitante.length > 0)) && (
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
                          <div key={idx} className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-900 flex justify-between">
                            <span>⚽ {g.jugador || g.nombre || "Gol"}</span>
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
                          <div key={idx} className="p-2 bg-emerald-50 border border-emerald-100 rounded-lg text-xs font-semibold text-emerald-900 flex justify-between">
                            <span>⚽ {g.jugador || g.nombre || "Gol"}</span>
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

              {/* Alineaciones Oficiales */}
              {((data.jugadores_equipo_local && data.jugadores_equipo_local.length > 0) || (data.jugadores_equipo_visitante && data.jugadores_equipo_visitante.length > 0)) && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    Alineaciones
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Alineación Local */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">{data.equipo_local || "Local"}</span>
                      <div className="space-y-1">
                        {(data.jugadores_equipo_local || []).map((j: any, idx: number) => (
                          <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-100 text-xs flex items-center justify-between">
                            <span className="font-semibold text-slate-800">
                              {j.dorsal ? `${j.dorsal}. ` : ""}{j.nombre || j.jugador}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">{j.titular ? "Titular" : "Suplente"}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Alineación Visitante */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase block">{data.equipo_visitante || "Visitante"}</span>
                      <div className="space-y-1">
                        {(data.jugadores_equipo_visitante || []).map((j: any, idx: number) => (
                          <div key={idx} className="p-1.5 bg-slate-50 rounded border border-slate-100 text-xs flex items-center justify-between">
                            <span className="font-semibold text-slate-800">
                              {j.dorsal ? `${j.dorsal}. ` : ""}{j.nombre || j.jugador}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">{j.titular ? "Titular" : "Suplente"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
