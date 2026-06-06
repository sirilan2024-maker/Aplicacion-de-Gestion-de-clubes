// src/components/features/matches/match-details/LiveTimer.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { updateLiveTimer } from "@/lib/match-actions";



export interface LiveTimerProps {
  /** ID of the match (used by the server action) */
  matchId: string;
  /** Seconds elapsed when the component mounts (default 0) */
  initialSeconds?: number;
}

/**
 * Sticky timer bar with play/pause controls and a "En vivo" badge.
 * Premium dark design: background #1e3a8a (blue‑900), white text, rounded‑xl,
 * subtle shadow and micro‑animations.
 */
export function LiveTimer({ matchId, initialSeconds = 0 }: LiveTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  // Sync state with the server – debounced every 5 s


  // Increment each second when running
  const sync = useCallback(() => {
    // Update timer state on the server
    updateLiveTimer(matchId, seconds, running);
  }, [matchId, seconds, running]);

  // Auto‑sync every 5 s while the timer is active
  useEffect(() => {
    if (!running) return;
    const id = setInterval(sync, 5_000);
    return () => clearInterval(id);
  }, [running, sync]);

  const toggle = () => setRunning((v) => !v);

  const mins = String(Math.floor(seconds / 60)).padStart(2, "0");
  const secs = String(seconds % 60).padStart(2, "0");

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between bg-blue-900 text-slate-100 px-4 py-2 rounded-b-xl shadow-sm">
      {/* Timer display */}
      <span className="font-mono text-lg">{`${mins}:${secs}`}</span>

      {/* En‑vivo badge */}
      <span className="ml-2 inline-flex items-center rounded-full bg-red-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow">
        En vivo
      </span>

      {/* Play / Pause button */}
      <button
        onClick={toggle}
        className="flex items-center gap-2 rounded-lg bg-blue-800 px-3 py-1 hover:bg-blue-700 transition-colors"
      >
        {running ? (
          <>
            <svg
              className="w-5 h-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
            <span>Pausar</span>
          </>
        ) : (
          <>
            <svg
              className="w-5 h-5 text-green-400"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
            <span>Iniciar</span>
          </>
        )}
      </button>
    </div>
  );
}

