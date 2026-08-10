'use client'

import React, { useState } from 'react';
import { generateClubBigDataAction } from '@/app/actions/club-bigdata-actions';
import { BarChart, Trophy, AlertTriangle, Activity, X } from 'lucide-react';

export default function ClubBigDataModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setLoading(true);
    const res = await generateClubBigDataAction();
    if (res.success) {
      setData(res.data);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800 transition-all">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <BarChart className="text-blue-600 dark:text-blue-400" />
            Big Data Institucional
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8">
          {!data && !loading && (
            <div className="text-center py-12">
              <Activity size={48} className="mx-auto text-blue-300 dark:text-blue-700 mb-4" />
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">Genera un reporte global del rendimiento del club basado en todos los partidos de la temporada actual.</p>
              <button 
                onClick={handleGenerate}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-full transition-all shadow-lg shadow-blue-200 dark:shadow-blue-900/50 flex items-center gap-2 mx-auto"
              >
                <BarChart size={20} />
                Generar Reporte Global
              </button>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-zinc-500 dark:text-zinc-400">Analizando miles de puntos de datos...</p>
            </div>
          )}

          {data && !loading && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                  <div className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Total Equipos</div>
                  <div className="text-3xl font-bold text-zinc-900 dark:text-white">{data.totalTeams}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                  <div className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Partidos</div>
                  <div className="text-3xl font-bold text-zinc-900 dark:text-white">{data.totalMatches}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-700/50 col-span-2">
                  <div className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">Win Rate Global</div>
                  <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{data.overallWinRate}%</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/30">
                  <h3 className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300 mb-2">
                    <Trophy size={18} /> Mejor Equipo
                  </h3>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{data.bestPerformingTeam.name}</div>
                  <div className="text-sm text-emerald-600/80 dark:text-emerald-500">{data.bestPerformingTeam.winRate}% de victorias</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-800/30">
                  <h3 className="flex items-center gap-2 font-semibold text-red-800 dark:text-red-300 mb-2">
                    <AlertTriangle size={18} /> Requiere Atención
                  </h3>
                  <div className="text-xl font-bold text-red-700 dark:text-red-400">{data.worstPerformingTeam.name}</div>
                  <div className="text-sm text-red-600/80 dark:text-red-500">{data.worstPerformingTeam.winRate}% de victorias</div>
                </div>
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-700/50">
                <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Resumen Ejecutivo</h3>
                <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">{data.executiveSummary}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
