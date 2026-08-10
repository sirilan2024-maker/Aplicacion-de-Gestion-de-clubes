'use client';

import React, { useState, useEffect } from 'react';
import { generatePlayerEvolutionAction } from '@/app/actions/player-evolution-actions';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Player {
  id: string;
  first_name: string;
  last_name: string;
}

interface EvolutionData {
  progress: string;
  physical_behavior: string;
  form: string;
  stats: {
    minutes: number;
    goals: number;
    yellowCards: number;
    redCards: number;
  };
}

export default function PlayerEvolutionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<EvolutionData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPlayers();
    }
  }, [isOpen]);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, first_name, last_name')
        .order('first_name');
      if (error) throw error;
      setPlayers(data || []);
    } catch (err) {
      console.error('Error fetching players:', err);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPlayer) return;
    setLoading(true);
    setError(null);
    setReport(null);
    
    try {
      const res = await generatePlayerEvolutionAction(selectedPlayer);
      if (res.success && res.data) {
        setReport(res.data);
      } else {
        setError(res.error || 'Unknown error occurred');
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with server');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all">
      <div className="bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Evolución de Jugador (AI)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <div className="mb-6 flex gap-4">
            <select
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
            >
              <option value="">Selecciona un jugador...</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
              ))}
            </select>
            <button
              onClick={handleGenerate}
              disabled={!selectedPlayer || loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-medium px-6 py-3 rounded-lg shadow-lg shadow-indigo-500/25 transition-all active:scale-95 flex items-center justify-center min-w-[120px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                'Analizar'
              )}
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 mb-6 flex items-start">
              <svg className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {report && !loading && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Minutos', value: report.stats.minutes, color: 'text-blue-400' },
                  { label: 'Goles', value: report.stats.goals, color: 'text-green-400' },
                  { label: 'TA', value: report.stats.yellowCards, color: 'text-yellow-400' },
                  { label: 'TR', value: report.stats.redCards, color: 'text-red-400' },
                ].map((stat, i) => (
                  <div key={i} className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-center backdrop-blur-sm">
                    <div className="text-slate-400 text-sm font-medium mb-1">{stat.label}</div>
                    <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-xl">
                  <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                    Progreso Táctico
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-sm">{report.progress}</p>
                </div>
                
                <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-xl">
                  <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
                    Comportamiento Físico
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-sm">{report.physical_behavior}</p>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-xl">
                  <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
                    Estado de Forma
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-sm">{report.form}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
