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
  posicion?: string;
  goals?: number;
  assists?: number;
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
      {/* If the user hasn't voted yet */}
      {!loading && !hasVoted && (
        <>
          <h2 className="text-2xl font-extrabold text-gold-400 tracking-wider">Estrella del partido</h2>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-2 self-start rounded-lg bg-gold-500 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-gold-600 transition"
          >
            Votar al MVP
          </button>
        </>
      )}

      {/* After voting */}
      {!loading && hasVoted && leadingPlayer && (
        <div className="flex items-center gap-5">
          <div className="relative h-[80px] w-[80px] flex-shrink-0">
            {leadingPlayer.avatarUrl ? (
              <Image
                src={leadingPlayer.avatarUrl}
                alt={leadingPlayer.name}
                fill
                className="rounded-full border-[3px] border-gold-500 object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-800 text-gold-500 font-bold text-2xl border-[3px] border-gold-500">
                {leadingPlayer.dorsal}
              </div>
            )}
          </div>
          
          <div className="flex flex-col items-start gap-1">
            <div className="bg-gold-500/10 text-gold-500 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-gold-500/20">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
              Estrella del partido
            </div>
            
            <p className="text-xl font-bold text-white leading-none mt-1">{leadingPlayer.name}</p>
            <p className="text-xs text-slate-400 font-medium">
              {leadingPlayer.posicion || "Jugador"} · Dorsal #{leadingPlayer.dorsal}
            </p>
            
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-gold-400">⚽ {leadingPlayer.goals || 0} Goles</span>
              <span className="text-gold-500/40 font-bold">·</span>
              <span className="text-xs font-bold text-gold-400">🎯 {leadingPlayer.assists || 0} Asistencia{leadingPlayer.assists !== 1 ? 's' : ''}</span>
            </div>
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
