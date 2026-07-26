"use client";

import React from 'react';
import { Clock, CalendarDays, Goal, TrendingUp, Shield, Activity, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

export interface PlayerStatsData {
  id: string;
  first_name: string;
  last_name: string;
  posicion_principal?: string;
  posicion?: string;
  dorsal?: number;
  minutes_played: number;
  matches_called: number;
  attendance_percentage: number;
  goals: number;
  average_performance: number | null;
  yellow_cards: number;
  red_cards: number;
  perf_trends: { name: string; value: number }[];
}

interface PlayerStatsModalProps {
  player: PlayerStatsData;
  onClose: () => void;
}

export function PlayerStatsModal({ player, onClose }: PlayerStatsModalProps) {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg shadow-sm border border-blue-200">
              {player.first_name?.charAt(0) || ''}{player.last_name?.charAt(0) || ''}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-tight">
                {player.first_name} {player.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                  {player.posicion_principal || player.posicion || 'Jugador'}
                </span>
                {player.dorsal && (
                  <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">
                    Dorsal: {player.dorsal}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-8">
          
          {/* Highlight Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Minutos Jugados</span>
                <Clock size={16} className="text-blue-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">{player.minutes_played}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">En {player.matches_called} convocatorias</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Asistencia Entr.</span>
                <CalendarDays size={16} className="text-emerald-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">{player.attendance_percentage}%</div>
              <div className="text-xs font-medium text-slate-500 mt-1">De todas las sesiones</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Goles Oficiales</span>
                <Goal size={16} className="text-amber-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">{player.goals}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Goles anotados</div>
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rendimiento Medio</span>
                <TrendingUp size={16} className="text-purple-500" />
              </div>
              <div className="text-3xl font-black text-slate-900">{player.average_performance ?? '-'}</div>
              <div className="text-xs font-medium text-slate-500 mt-1">Puntuación 1-10</div>
            </div>
          </div>

          {/* Charts & Discipline */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Discipline Card */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 col-span-1">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                <Shield size={18} className="text-slate-500" />
                Disciplina
              </h3>
              <div className="space-y-4">
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-6 bg-yellow-400 rounded-sm shadow-sm" />
                    <span className="font-semibold text-slate-700">Tarjetas Amarillas</span>
                  </div>
                  <span className="text-xl font-black text-slate-900">{player.yellow_cards}</span>
                </div>
                <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-6 bg-red-500 rounded-sm shadow-sm" />
                    <span className="font-semibold text-slate-700">Tarjetas Rojas</span>
                  </div>
                  <span className="text-xl font-black text-slate-900">{player.red_cards}</span>
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 col-span-1 lg:col-span-2 shadow-sm">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
                <Activity size={18} className="text-slate-500" />
                Evolución del Rendimiento
              </h3>
              {player.perf_trends && player.perf_trends.length > 0 ? (
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={player.perf_trends}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        domain={[0, 10]}
                        dx={-10}
                      />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                        cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        name="Puntuación"
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[200px] w-full flex items-center justify-center flex-col text-slate-400">
                  <Activity size={32} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">No hay datos de rendimiento registrados</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
