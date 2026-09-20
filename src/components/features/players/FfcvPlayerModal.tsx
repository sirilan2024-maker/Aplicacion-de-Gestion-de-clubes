"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, Trophy, Calendar, Award, User, AlertCircle, 
  ExternalLink, Loader2, X, Activity, Clock, Layers
} from "lucide-react";

interface FfcvPlayerModalProps {
  playerId: string;
  playerName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function FfcvPlayerModal({ playerId, playerName, isOpen, onClose }: FfcvPlayerModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (isOpen && playerId) {
      fetchFfcvInfo();
    }
  }, [isOpen, playerId]);

  const fetchFfcvInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ffcv-player-info?playerId=${playerId}`);
      const json = await res.json();
      if (!res.ok || json.error) {
        setError(json.error || "No se pudo consultar la federación.");
      } else if (!json.found) {
        setError(json.message || "El jugador no figura en la plantilla oficial publicada en la FFCV.");
      } else {
        setData(json.player);
      }
    } catch (err: any) {
      setError("Error de conexión al consultar los datos oficiales de la FFCV.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/20">
                  Federació de Futbol Comunitat Valenciana
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                Ficha Federativa FFCV
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-3" />
              <p className="font-bold text-slate-700 text-base">Consultando base de datos oficial FFCV...</p>
              <p className="text-xs text-slate-400 mt-1">Obteniendo ficha en tiempo real, estadísticas e historial de clubes.</p>
            </div>
          ) : error ? (
            <div className="py-12 px-4 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800">Información Federativa</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{error}</p>
              <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 text-left text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Nota informativa:</p>
                <p>• Los datos provienen en vivo de la FFCV.</p>
                <p>• Las categorías en trámite de validación aparecen una vez aprobada la ficha por la federación.</p>
              </div>
            </div>
          ) : data ? (
            <>
              {/* Carnet del Jugador */}
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-200 shadow-inner flex items-center justify-center shrink-0">
                  {data.foto_base64 ? (
                    <img 
                      src={data.foto_base64} 
                      alt={data.nombre} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <User className="w-12 h-12 text-slate-300" />
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="text-lg sm:text-xl font-black text-slate-900 truncate">
                      {data.nombre}
                    </h3>
                    {data.dorsal && (
                      <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-extrabold text-xs">
                        #{data.dorsal}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Cod. Ficha FFCV</span>
                      <span className="font-extrabold text-slate-800">{data.codjugador}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Posición FFCV</span>
                      <span className="font-extrabold text-slate-800 truncate block">{data.posicion || "Sin definir"}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 col-span-2 sm:col-span-1">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Categoría</span>
                      <span className="font-extrabold text-slate-800 truncate block">{data.categoria || "Federado"}</span>
                    </div>
                  </div>

                  {data.email && (
                    <div className="mt-2.5 text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
                      <span className="font-semibold text-slate-700">Email federado:</span>
                      <span className="text-blue-600 font-mono">{data.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Estadísticas de Temporada Actual */}
              <div>
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity size={14} className="text-blue-600" />
                  Temporada Actual ({data.temporada_actual}) en FFCV
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 block">
                      {data.partidos?.find((p: any) => p.nombre === 'Jugados')?.valor || "0"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Partidos Jugados</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-2xl sm:text-3xl font-black text-blue-600 block">
                      {data.minutos_totales || "0"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Minutos Oficiales</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600 block">
                      {data.partidos?.find((p: any) => p.nombre === 'Total Goles')?.valor || "0"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Goles FFCV</span>
                  </div>

                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 text-center shadow-xs">
                    <span className="text-2xl sm:text-3xl font-black text-amber-500 block">
                      {data.tarjetas?.find((t: any) => t.nombre === 'Amarillas')?.valor || "0"}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Tarjetas Amarillas</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
                  <div className="bg-slate-100/80 py-1.5 px-2 rounded-xl text-slate-600 font-medium">
                    Titular: <strong className="text-slate-800">{data.partidos?.find((p: any) => p.nombre === 'Titular')?.valor || "0"}</strong>
                  </div>
                  <div className="bg-slate-100/80 py-1.5 px-2 rounded-xl text-slate-600 font-medium">
                    Suplente: <strong className="text-slate-800">{data.partidos?.find((p: any) => p.nombre === 'Suplente')?.valor || "0"}</strong>
                  </div>
                  <div className="bg-slate-100/80 py-1.5 px-2 rounded-xl text-slate-600 font-medium">
                    Rojas: <strong className="text-red-600">{data.tarjetas?.find((t: any) => t.nombre === 'Rojas')?.valor || "0"}</strong>
                  </div>
                </div>
              </div>

              {/* Historial de Clubes y Temporadas Anteriores */}
              <div>
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Trophy size={14} className="text-amber-500" />
                  Historial de Clubes y Temporadas en FFCV
                </h4>

                {(!data.historial_clubes || data.historial_clubes.length === 0) ? (
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 text-center text-slate-400 text-xs font-medium">
                    No consta historial previo en otras temporadas en los registros de la federación.
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
                    {data.historial_clubes.map((h: any, idx: number) => (
                      <div key={idx} className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 hover:bg-slate-50/60 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 font-black text-xs flex items-center justify-center border border-blue-100 shrink-0">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{h.club}</span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {h.temporada}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {h.equipo} • {h.competicion} {h.grupo ? `(${h.grupo})` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto text-xs font-bold text-slate-600">
                          <span className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-150">
                            {h.partidos_jugados} partidos
                          </span>
                          <span className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-150 text-blue-700">
                            {h.minutos}' mins
                          </span>
                          {h.goles > 0 && (
                            <span className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 text-emerald-700 font-black">
                              ⚽ {h.goles}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100/80 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            Solo lectura • Datos oficiales en vivo FFCV
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors shadow-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
