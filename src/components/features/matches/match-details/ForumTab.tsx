// src/components/features/matches/match-details/ForumTab.tsx
"use client";

import { useState, useEffect, FormEvent } from "react";
import { createClient } from "../../../../lib/supabase/client";
import { X } from "lucide-react";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string; // ISO string
  match_id?: string;
}

interface ForumTabProps {
  /** Identifier of the match to which the chat belongs */
  matchId: string;
}

/**
 * Real‑time chat component for a match.
 * - Messages from the current user are aligned to the right with a blue bubble.
 * - Messages from others are aligned to the left with a gray bubble.
 * - Uses Supabase Realtime on the `match_comments` table.
 * - Input is sticky at the bottom and always visible.
 */
export function ForumTab({ matchId }: ForumTabProps) {
  const supabase = createClient();
  const [currentUserId, setCurrentUserId] = useState<string>("");
  // Retrieve current user ID on mount
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!error && data?.user) {
        setCurrentUserId(data.user.id);
      }
    };
    fetchUser();
  }, []);


  const [messages, setMessages] = useState<Comment[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // Load existing messages
  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("match_comments")
        .select("id,user_id,content,created_at")
        .eq("match_id", matchId)
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Error loading comments", error);
      } else {
        setMessages(data as Comment[]);
      }
      setLoading(false);
    };
    fetchMessages();

    // Subscribe to realtime inserts
    const channel = supabase.channel(`match-${matchId}-comments`);
    channel
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "match_comments" },
        (payload) => {
          const newComment = payload.new as Comment;
          if (newComment && newComment.match_id === matchId) {
            setMessages((prev) => [...prev, newComment]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, supabase]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const { error } = await supabase.from("match_comments").insert({
      match_id: matchId,
      user_id: currentUserId,
      content: newMessage.trim(),
    });
    if (error) console.error("Error sending comment", error);
    setNewMessage("");
    // Realtime will push the new comment back to UI
  };

  return (
    <div className="flex flex-col h-full bg-slate-800 rounded-2xl p-4 shadow-xl">
      <h2 className="mb-2 text-lg font-bold text-gold-400">Chat en vivo</h2>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-3 p-2" id="forum-messages">
        {loading ? (
          <p className="text-center text-slate-400">Cargando...</p>
        ) : (
          messages.map((msg) => {
            const isMine = msg.user_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs rounded-xl p-2 text-sm ${
                    isMine
                      ? "bg-blue-600 text-white"
                      : "bg-slate-600 text-slate-200"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="mt-2 flex items-center space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Escribe un mensaje…"
          className="flex-1 rounded-md bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="flex items-center gap-1 rounded-md bg-gold-500 px-3 py-2 text-xs font-bold text-slate-900 hover:bg-gold-600"
        >
          Enviar <X className="w-3 h-3" />
        </button>
      </form>

      {/* Gold color utilities for vanilla‑CSS fallback */}
      <style jsx>{`
        .bg-gold-500 { background-color: #d4af37; }
        .bg-gold-600 { background-color: #c5a232; }
      `}</style>
    </div>
  );
}
