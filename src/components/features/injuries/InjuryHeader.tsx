import React from 'react';
import { X, Activity } from 'lucide-react';

interface InjuryHeaderProps {
  playerName?: string;
  playerNumber?: string | number;
  playerPosition?: string;
  playerAvatarUrl?: string;
  isInjured?: boolean;
  onClose?: () => void;
}

export function InjuryHeader({
  playerName = 'Marco Sánchez',
  playerNumber = '#8',
  playerPosition = 'Centrocampista',
  playerAvatarUrl,
  isInjured = true,
  onClose,
}: InjuryHeaderProps) {
  const displayNum = String(playerNumber).startsWith('#') ? playerNumber : `#${playerNumber}`;

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md shrink-0">
      {/* Lado izquierdo: Foto fotorrealista + Nombre + Dorsal + Demarcación */}
      <div className="flex items-center gap-4">
        <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-emerald-500/30 bg-slate-800 shadow-inner flex items-center justify-center shrink-0">
          {playerAvatarUrl ? (
            <img
              src={playerAvatarUrl}
              alt={playerName}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center text-slate-300 font-black text-sm">
              {playerName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="absolute inset-0 ring-1 ring-inset ring-white/10 rounded-full pointer-events-none" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {playerName}
            </h1>
            <span className="text-xs sm:text-sm font-black text-emerald-400 font-mono tracking-wider">
              {displayNum}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {playerPosition}
          </span>
        </div>
      </div>

      {/* Lado derecho: Estado de disponibilidad (LESIONADO en rojo coral) + Botón Cerrar */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-300 shadow-sm shadow-rose-950/50">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <span className="text-xs font-black tracking-wider uppercase">
              {isInjured ? 'LESIONADO' : 'DISPONIBLE'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium mt-1">
            Estado de disponibilidad
          </span>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-700 ml-2"
            title="Cerrar módulo"
          >
            <X size={18} />
          </button>
        )}
      </div>
    </header>
  );
}
