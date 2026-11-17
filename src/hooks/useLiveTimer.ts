"use client";

import { useState, useEffect } from "react";
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

  // Calculate current elapsed time from live_timer_started_at without drift
  useEffect(() => {
    if (!running || !startedAt) {
      setSeconds(baseElapsed);
      return;
    }

    const updateElapsed = () => {
      const now = Date.now();
      const start = new Date(startedAt).getTime();
      const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));
      setSeconds(baseElapsed + diffSeconds);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    document.addEventListener("visibilitychange", updateElapsed);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", updateElapsed);
    };
  }, [running, startedAt, baseElapsed]);

  const start = async (fromSeconds?: number) => {
    const nowStr = new Date().toISOString();
    setStartedAt(nowStr);
    setRunning(true);

    let newElapsed = baseElapsed;
    if (fromSeconds !== undefined) {
      newElapsed = fromSeconds;
      setBaseElapsed(newElapsed);
      setSeconds(newElapsed);
    }

    // Optimistic UI updates, server action will persist
    await toggleMatchTimer(matchId, true, newElapsed);
  };

  const pause = async () => {
    const currentSeconds = startedAt
      ? baseElapsed + Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000))
      : seconds;
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
