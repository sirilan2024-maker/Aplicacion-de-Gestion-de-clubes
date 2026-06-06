// src/hooks/useLiveTimer.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { updateLiveTimer } from "@/lib/match-actions";

/**
 * Hook that encapsulates the live‑timer logic used in the match‑details view.
 * It mirrors the behaviour of `LiveTimer` component but exposes the state
 * and control functions so it can be reused elsewhere (e.g. a custom hook
 * inside a Server Component or for unit‑testing).
 *
 * Design goals:
 *  - Keep the UI‑free logic separate from presentation.
 *  - Auto‑sync with Supabase every 5 s while the timer is running.
 *  - Provide a clean API: `seconds`, `running`, `start`, `pause`, `reset`.
 */
export function useLiveTimer(matchId: string, initialSeconds = 0) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);

  // Increment each second when the timer is active.
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // Server sync – debounced every 5 s.
  const sync = useCallback(async () => {
    await updateLiveTimer(matchId, seconds, running);
  }, [matchId, seconds, running]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(sync, 5_000);
    return () => clearInterval(id);
  }, [running, sync]);

  const start = () => setRunning(true);
  const pause = () => setRunning(false);
  const reset = (to = 0) => {
    setSeconds(to);
    setRunning(false);
  };

  return { seconds, running, start, pause, reset };
}
