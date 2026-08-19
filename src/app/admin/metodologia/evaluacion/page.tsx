"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Filter, Radar, Calendar, ClipboardCheck, X, Loader2, User } from "lucide-react";

interface Player {
  id: string;
  name: string;
  position: string;
  dorsal: string;
  lastEvalDate?: string;
  scores: {
    tecnica: number;
    tactica: number;
    fisica: number;
    cognitiva: number;
    psicosocial: number;
  }
}

export default function EvaluacionJugadoresPage() {
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedSeason, setSelectedSeason] = useState("2023/24");
  const [evaluatingPlayer, setEvaluatingPlayer] = useState<Player | null>(null);

  const mockPlayers: Player[] = [
    {
      id: "1", name: "Carlos Ruiz", position: "Mediocentro", dorsal: "8", lastEvalDate: "2023-10-15",
      scores: { tecnica: 3.5, tactica: 3.2, fisica: 4.0, cognitiva: 3.8, psicosocial: 4.2 }
    },
    {
      id: "2", name: "Mario Sánchez", position: "Extremo", dorsal: "11", lastEvalDate: "2023-11-02",
      scores: { tecnica: 4.2, tactica: 2.8, fisica: 4.5, cognitiva: 3.0, psicosocial: 3.5 }
    }
  ];

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Evaluación de Jugadores</h1>
          <p className="text-slate-500 text-sm mt-1">Gestión de evaluaciones formativas y perfiles de rendimiento</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1 w-full flex items-center gap-3">
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Equipo</label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50">
              <option>Cadete A</option>
              <option>Infantil B</option>
              <option>Juvenil A</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Temporada</label>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50">
              <option>2023/24</option>
              <option>2024/25</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockPlayers.map(player => (
          <div key={player.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-lg border-2 border-blue-200">
                  {getInitials(player.name)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{player.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium text-slate-500">{player.position}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span className="text-xs font-bold text-slate-400">#{player.dorsal}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-4 flex items-center justify-center min-h-[120px] border border-slate-100 relative overflow-hidden">
              <Radar className="w-16 h-16 text-slate-200 absolute opacity-50" />
              <div className="relative z-10 grid grid-cols-2 gap-x-4 gap-y-2 text-xs w-full">
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Téc.</span><span className="font-bold">{player.scores.tecnica}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Tác.</span><span className="font-bold">{player.scores.tactica}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Fís.</span><span className="font-bold">{player.scores.fisica}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Cog.</span><span className="font-bold">{player.scores.cognitiva}</span></div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {player.lastEvalDate ? `Última: ${player.lastEvalDate}` : 'Sin evaluar'}
              </div>
              <button 
                onClick={() => setEvaluatingPlayer(player)}
                className="bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-bold rounded-lg py-1.5 px-3 transition-colors"
              >
                Evaluar
              </button>
            </div>
          </div>
        ))}
      </div>

      {evaluatingPlayer && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-0 w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                  {getInitials(evaluatingPlayer.name)}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Evaluación: {evaluatingPlayer.name}</h3>
                  <p className="text-xs text-slate-500 font-medium">#{evaluatingPlayer.dorsal} • {evaluatingPlayer.position}</p>
                </div>
              </div>
              <button onClick={() => setEvaluatingPlayer(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm border border-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="col-span-2 md:col-span-4">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Periodo de Evaluación</label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>Trimestre 1</option>
                    <option>Trimestre 2</option>
                    <option>Trimestre 3</option>
                    <option>Temporada Completa</option>
                  </select>
                </div>
              </div>

              {/* Module Example */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-2 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div> Técnica Individual
                </h4>
                
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4">
                  <div className="grid md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-4 text-sm font-bold text-slate-800">Control Orientado</div>
                    <div className="md:col-span-8 flex gap-2">
                      {[1,2,3,4].map(level => (
                        <button key={level} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors
                          ${level === 3 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          {level === 1 ? 'No aparece' : level === 2 ? 'Irregular' : level === 3 ? 'Consistente' : 'Automatizado'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-4 text-sm font-bold text-slate-800">Pase (Corto/Medio)</div>
                    <div className="md:col-span-8 flex gap-2">
                      {[1,2,3,4].map(level => (
                        <button key={level} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors
                          ${level === 4 ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                          {level === 1 ? 'No aparece' : level === 2 ? 'Irregular' : level === 3 ? 'Consistente' : 'Automatizado'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2 block">Fortalezas</label>
                  <textarea className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-h-[100px] bg-emerald-50/30" placeholder="Puntos fuertes observados..."></textarea>
                </div>
                <div>
                  <label className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 block">Áreas de Mejora</label>
                  <textarea className="w-full px-3 py-2 border border-amber-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px] bg-amber-50/30" placeholder="Aspectos a desarrollar..."></textarea>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Feedback General</label>
                  <textarea className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" placeholder="Comentarios generales de la evaluación..."></textarea>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-white">
              <button onClick={() => setEvaluatingPlayer(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl py-2.5 px-5">Cancelar</button>
              <button onClick={() => setEvaluatingPlayer(null)} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl py-2.5 px-6 shadow-sm shadow-blue-200 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" /> Guardar Evaluación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
