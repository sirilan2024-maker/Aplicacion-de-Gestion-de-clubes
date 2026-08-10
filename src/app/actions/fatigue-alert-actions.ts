'use server';

import { createClient } from '@/lib/supabase/server';

export interface FatigueAlertPlayer {
  id: string;
  name: string;
  category: string;
  minutesPlayed: number;
  riskLevel: 'Alto' | 'Medio' | 'Extremo';
  recommendation: string;
}

export async function generateFatigueAlertAction() {
  try {
    const supabase = await createClient();

    // 1. Fetch all players
    const { data: players, error: playersErr } = await supabase
      .from('players')
      .select('id, first_name, last_name, team_id, equipo:teams(category)');
      
    if (playersErr) throw new Error(playersErr.message);

    // 2. Fetch all convocatorias to sum minutes
    const { data: convocatorias, error: convErr } = await supabase
      .from('convocatorias')
      .select('player_id, minutos_jugados');

    if (convErr) throw new Error(convErr.message);

    // 3. Aggregate minutes per player
    const minutesMap: Record<string, number> = {};
    convocatorias?.forEach(c => {
      if (c.player_id && c.minutos_jugados) {
        minutesMap[c.player_id] = (minutesMap[c.player_id] || 0) + c.minutos_jugados;
      }
    });

    const fatigueList: FatigueAlertPlayer[] = [];

    players?.forEach(p => {
      const mins = minutesMap[p.id] || 0;
      
      if (mins > 600) { // Arbitrary threshold for fatigue risk demo
        let riskLevel: 'Alto' | 'Medio' | 'Extremo' = 'Medio';
        let recommendation = 'Monitorizar cargas en entrenamiento.';

        if (mins > 1000) {
          riskLevel = 'Alto';
          recommendation = 'Reducir minutos en el próximo partido y evitar dobles sesiones.';
        }
        if (mins > 1500) {
          riskLevel = 'Extremo';
          recommendation = 'DESCANSO OBLIGATORIO. Alto riesgo de rotura muscular.';
        }

        fatigueList.push({
          id: p.id,
          name: `${p.first_name} ${p.last_name}`,
          category: (p.equipo as any)?.category || 'Sin Equipo',
          minutesPlayed: mins,
          riskLevel,
          recommendation
        });
      }
    });

    // Sort by most minutes
    fatigueList.sort((a, b) => b.minutesPlayed - a.minutesPlayed);

    return {
      success: true,
      data: fatigueList
    };
  } catch (error: any) {
    console.error("Error generating fatigue alert:", error);
    return {
      success: false,
      error: error.message || "Failed to generate fatigue report"
    };
  }
}
