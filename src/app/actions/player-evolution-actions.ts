'use server';

import { createClient } from '@/lib/supabase/server';

export async function generatePlayerEvolutionAction(playerId: string) {
  try {
    const supabase = await createClient();
    
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('first_name, last_name')
      .eq('id', playerId)
      .single();

    if (playerError) throw new Error(playerError.message);

    // Fetch actual stats from convocatorias table
    const { data: convocatorias, error: convError } = await supabase
      .from('convocatorias')
      .select('minutos_jugados, goles, tarjetas_amarillas, tarjetas_rojas')
      .eq('player_id', playerId);

    if (convError) throw new Error(convError.message);

    // Calculate real stats
    const stats = convocatorias?.reduce(
      (acc, match) => ({
        minutes: acc.minutes + (match.minutos_jugados || 0),
        goals: acc.goals + (match.goles || 0),
        yellowCards: acc.yellowCards + (match.tarjetas_amarillas || 0),
        redCards: acc.redCards + (match.tarjetas_rojas || 0),
      }),
      { minutes: 0, goals: 0, yellowCards: 0, redCards: 0 }
    ) || { minutes: 0, goals: 0, yellowCards: 0, redCards: 0 };

    // MOCK AI Analysis - In production this would call an LLM with the stats
    const evolutionReport = {
      progress: `El jugador ${player.first_name} ${player.last_name} ha demostrado un progreso táctico significativo. Su comprensión del juego asociativo ha mejorado de manera notable en los últimos partidos.`,
      physical_behavior: `Mantiene una resistencia óptima. Ha acumulado un total de ${stats.minutes} minutos reales de juego, lo que demuestra un gran estado de forma y disponibilidad para el equipo.`,
      form: `Actualmente en fase ascendente. Su contribución de ${stats.goals} goles refleja su estado de confianza en el campo.`,
      stats: {
        minutes: stats.minutes,
        goals: stats.goals,
        yellowCards: stats.yellowCards,
        redCards: stats.redCards
      }
    };

    return {
      success: true,
      data: evolutionReport,
    };
  } catch (error: any) {
    console.error("Error generating player evolution:", error);
    return {
      success: false,
      error: error.message || "Failed to generate evolution report",
    };
  }
}
