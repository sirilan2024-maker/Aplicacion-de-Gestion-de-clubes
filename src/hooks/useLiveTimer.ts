"use client";

import { useState, useEffect, useCallback } from "react";
import { toggleMatchTimer } from "@/app/actions/live-match-actions";

export function useLiveTimer(
  matchId: string, 
  initialElapsedSeconds = 0, 
  initialStartedAt: string | null = null
) {
  const [seconds, setSeconds] = useState(initialElapsedSeconds);
  const [running, setRunning] = useState(!!initialStartedAt);
  const [startedAt, setStartedAt] = useState<string | null>(initialStartedAt);
  const [baseElapsed, setBaseElapsed] = useState(initialElapsedSeconds);

  // Sync internal state if props change from Supabase realtime
  useEffect(() => {
    setStartedAt(initialStartedAt);
    setBaseElapsed(initialElapsedSeconds);
    setRunning(!!initialStartedAt);
  }, [initialElapsedSeconds, initialStartedAt]);

  // Calculate current elapsed time every second if running
  useEffect(() => {
    if (!running || !startedAt) {
      setSeconds(baseElapsed);
      return;
    }

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(startedAt).getTime();
      const diffSeconds = Math.floor((now - start) / 1000);
      setSeconds(baseElapsed + diffSeconds);
    }, 1000);

    return () => clearInterval(interval);
  }, [running, startedAt, baseElapsed]);

  const start = async () => {
    const nowStr = new Date().toISOString();
    setStartedAt(nowStr);
    setRunning(true);
    // Optimistic UI updates, server action will persist
    await toggleMatchTimer(matchId, true, baseElapsed);
  };

  const pause = async () => {
    const currentSeconds = seconds;
    setRunning(false);
    setStartedAt(null);
    setBaseElapsed(currentSeconds);
    setSeconds(currentSeconds);
    await toggleMatchTimer(matchId, false, currentSeconds);
  };

  const reset = async (to = 0) => {
    setSeconds(to);
    setBaseElapsed(to);
    setRunning(false);
    setStartedAt(null);
    await toggleMatchTimer(matchId, false, to);
  };

  return { seconds, running, start, pause, reset };
}
