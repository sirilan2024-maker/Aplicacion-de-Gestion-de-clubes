"use client";

import React from "react";
import { X, HeartPulse, Calendar, AlertCircle, FileText } from "lucide-react";
import { ActiveInjuryItem } from "@/types/coordinator";

interface InjuryDetailsModalProps {
  injury: ActiveInjuryItem | null;
  onClose: () => void;
}

export function InjuryDetailsModal({ injury, onClose }: InjuryDetailsModalProps) {
  if (!injury) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Cabecera */}
        <div className="px-5 py-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <HeartPulse className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                Parte Médico y Lesión
              </h3>
              <p className="text-[11px] text-slate-500">{injury.teamName} · {injury.teamCategory}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 space-y-4 text-xs">
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Jugador</p>
            <p className="text-sm font-black text-slate-900 mt-0.5">{injury.playerName}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-[10px] font-bold uppercase text-slate-400">Diagnóstico</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">{injury.injuryType}</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60">
              <p className="text-[10px] font-bold uppercase text-slate-400">Gravedad</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mt-1 ${
                injury.severity === 'grave'
                  ? 'bg-red-100 text-red-700'
                  : injury.severity === 'moderada'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {injury.severity}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold">Fecha de Baja</p>
                <p className="font-semibold text-slate-700">{injury.startDate || 'No indicada'}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
              <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[10px] text-slate-400 font-bold">Retorno Estimado</p>
                <p className="font-semibold text-slate-700">{injury.estimatedReturnDate || 'Pendiente de evolución'}</p>
              </div>
            </div>
          </div>

          {injury.observations && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[10px] uppercase">
                <FileText className="w-3.5 h-3.5" /> Observaciones Médicas
              </div>
              <p className="text-slate-700 leading-relaxed text-[11px]">{injury.observations}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
