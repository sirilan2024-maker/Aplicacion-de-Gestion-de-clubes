"use client"

import { MockPlayer } from "@/components/features/events/mock-data"

interface FootballPitchProps {
  players: MockPlayer[]
  teamColor: string
}

export function FootballPitch({ players, teamColor }: FootballPitchProps) {
  return (
    <div className="w-full">
      {/* Pitch container - 4:6 aspect ratio-ish */}
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #16a34a 0%, #15803d 50%, #16a34a 100%)",
          paddingBottom: "130%",
          maxWidth: "420px",
          margin: "0 auto",
        }}
      >
        {/* Grass stripes */}
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute left-0 right-0"
              style={{
                top: `${i * 12.5}%`,
                height: "12.5%",
                backgroundColor: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.12)",
              }}
            />
          ))}
        </div>

        {/* ── PITCH MARKINGS ── */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 300 450"
          preserveAspectRatio="none"
          fill="none"
          stroke="rgba(255,255,255,0.65)"
          strokeWidth="1.5"
        >
          {/* Outer boundary */}
          <rect x="10" y="10" width="280" height="430" rx="2" />

          {/* Center line */}
          <line x1="10" y1="225" x2="290" y2="225" />

          {/* Center circle */}
          <circle cx="150" cy="225" r="40" />
          <circle cx="150" cy="225" r="2" fill="rgba(255,255,255,0.65)" />

          {/* Top penalty area */}
          <rect x="75" y="10" width="150" height="65" />
          {/* Top goal area */}
          <rect x="110" y="10" width="80" height="25" />
          {/* Top penalty spot */}
          <circle cx="150" cy="55" r="2" fill="rgba(255,255,255,0.65)" />
          {/* Top penalty arc */}
          <path d="M 110 75 A 40 40 0 0 1 190 75" />

          {/* Bottom penalty area */}
          <rect x="75" y="375" width="150" height="65" />
          {/* Bottom goal area */}
          <rect x="110" y="415" width="80" height="25" />
          {/* Bottom penalty spot */}
          <circle cx="150" cy="395" r="2" fill="rgba(255,255,255,0.65)" />
          {/* Bottom penalty arc */}
          <path d="M 110 375 A 40 40 0 0 0 190 375" />

          {/* Corner arcs */}
          <path d="M 10 25 A 15 15 0 0 1 25 10" />
          <path d="M 275 10 A 15 15 0 0 1 290 25" />
          <path d="M 10 425 A 15 15 0 0 0 25 440" />
          <path d="M 290 425 A 15 15 0 0 1 275 440" />
        </svg>

        {/* ── PLAYER AVATARS ── */}
        {players.map((player) => (
          <div
            key={player.id}
            className="absolute flex flex-col items-center gap-0.5 transform -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${player.posX}%`, top: `${player.posY}%` }}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[10px] font-black select-none"
              style={{ backgroundColor: teamColor }}
              title={`${player.number}. ${player.name} - ${player.position}`}
            >
              {player.number}
            </div>
            {/* Name label */}
            <div className="bg-black/50 backdrop-blur-sm text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap max-w-[64px] truncate">
              {player.name.split(" ")[0]}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-3 flex-wrap">
        {["Portero", "Defensa", "Centrocampista", "Delantero"].map((pos, i) => (
          <div key={pos} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: teamColor, opacity: 0.5 + i * 0.15 }}
            />
            <span className="text-xs text-gray-500">{pos}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
