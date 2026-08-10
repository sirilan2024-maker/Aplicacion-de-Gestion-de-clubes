'use client';

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Activity, ShieldAlert, HeartPulse, User } from 'lucide-react';
import { generateFatigueAlertAction, FatigueAlertPlayer } from '@/app/actions/fatigue-alert-actions';

interface FatigueAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function FatigueAlertModal({ isOpen, onClose }: FatigueAlertModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<FatigueAlertPlayer[] | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadReport();
    }
  }, [isOpen]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    setReport(null);

    const result = await generateFatigueAlertAction();
    if (result.success && result.data) {
      setReport(result.data);
    } else {
      setError(result.error || "Error al cargar la alerta de fatiga.");
    }
    setLoading(false);
  };

  const handleClose = () => {
    setReport(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={handleClose}>
      <div 
        className="relative w-full max-w-4xl bg-zinc-950/90 backdrop-blur-2xl border border-rose-500/20 text-white rounded-3xl shadow-[0_0_50px_-12px_rgba(244,63,94,0.3)] overflow-hidden p-0 transition-all duration-300 animate-in zoom-in-95" 
        onClick={e => e.stopPropagation()}
      >
        
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-red-500/10 pointer-events-none" />
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-rose-500/20 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="p-8 relative z-10 flex flex-col max-h-[85vh]">
          <header className="mb-6 flex-shrink-0">
            <h2 className="text-4xl font-black flex items-center gap-4 bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-red-300 tracking-tight">
              <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
                <HeartPulse className="w-8 h-8 text-rose-400" />
              </div>
              Alerta de Fatiga y Riesgo
            </h2>
            <p className="text-zinc-400 text-lg mt-3 font-medium">
              Monitorización automática de sobrecarga de minutos y prevención de lesiones musculares.
            </p>
          </header>

          <div className="overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-[400px]">
            {loading && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-60 mt-20">
                <Loader2 className="w-16 h-16 mb-4 animate-spin stroke-[1.5] text-rose-500" />
                <p className="text-xl">Analizando cargas de jugadores...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-5 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2 backdrop-blur-md">
                <ShieldAlert className="w-6 h-6 flex-shrink-0" />
                <p className="text-lg font-medium">{error}</p>
              </div>
            )}

            {report && report.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-60 mt-20">
                <Activity className="w-16 h-16 mb-4 stroke-[1.5] text-emerald-500" />
                <p className="text-xl text-emerald-400 font-medium">Todos los jugadores están en óptimas condiciones.</p>
                <p className="text-sm">Ningún jugador supera el umbral de fatiga crítico.</p>
              </div>
            )}

            {report && report.length > 0 && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-4">
                {report.map((player) => (
                  <div key={player.id} className={`p-6 rounded-2xl border backdrop-blur-md flex items-center justify-between transition-colors ${
                    player.riskLevel === 'Extremo' ? 'bg-rose-500/10 border-rose-500/30 hover:border-rose-500/50' : 
                    player.riskLevel === 'Alto' ? 'bg-amber-500/10 border-amber-500/30 hover:border-amber-500/50' : 
                    'bg-yellow-500/5 border-yellow-500/20 hover:border-yellow-500/40'
                  }`}>
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                        player.riskLevel === 'Extremo' ? 'bg-rose-500/20 text-rose-400' : 
                        player.riskLevel === 'Alto' ? 'bg-amber-500/20 text-amber-400' : 
                        'bg-yellow-500/10 text-yellow-500'
                      }`}>
                        <User className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className="text-xl font-bold text-white flex items-center gap-2">
                          {player.name}
                          <span className="text-xs font-black uppercase px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {player.category}
                          </span>
                        </h4>
                        <p className={`text-sm mt-1 font-medium ${
                          player.riskLevel === 'Extremo' ? 'text-rose-400' : 
                          player.riskLevel === 'Alto' ? 'text-amber-400' : 'text-yellow-500'
                        }`}>
                          {player.recommendation}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-3xl font-black text-white">
                        {player.minutesPlayed}<span className="text-zinc-500 text-lg font-medium ml-1">min</span>
                      </div>
                      <div className={`text-xs font-black uppercase tracking-wider mt-1 ${
                        player.riskLevel === 'Extremo' ? 'text-rose-500' : 
                        player.riskLevel === 'Alto' ? 'text-amber-500' : 'text-yellow-500'
                      }`}>
                        Riesgo {player.riskLevel}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
