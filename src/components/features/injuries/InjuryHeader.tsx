import React from 'react';
import { X, Activity } from 'lucide-react';

interface InjuryHeaderProps {
  playerName?: string;
  playerNumber?: string | number;
  playerPosition?: string;
  playerAvatarUrl?: string;
  onClose?: () => void;
}

export function InjuryHeader({
  playerName = 'Marco Sanchez',
  onClose,
}: InjuryHeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-[#1c2436] bg-[#0c1017]">
      {/* Lado izquierdo: Icono de pulso verde + Título principal + Breadcrumb */}
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 text-emerald-400">
          <Activity size={18} className="animate-pulse" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-sm sm:text-base font-bold text-white tracking-tight leading-tight">
            Gestión de Lesiones e Historial Médico
          </h1>
          <nav aria-label="Breadcrumb" className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 font-medium">
            <span className="hover:text-slate-300">Dashboard</span>
            <span className="text-slate-600">&gt;</span>
            <span className="hover:text-slate-300">Jugadores</span>
            <span className="text-slate-600">&gt;</span>
            <span className="text-slate-300 font-semibold">{playerName}</span>
            <span className="text-slate-600">&gt;</span>
            <span className="text-slate-400">Físico y Lesiones</span>
          </nav>
        </div>
      </div>

      {/* Lado derecho: Botón Cerrar en caja cuadrada oscura con borde fino */}
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          title="Cerrar módulo"
        >
          <X size={15} />
        </button>
      )}
    </header>
  );
}
