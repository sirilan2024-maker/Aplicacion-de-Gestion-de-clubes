"use client"

import { useState } from "react"
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Clock, Calendar, CheckSquare, Sparkles, Loader2 } from "lucide-react"
import { generateMultiMatchTrendsAction } from "@/app/actions/match-ai-report-actions"
import { Button } from "@/components/ui/button"
import { toast } from "react-hot-toast"

interface MatchOption {
  id: string
  fecha_hora: string
  rival_nombre: string
  resultado_propio: number | null
  resultado_rival: number | null
  estado: string
}

export function MatchTrendsModal({
  allMatches = [],
  currentMatchId,
  onClose
}: {
  allMatches: MatchOption[]
  currentMatchId?: string
  onClose: () => void
}) {
  const matchesList = Array.isArray(allMatches) ? allMatches : [];
  // Por defecto seleccionar los partidos finalizados
  const finishedMatches = matchesList.filter(m => m && (m.estado === "Finalizado" || (m.resultado_propio !== null && m.resultado_rival !== null)));
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    if (finishedMatches.length > 0) {
      return finishedMatches.slice(-5).map(m => m.id);
    }
    return matchesList.slice(0, 5).map(m => m.id);
  });

  const [isPending, setIsPending] = useState(false);
  const [trendsData, setTrendsData] = useState<any>(null);
  const [historyReports, setHistoryReports] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem("match_trends_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const toggleSelectAll = () => {
    if (selectedIds.length === finishedMatches.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(finishedMatches.map(m => m.id));
    }
  };

  const toggleSelectMatch = (id: string) => {
    setSelectedIds(prev => {
      const current = Array.isArray(prev) ? prev : [];
      return current.includes(id) ? current.filter(item => item !== id) : [...current, id];
    });
  };

  const selectLastN = async (n: number) => {
    const list = finishedMatches.length > 0 ? finishedMatches : matchesList;
    const sortedList = [...list].sort((a, b) => new Date(a.fecha_hora).getTime() - new Date(b.fecha_hora).getTime());
    const newIds = sortedList.slice(-n).map(m => m.id);
    setSelectedIds(newIds);
    // Generar automáticamente al seleccionar el número de partidos
    if (newIds.length > 0) {
      setIsPending(true);
      try {
        const res = await generateMultiMatchTrendsAction(newIds);
        if (res.success && res.data) {
          setTrendsData(res.data);
          toast.success("¡Tendencias actualizadas!");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsPending(false);
      }
    }
  };

  const handleGenerateTrends = async () => {
    if (selectedIds.length === 0) {
      toast.error("Selecciona al menos un partido para el análisis.");
      return;
    }

    setIsPending(true);
    try {
      const res = await generateMultiMatchTrendsAction(selectedIds);
      if (res.success && res.data) {
        setTrendsData(res.data);
        // Guardar informe en el historial por fechas
        const newRecord = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
          matchesCount: res.data.matchesCount,
          data: res.data
        };
        const safeHistory = Array.isArray(historyReports) ? historyReports : [];
        const updatedHistory = [newRecord, ...safeHistory.slice(0, 19)];
        setHistoryReports(updatedHistory);
        try {
          localStorage.setItem("match_trends_history", JSON.stringify(updatedHistory));
        } catch (e) {
          console.error(e);
        }
        toast.success("¡Tendencias analizadas e informe guardado en el historial!");
      } else {
        toast.error(res.error || "No se pudo generar el análisis.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error inesperado al generar tendencias.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Inteligencia y Tendencias Tácticas Multi-Partido</h2>
              <p className="text-xs text-indigo-200 font-medium">Análisis evolutivo por tramos de 15' e identificación de patrones de juego</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Historial rápido por fecha si existe */}
        {Array.isArray(historyReports) && historyReports.length > 0 && (
          <div className="bg-indigo-900/90 text-indigo-100 px-6 py-2 border-b border-indigo-800 flex items-center gap-3 overflow-x-auto text-xs">
            <span className="font-black uppercase tracking-wider text-[10px] text-indigo-300 shrink-0">Historial por fechas:</span>
            {historyReports.map(rep => (
              <button
                key={rep.id}
                type="button"
                onClick={() => {
                  setTrendsData(rep.data);
                  toast.success(`Cargado informe generado el ${rep.timestamp}`);
                }}
                className="bg-indigo-800/80 hover:bg-indigo-700 px-2.5 py-1 rounded-md text-[11px] font-bold shrink-0 transition-colors border border-indigo-700/50 flex items-center gap-1.5"
              >
                <span>📅 {rep.timestamp}</span>
                <span className="opacity-75">({rep.matchesCount} partidos)</span>
              </button>
            ))}
          </div>
        )}

        {/* Body Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/50">
          
          {/* Selector de Partidos */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Seleccionar Partidos a Comparar ({selectedIds.length} seleccionados)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectLastN(3)}
                  className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg border transition-colors"
                >
                  Últimos 3
                </button>
                <button
                  type="button"
                  onClick={() => selectLastN(5)}
                  className="text-[11px] font-bold px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg border transition-colors"
                >
                  Últimos 5
                </button>

                {/* Casilla personalizable para N partidos */}
                <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5">
                  <span className="text-[11px] font-bold text-slate-600">Últimos:</span>
                  <input
                    type="number"
                    min="1"
                    max={finishedMatches.length || 20}
                    defaultValue="4"
                    id="custom-n-matches-input"
                    className="w-10 text-center font-bold text-xs bg-white border border-slate-300 rounded outline-none py-0.5"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const inputEl = document.getElementById("custom-n-matches-input") as HTMLInputElement;
                      if (!inputEl) return;
                      const val = parseInt(inputEl.value) || 1;
                      selectLastN(val);
                    }}
                    className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-100 hover:bg-indigo-200 px-1.5 py-0.5 rounded transition-colors"
                  >
                    Aplicar
                  </button>
                </div>

                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="text-[11px] font-bold px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg transition-colors"
                >
                  {selectedIds.length === finishedMatches.length ? "Desmarcar Todos" : "Seleccionar Todos"}
                </button>
              </div>
            </div>

            {/* Grid de partidos (Ordenados: los más recientes al principio) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {finishedMatches.length === 0 && matchesList.length === 0 && (
                <div className="col-span-full p-6 text-center bg-slate-50 border border-slate-200 border-dashed rounded-xl flex flex-col items-center gap-2">
                  <Calendar className="w-6 h-6 text-slate-400" />
                  <p className="text-sm font-bold text-slate-500">No hay partidos registrados para analizar.</p>
                </div>
              )}
              {([...(finishedMatches.length > 0 ? finishedMatches : matchesList)])
                .sort((a, b) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime())
                .map(m => {
                  const isSelected = selectedIds.includes(m.id);
                  const formattedDate = m.fecha_hora ? new Date(m.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

                  return (
                    <div
                      key={m.id}
                      onClick={() => toggleSelectMatch(m.id)}
                      className={`cursor-pointer p-3 rounded-xl border text-xs transition-all flex flex-col justify-between gap-2 ${
                        isSelected
                          ? "bg-indigo-50/90 border-indigo-500 text-indigo-950 font-bold shadow-sm ring-2 ring-indigo-400"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-black text-sm text-slate-900 leading-tight flex-1" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                          {m.rival_nombre || 'Rival Sin Nombre'}
                        </p>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-slate-100"
                        }`}>
                          {isSelected && <CheckSquare className="w-3 h-3" />}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-slate-100/80">
                        {formattedDate ? (
                          <span className="text-xs font-black text-indigo-950 bg-indigo-200 px-2.5 py-1 rounded-md border border-indigo-300 shrink-0">
                            📅 {formattedDate}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-slate-500">Sin Fecha</span>
                        )}
                        <span className="text-xs font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {m.resultado_propio ?? 0} - {m.resultado_rival ?? 0}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                onClick={handleGenerateTrends}
                disabled={isPending || selectedIds.length === 0}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md shadow-indigo-200"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Sparkles className="w-4 h-4" />}
                {isPending ? "Analizando Patrones..." : "Generar Análisis de Tendencias"}
              </Button>
            </div>
          </div>

          {/* Resultados de Tendencias */}
          {isPending && (
            <div className="p-12 flex flex-col items-center justify-center gap-4 bg-white rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-bold text-slate-600">Procesando y buscando patrones tácticos...</p>
            </div>
          )}
          
          {!isPending && trendsData && (
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Gráficos de tramos de 15 minutos */}
              <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Distribución de Goles por Tramos de 15 Minutos
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Goles A Favor</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> Goles Encajados</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 pt-2">
                  {(trendsData.timeSlots || []).map((slot: any, idx: number) => {
                    const maxVal = Math.max(1, ...(trendsData.timeSlots || []).map((s: any) => Math.max(s.ownGoals, s.rivalGoals)));
                    const ownHeight = (slot.ownGoals / maxVal) * 100;
                    const rivalHeight = (slot.rivalGoals / maxVal) * 100;

                    return (
                      <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-150 flex flex-col items-center justify-between text-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase">{slot.label}</span>
                        
                        <div className="w-full h-24 flex items-end justify-center gap-2 px-1 border-b border-slate-200 pb-1">
                          <div 
                            className="w-3.5 bg-emerald-500 hover:bg-emerald-600 rounded-t transition-all duration-500 relative group"
                            style={{ height: `${Math.max(10, ownHeight)}%` }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-emerald-700">
                              {slot.ownGoals}
                            </span>
                          </div>

                          <div 
                            className="w-3.5 bg-red-500 hover:bg-red-600 rounded-t transition-all duration-500 relative group"
                            style={{ height: `${Math.max(10, rivalHeight)}%` }}
                          >
                            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black text-red-700">
                              {slot.rivalGoals}
                            </span>
                          </div>
                        </div>

                        <div className="text-[10px] font-bold text-slate-600">
                          {slot.ownGoals} GF / {slot.rivalGoals} GC
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Patrones Tácticos Detectados */}
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-5 space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Patrones y Diagnóstico Táctico Detectado
                </h3>
                <div className="space-y-2">
                  {(trendsData.patterns || []).map((pat: string, idx: number) => (
                    <div key={idx} className="bg-white/80 p-3 rounded-lg border border-amber-100 text-xs font-medium text-amber-950">
                      {pat.replace(/\*\*(.*?)\*\*/g, '$1')}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dictamen Redactado de la IA */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-indigo-700 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Dictamen Ejecutivo e Instrucciones para Entrenamientos
                </h3>
                <div className="whitespace-pre-line text-xs font-medium text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {trendsData.reportText}
                </div>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <Button variant="outline" onClick={onClose} className="font-bold text-slate-700">
            Cerrar
          </Button>
        </div>

      </div>
    </div>
  )
}
