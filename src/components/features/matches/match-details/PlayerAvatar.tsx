"use client"

import { useState } from "react"

export interface PlayerAvatarProps {
  player: {
    first_name?: string
    last_name?: string
    posicion?: string
    posicion_principal?: string
    photo_url?: string | null
    avatar_url?: string | null
    foto_url?: string | null
    image_url?: string | null
    dorsal?: string | number | null
  }
  dorsal?: string | number | null
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
  showDorsalBadge?: boolean
}

export function getPositionTheme(pos?: string) {
  const p = (pos || '').toLowerCase();
  if (p.includes('porter') || p.includes('por') || p.includes('arquero')) {
    return {
      gradient: 'from-emerald-500 to-teal-700',
      ring: 'ring-emerald-200',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeSolid: 'bg-emerald-600 text-white',
      code: 'POR',
      label: 'Portero'
    };
  }
  if (p.includes('defens') || p.includes('def') || p.includes('lateral') || p.includes('central')) {
    return {
      gradient: 'from-blue-600 to-indigo-700',
      ring: 'ring-blue-200',
      badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
      badgeSolid: 'bg-blue-600 text-white',
      code: 'DEF',
      label: 'Defensa'
    };
  }
  if (p.includes('medio') || p.includes('centroc') || p.includes('pivote') || p.includes('interior')) {
    return {
      gradient: 'from-amber-500 to-orange-600',
      ring: 'ring-amber-200',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeSolid: 'bg-amber-600 text-white',
      code: 'MED',
      label: 'Medio'
    };
  }
  if (p.includes('delant') || p.includes('del') || p.includes('extremo') || p.includes('punta')) {
    return {
      gradient: 'from-rose-500 to-red-600',
      ring: 'ring-rose-200',
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeSolid: 'bg-rose-600 text-white',
      code: 'DEL',
      label: 'Delantero'
    };
  }
  return {
    gradient: 'from-slate-700 to-slate-900',
    ring: 'ring-slate-200',
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeSolid: 'bg-slate-800 text-white',
    code: 'JUG',
    label: 'Jugador'
  };
}

export function PlayerAvatar({
  player,
  dorsal,
  size = "md",
  className = "",
  showDorsalBadge = true
}: PlayerAvatarProps) {
  const [imageError, setImageError] = useState(false);

  const photoUrl = player.photo_url || player.avatar_url || player.foto_url || player.image_url;
  const pos = player.posicion || player.posicion_principal || '';
  const theme = getPositionTheme(pos);
  const effectiveDorsal = dorsal ?? player.dorsal;

  const initials = `${player.first_name?.[0] || ''}${player.last_name?.[0] || ''}`.toUpperCase() || '?';

  const sizeStyles = {
    sm: {
      box: 'w-7 h-7 text-[10px]',
      badge: 'min-w-[14px] h-3.5 px-0.5 text-[8px] -bottom-0.5 -right-1'
    },
    md: {
      box: 'w-9 h-9 text-xs',
      badge: 'min-w-[17px] h-4 px-1 text-[9px] -bottom-1 -right-1'
    },
    lg: {
      box: 'w-11 h-11 text-sm',
      badge: 'min-w-[20px] h-5 px-1 text-[10px] -bottom-1 -right-1.5'
    },
    xl: {
      box: 'w-14 h-14 text-base',
      badge: 'min-w-[22px] h-5.5 px-1.5 text-xs font-black -bottom-1 -right-1.5'
    }
  }[size];

  return (
    <div className={`relative shrink-0 select-none ${className}`}>
      <div 
        className={`${sizeStyles.box} rounded-full overflow-hidden flex items-center justify-center font-black shadow-xs ring-1.5 ${theme.ring} ${
          photoUrl && !imageError
            ? 'bg-slate-100'
            : `bg-gradient-to-br ${theme.gradient} text-white shadow-inner`
        }`}
      >
        {photoUrl && !imageError ? (
          <img
            src={photoUrl}
            alt={`${player.first_name || ''} ${player.last_name || ''}`}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="leading-none drop-shadow-2xs">{initials}</span>
        )}
      </div>

      {showDorsalBadge && effectiveDorsal !== undefined && effectiveDorsal !== null && String(effectiveDorsal).trim() !== '' && (
        <span 
          className={`absolute ${sizeStyles.badge} rounded-full bg-slate-900 text-white font-black flex items-center justify-center ring-1 ring-white shadow-xs z-1`}
          title={`Dorsal #${effectiveDorsal}`}
        >
          {effectiveDorsal}
        </span>
      )}
    </div>
  );
}
