"use server";

import { createClient } from "@/lib/supabase/server";

export async function updateLiveTimer(matchId: string, seconds: number, running: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("partidos")
    .update({ elapsed_seconds: seconds, is_running: running })
    .eq("id", matchId);
  if (error) {
    console.error("[match-actions] Error updating live timer:", error.message);
    // Optionally rethrow or handle error
  }
}
