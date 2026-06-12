// src/hooks/useMvpVoting.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "../lib/supabase/client";
import { PlayerInfo } from "../components/features/matches/match-details/MVPAward"; // reuse type if needed

/**
 * Hook to manage MVP voting for a match.
 * - Loads current votes from the `mvp_votes` table.
 * - Detects if the logged‑in user already voted.
 * - Provides a `vote` function to cast a vote.
 * - Subscribes to realtime changes so the UI updates automatically.
 */
export function useMvpVoting(matchId: string) {
  const supabase = createClient();
  const [votes, setVotes] = useState<Record<string, number>>({}); // playerId => count
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string>("");
  // Fetch authenticated user (Supabase v2)
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("Error fetching user", error);
      else if (data?.user) setUserId(data.user.id);
    };
    fetchUser();
  }, [supabase]);

  // Load initial votes
  const fetchVotes = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("mvp_votes")
      .select("player_id, voter_profile_id")
      .eq("match_id", matchId);
    if (error) {
      console.error("Error fetching MVP votes:", error.message || error);
      setLoading(false);
      return;
    }
    const tally: Record<string, number> = {};
    let alreadyVoted = false;
    data?.forEach((row: any) => {
      const pid = row.player_id as string;
      tally[pid] = (tally[pid] || 0) + 1;
      if (row.voter_profile_id === userId) alreadyVoted = true;
    });
    setVotes(tally);
    setHasVoted(alreadyVoted);
    setLoading(false);
  }, [matchId, supabase, userId]);

  // Submit a vote
  const vote = async (playerId: string) => {
    const { error } = await supabase.from("mvp_votes").insert({
      match_id: matchId,
      player_id: playerId,
      voter_profile_id: userId,
    });
    if (error) console.error("Vote error", error);
    // No need to manually refresh – realtime will sync
  };

  // Realtime subscription to keep votes up‑to‑date
  useEffect(() => {
    if (!userId) return;
    fetchVotes();
    const channel = supabase.channel(`mvp-votes-${matchId}`);
    channel
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mvp_votes" }, (payload) => {
        const newRow = payload.new as any;
        if (newRow && newRow.match_id === matchId) {
          setVotes((prev) => ({
            ...prev,
            [newRow.player_id]: (prev[newRow.player_id] || 0) + 1,
          }));
          if (newRow.voter_profile_id === userId) setHasVoted(true);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, supabase, fetchVotes, userId]);

  // Determine leading player (most votes)
  const leadingPlayerId = Object.entries(votes).reduce(
    (best, [pid, cnt]) => (cnt > (best?.cnt || 0) ? { pid, cnt } : best),
    { pid: "", cnt: 0 }
  ).pid;

  return { votes, hasVoted, loading, vote, leadingPlayerId, totalVotes: Object.values(votes).reduce((a, b) => a + b, 0) };
}
