"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Users, Radar, Target, Trophy, ArrowRight, Loader2, ArrowUpRight } from "lucide-react";

export default function TeamEvaluationsPage() {
  const params = useParams();
  const teamId = params.teamId as string;
  const [loading, setLoading] = useState(false);

  // Mock Data
  const teamStats = {
    name: "Cadete A",
    category: "U15-U16",
    coach: "Míster Pérez",
    sessionsMonth: 12
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
            <Users className="w-4 h-4" /> {teamStats.name} • {teamStats.category}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Evaluaciones del Equipo</h1>
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl py-2.5 px-5 shadow-sm">
          Nueva Evaluación Grupal
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 mb-6">
              <Radar className="w-5 h-5 text-blue-600" /> Perfil Medio del Equipo
            </h2>
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-48 h-48 rounded-full border-4 border-slate-50 relative flex items-center justify-center bg-slate-100 overflow-hidden">
                <Radar className="w-24 h-24 text-slate-300 absolute" />
                <div className="text-center relative z-10 bg-white/80 p-2 rounded-xl backdrop-blur-sm border border-white/50">
                  <span className="text-xs font-bold text-slate-500 block uppercase">Índice Global</span>
                  <span className="text-2xl font-black text-slate-900">3.8</span>
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                {['Técnica', 'Táctica', 'Física', 'Cognitiva'].map((dim, i) => (
                  <div key={dim} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                    <div className="text-xs font-bold text-slate-500 uppercase">{dim}</div>
                    <div className="text-lg font-black text-slate-800 mt-1">
                      {(3.0 + (i * 0.2)).toFixed(1)} <span className="text-xs text-slate-400 font-medium">/ 5.0</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${(3.0 + i*0.2) * 20}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h2 className="text-base font-black text-slate-900">Plantilla y Estado</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs font-bold text-slate-400 uppercase bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-3">Jugador</th>
                    <th className="px-5 py-3">Posición</th>
                    <th className="px-5 py-3 text-center">Global</th>
                    <th className="px-5 py-3 text-center">Última Eval</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[1,2,3,4].map((i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3 font-bold text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">J{i}</div>
                          Jugador {i}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-600">MED</td>
                      <td className="px-5 py-3 text-center font-black text-slate-900">3.{i}</td>
                      <td className="px-5 py-3 text-center text-slate-500 text-xs">hace {i} días</td>
                      <td className="px-5 py-3 text-right">
                        <button className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-lg transition-colors">
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
              <Target className="w-4 h-4 text-emerald-500" /> Objetivos del Equipo
            </h3>
            <div className="space-y-3">
              {[
                "Mejorar salida de balón bajo presión",
                "Compactar líneas en bloque medio",
                "Aumentar efectividad en ABP ofensivas"
              ].map((obj, i) => (
                <div key={i} className="flex gap-3 items-start p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="w-5 h-5 rounded-full border-2 border-slate-300 shrink-0 mt-0.5"></div>
                  <p className="text-sm font-medium text-slate-700">{obj}</p>
                </div>
              ))}
              <button className="w-full mt-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold py-2 rounded-xl transition-colors">
                + Añadir Objetivo
              </button>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 shadow-md text-white relative overflow-hidden">
            <Trophy className="absolute right-[-20px] bottom-[-20px] w-32 h-32 text-blue-500/20" />
            <div className="relative z-10">
              <h3 className="text-sm font-bold text-blue-200 uppercase tracking-wider mb-1">Resumen Mensual</h3>
              <div className="text-3xl font-black mb-1">{teamStats.sessionsMonth}</div>
              <p className="text-sm text-blue-100">Sesiones registradas este mes</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
