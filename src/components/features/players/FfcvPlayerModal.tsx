"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, Trophy, Calendar, Award, User, AlertCircle, 
  ExternalLink, Loader2, X, Activity, Clock, Layers,
  Star, Crown, Target, Flame, Medal, Sparkles
} from "lucide-react";

interface FfcvPlayerModalProps {
  playerId: string;
  playerName: string;
  isOpen: boolean;
  onClose: () => void;
  isLigaBrave?: boolean;
}

export function FfcvPlayerModal({ playerId, playerName, isOpen, onClose, isLigaBrave = false }: FfcvPlayerModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const isBrave = Boolean(isLigaBrave || data?.is_liga_brave);

  useEffect(() => {
    if (isOpen && playerId) {
      fetchFfcvInfo();
    }
  }, [isOpen, playerId]);

  const fetchFfcvInfo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ffcv-player-info?playerId=${playerId}&_t=${Date.now()}`, { cache: "no-store" });
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
        <div className={`text-white p-5 sm:p-6 relative shrink-0 ${
          isBrave
            ? "bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900"
            : "bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900"
        }`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
          
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border ${
              isBrave 
                ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-300"
                : "bg-blue-500/20 border-blue-400/30 text-blue-300"
            }`}>
              {isBrave ? <Award className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full border ${
                  isBrave
                    ? "bg-emerald-500/30 text-emerald-200 border-emerald-400/20"
                    : "bg-blue-500/30 text-blue-200 border-blue-400/20"
                }`}>
                  {isBrave ? "Liga Brave · Asociación de Fútbol Base" : "Federació de Futbol Comunitat Valenciana"}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {isBrave ? "Ficha Oficial Liga Brave" : "Ficha Federativa FFCV"}
              </h2>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-center">
              <Loader2 className={`w-10 h-10 animate-spin mb-3 ${isBrave ? "text-emerald-600" : "text-blue-600"}`} />
              <p className="font-bold text-slate-700 text-base">
                {isBrave ? "Consultando base de datos oficial Liga Brave..." : "Consultando base de datos oficial FFCV..."}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {isBrave ? "Obteniendo ficha en tiempo real, actas y estadísticas oficiales." : "Obteniendo ficha en tiempo real, estadísticas e historial de clubes."}
              </p>
            </div>
          ) : error ? (
            <div className="py-12 px-4 text-center max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center mx-auto mb-3">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-base font-bold text-slate-800">{isBrave ? "Información Liga Brave" : "Información Federativa"}</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{error}</p>
              <div className="mt-4 p-3 bg-white rounded-xl border border-slate-200 text-left text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">Nota informativa:</p>
                <p>{isBrave ? "• Los datos provienen de los registros oficiales de la Liga Brave." : "• Los datos provienen en vivo de la FFCV."}</p>
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
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">{isBrave ? "Cod. Ficha / Licencia" : "Cod. Ficha FFCV"}</span>
                      <span className="font-extrabold text-slate-800">{data.codjugador}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">{isBrave ? "Posición" : "Posición FFCV"}</span>
                      <span className="font-extrabold text-slate-800 truncate block">{data.posicion || "Sin definir"}</span>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-150 col-span-2 sm:col-span-1">
                      <span className="text-slate-400 font-bold block text-[10px] uppercase">Categoría</span>
                      <span className="font-extrabold text-slate-800 truncate block">{data.categoria || (isBrave ? "Liga Brave" : "Federado")}</span>
                    </div>
                  </div>

                  {data.email && (
                    <div className="mt-2.5 text-xs text-slate-500 flex items-center justify-center sm:justify-start gap-1.5">
                      <span className="font-semibold text-slate-700">{isBrave ? "Email de contacto:" : "Email federado:"}</span>
                      <span className="text-blue-600 font-mono">{data.email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tarjeta Fantasy & Logros Liga Brave */}
              {isBrave && (data.brave_fantasy || data.puntos_totales != null || data.valor_mercado) && (
                <div className="bg-gradient-to-br from-emerald-950 via-teal-950 to-slate-900 rounded-3xl p-5 sm:p-6 border border-emerald-500/30 text-white shadow-xl relative overflow-hidden space-y-5">
                  {/* Fondo decorativo con resplandor */}
                  <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                  
                  {/* Cabecera Fantasy con Valoración */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1.5">
                          <Sparkles size={12} className="text-emerald-300" /> Rendimiento Fantasy Liga Brave
                        </span>
                        {data.brave_fantasy?.veces_mvp > 0 && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                            <Crown size={12} className="text-amber-300" /> {data.brave_fantasy.veces_mvp} MVP
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-black text-white mt-1.5 flex items-center gap-2">
                        <span>Ficha Técnica y Cotización Oficial</span>
                      </h4>
                    </div>

                    {(data.valor_mercado || data.brave_fantasy?.valor_mercado) && (
                      <div className="self-start sm:self-auto bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-400/40 rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-inner">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/30 border border-emerald-400/40 flex items-center justify-center text-emerald-300 font-black text-base">
                          €
                        </div>
                        <div>
                          <span className="text-[9px] font-extrabold text-emerald-300/80 uppercase block tracking-wider">Valor de Mercado</span>
                          <span className="text-base sm:text-lg font-black text-emerald-200">
                            {data.valor_mercado || data.brave_fantasy?.valor_mercado}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Métricas Principales */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10">
                    <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-2xl p-3 backdrop-blur-md border border-white/10 text-center">
                      <span className="text-2xl sm:text-3xl font-black text-white block">
                        {data.puntos_totales ?? data.brave_fantasy?.puntos_totales ?? "-"}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wide">Puntos Totales</span>
                    </div>

                    <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-2xl p-3 backdrop-blur-md border border-white/10 text-center">
                      <span className="text-2xl sm:text-3xl font-black text-white block">
                        {data.puntos_media ?? data.brave_fantasy?.puntos_media ?? "-"}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wide">Puntuación Media</span>
                    </div>

                    <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-2xl p-3 backdrop-blur-md border border-white/10 text-center">
                      <span className="text-2xl sm:text-3xl font-black text-emerald-300 block">
                        {data.partidos?.find((p: any) => p.nombre === 'Total Goles')?.valor || data.brave_fantasy?.goles || 0}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wide">Goles</span>
                    </div>

                    <div className="bg-white/10 hover:bg-white/15 transition-colors rounded-2xl p-3 backdrop-blur-md border border-white/10 text-center">
                      <span className="text-2xl sm:text-3xl font-black text-teal-300 block">
                        {data.asistencias ?? data.brave_fantasy?.asistencias ?? 0}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-wide">Asistencias</span>
                    </div>
                  </div>

                  {/* Vitrina de Galardones e Insignias */}
                  {data.brave_fantasy?.logros && data.brave_fantasy.logros.length > 0 && (
                    <div className="space-y-2.5 relative z-10 pt-2 border-t border-white/10">
                      <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                        <Trophy size={14} className="text-amber-400" /> Galardones & Insignias Oficiales
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {data.brave_fantasy.logros.map((logro: any, idx: number) => {
                          const isOnce = logro.id === 'once_ideal';
                          const isMvp = logro.id === 'mvp';
                          const isAsist = logro.id === 'asistente';
                          const isGol = logro.id === 'goleador';

                          return (
                            <div 
                              key={idx}
                              className={`p-3 rounded-2xl border flex items-center gap-3 transition-all ${
                                isOnce 
                                  ? 'bg-amber-500/15 border-amber-400/30 text-amber-100 shadow-sm'
                                  : isMvp 
                                  ? 'bg-purple-500/15 border-purple-400/30 text-purple-100 shadow-sm'
                                  : isAsist
                                  ? 'bg-blue-500/15 border-blue-400/30 text-blue-100 shadow-sm'
                                  : isGol
                                  ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-100 shadow-sm'
                                  : 'bg-cyan-500/15 border-cyan-400/30 text-cyan-100 shadow-sm'
                              }`}
                            >
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                isOnce 
                                  ? 'bg-amber-500/30 border-amber-400/40 text-amber-300'
                                  : isMvp 
                                  ? 'bg-purple-500/30 border-purple-400/40 text-purple-300'
                                  : isAsist
                                  ? 'bg-blue-500/30 border-blue-400/40 text-blue-300'
                                  : isGol
                                  ? 'bg-emerald-500/30 border-emerald-400/40 text-emerald-300'
                                  : 'bg-cyan-500/30 border-cyan-400/40 text-cyan-300'
                              }`}>
                                {isOnce ? <Star size={18} className="fill-amber-400 text-amber-400" /> :
                                 isMvp ? <Crown size={18} className="text-purple-300" /> :
                                 isAsist ? <Target size={18} className="text-blue-300" /> :
                                 isGol ? <Flame size={18} className="text-emerald-300" /> :
                                 <Medal size={18} className="text-cyan-300" />}
                              </div>

                              <div className="min-w-0 flex-1">
                                <h5 className="font-extrabold text-xs text-white truncate">
                                  {logro.titulo}
                                </h5>
                                <p className="text-[11px] opacity-80 leading-tight mt-0.5 truncate">
                                  {logro.subtitulo}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Desglose de Puntos Partido a Partido */}
                  {data.brave_fantasy?.partidos_puntuados && data.brave_fantasy.partidos_puntuados.length > 0 && (
                    <div className="space-y-2.5 relative z-10 pt-2 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                          <Activity size={14} className="text-emerald-400" /> Puntuación Partido a Partido
                        </span>
                        <span className="text-[10px] text-slate-300/80">
                          {data.brave_fantasy.partidos_puntuados.length} {data.brave_fantasy.partidos_puntuados.length === 1 ? 'partido calificado' : 'partidos calificados'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {data.brave_fantasy.partidos_puntuados.map((p: any, idx: number) => {
                          const isTop = p.puntos >= 7;
                          const isGood = p.puntos >= 5 && p.puntos < 7;

                          return (
                            <div 
                              key={idx}
                              className="bg-white/10 hover:bg-white/15 transition-colors p-3 rounded-2xl border border-white/10 flex items-center justify-between gap-2.5"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-white/15 text-emerald-200">
                                    J{p.jornada}
                                  </span>
                                  {p.once_ideal && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-500/30 text-amber-300 border border-amber-400/30 flex items-center gap-0.5">
                                      <Star size={9} className="fill-amber-300 text-amber-300" /> Once Ideal
                                    </span>
                                  )}
                                  {p.es_mvp && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-purple-500/30 text-purple-300 border border-purple-400/30 flex items-center gap-0.5">
                                      <Crown size={9} /> MVP
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-bold text-white mt-1 truncate">
                                  vs {p.rival}
                                </p>
                                <p className="text-[10px] text-slate-300/70 mt-0.5">
                                  {p.fecha} {p.resultado ? `• Res: ${p.resultado}` : ''}
                                </p>
                              </div>

                              <div className="shrink-0 text-right">
                                <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm shadow-md ${
                                  isTop 
                                    ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white border border-emerald-300/40' 
                                    : isGood 
                                    ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white border border-blue-300/40' 
                                    : 'bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 font-black border border-amber-300/40'
                                }`}>
                                  {p.puntos}
                                </span>
                                <span className="block text-[8px] font-bold text-slate-300/80 uppercase mt-0.5 text-center">
                                  {isTop ? 'Excelente' : isGood ? 'Bueno' : 'Regular'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Últimos Resultados de fallback si no hay partidos_puntuados */}
                  {(!data.brave_fantasy?.partidos_puntuados || data.brave_fantasy.partidos_puntuados.length === 0) && data.ultimos_resultados && data.ultimos_resultados.length > 0 && (
                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs relative z-10">
                      <span className="text-emerald-300 font-bold">Últimos Resultados:</span>
                      <div className="flex gap-1.5">
                        {data.ultimos_resultados.map((res: string, i: number) => (
                          <span key={i} className="px-2 py-0.5 rounded-md bg-white/15 text-white font-mono font-bold text-xs">
                            {res}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Estadísticas de Temporada Actual */}
              <div>
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Activity size={14} className={isBrave ? "text-emerald-600" : "text-blue-600"} />
                  Temporada Actual ({data.temporada_actual}) en {isBrave ? "Liga Brave" : "FFCV"}
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{isBrave ? "Goles Liga Brave" : "Goles FFCV"}</span>
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
                  Historial de Clubes y Temporadas {isBrave ? "(Liga Brave / FFCV)" : "en FFCV"}
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
                          <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 shrink-0 p-1 flex items-center justify-center overflow-hidden shadow-2xs">
                            {h.escudo ? (
                              <img
                                src={h.escudo}
                                alt={h.club || 'Escudo'}
                                className="w-full h-full object-contain drop-shadow-2xs"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                  const parent = (e.target as HTMLElement).parentElement;
                                  if (parent) {
                                    parent.innerHTML = `<span class="text-xs font-black text-slate-500">${idx + 1}</span>`;
                                  }
                                }}
                              />
                            ) : (
                              <span className="text-xs font-black text-slate-500">{idx + 1}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900">{h.club}</span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {h.temporada}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {h.equipo && h.club && h.equipo.trim().toLowerCase() !== h.club.trim().toLowerCase()
                                ? `${h.equipo} • `
                                : ''}
                              {h.competicion || h.categoria || 'Competición FFCV'} {h.grupo ? `(${h.grupo})` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto text-xs font-bold text-slate-600">
                          {h.partidos_jugados > 0 && (
                            <span className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-150">
                              {h.partidos_jugados} {h.partidos_jugados === 1 ? 'partido' : 'partidos'}
                            </span>
                          )}
                          {h.minutos > 0 && (
                            <span className="bg-slate-50 px-2 py-1 rounded-lg border border-slate-150 text-blue-700">
                              {h.minutos}' mins
                            </span>
                          )}
                          {h.goles > 0 && (
                            <span className="bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 text-emerald-700 font-black">
                              ⚽ {h.goles}
                            </span>
                          )}
                          {(!h.partidos_jugados || h.partidos_jugados === 0) && (!h.minutos || h.minutos === 0) && (
                            <span className="text-[11px] font-medium text-slate-400 bg-slate-50/80 px-2 py-0.5 rounded-md border border-slate-100">
                              {isBrave ? "Historial Oficial" : "Historial FFCV"}
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
            <Shield className={`w-3.5 h-3.5 ${isBrave ? "text-emerald-600" : "text-blue-600"}`} />
            Solo lectura • {isBrave ? "Datos oficiales en vivo Liga Brave" : "Datos oficiales en vivo FFCV"}
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
