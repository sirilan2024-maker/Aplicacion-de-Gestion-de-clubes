// src/components/features/matches/match-details/MVPAward.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import { createClient } from "../../../../lib/supabase/client";
import { useMvpVoting } from "../../../../hooks/useMvpVoting";

export interface PlayerInfo {
  id: string;
  name: string;
  dorsal: number;
  avatarUrl?: string;
}

interface MVPAwardProps {
  /** Match identifier */
  matchId: string;
  /** List of players eligible for MVP */
  players: PlayerInfo[];
}

/**
 * Premium card showing the "Estrella del partido" (MVP).
 * - If the current user hasn't voted, shows a "Votar al MVP" button that opens a modal.
 * - After voting, displays the leading player with avatar, name and vote count.
 */
export function MVPAward({ matchId, players }: MVPAwardProps) {
  const supabase = createClient();
  const { votes, hasVoted, loading, vote, leadingPlayerId, totalVotes } = useMvpVoting(matchId);
  const [modalOpen, setModalOpen] = useState(false);

  const leadingPlayer = players.find((p) => p.id === leadingPlayerId) || players[0];

  const handleVote = async (playerId: string) => {
    await vote(playerId);
    setModalOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-slate-900 p-6 shadow-xl text-white h-fit">
      <h2 className="text-2xl font-extrabold text-gold-400 tracking-wider">Estrella del partido</h2>

      {loading && <p className="text-sm text-slate-400">Cargando datos…</p>}

      {/* If the user hasn't voted yet */}
      {!loading && !hasVoted && (
        <button
          onClick={() => setModalOpen(true)}
          className="mt-2 self-start rounded-lg bg-gold-500 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-gold-600 transition"
        >
          Votar al MVP
        </button>
      )}

      {/* After voting */}
      {!loading && hasVoted && leadingPlayer && (
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 flex-shrink-0">
            {leadingPlayer.avatarUrl ? (
              <Image
                src={leadingPlayer.avatarUrl}
                alt={leadingPlayer.name}
                layout="fill"
                className="rounded-full border-2 border-gold-500 object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-gold-500 font-bold text-xl border-2 border-gold-500">
                {leadingPlayer.dorsal}
              </div>
            )}
          </div>
          <div className="flex flex-col">
            <p className="text-lg font-medium text-white">{leadingPlayer.name}</p>
            <p className="text-sm text-gold-400">
              {votes[leadingPlayer.id] || 0} voto{votes[leadingPlayer.id] === 1 ? "" : "s"} (total {totalVotes})
            </p>
          </div>
        </div>
      )}

      {/* Modal for selecting MVP */}
      {modalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-slate-800 rounded-xl p-6 w-80">
            <h3 className="mb-4 text-center text-gold-400 font-semibold">Selecciona al MVP</h3>
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {players.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span>{p.name} (#{p.dorsal})</span>
                  <button
                    onClick={() => handleVote(p.id)}
                    className="rounded bg-gold-500 px-2 py-1 text-xs font-bold text-slate-900 hover:bg-gold-600"
                  >
                    Votar
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setModalOpen(false)}
              className="mt-4 w-full rounded bg-slate-600 py-1 text-sm text-slate-200 hover:bg-slate-500"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Gold color utilities for vanilla‑CSS fallback */}
      <style jsx>{`
        .border-gold-500 { border-color: #d4af37; }
        .text-gold-400 { color: #d4af37; }
        .bg-gold-500 { background-color: #d4af37; }
        .bg-gold-600 { background-color: #c5a232; }
      `}</style>
    </div>
  );
}
