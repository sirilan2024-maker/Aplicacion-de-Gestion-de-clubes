'use server'

import { createClient } from "@/lib/supabase/server"

export interface ScoutingReport {
  tacticalWeaknesses: string[];
  historicalRecord: {
    wins: number;
    draws: number;
    losses: number;
    goalsFor: number;
    goalsAgainst: number;
  };
  tacticalPlan: string;
}

export async function generateRivalScoutingAction(rivalName: string) {
  try {
    const supabase = await createClient();

    // Fetch all matches against this rival (case-insensitive search)
    const { data: matches, error } = await supabase
      .from('partidos')
      .select('*')
      .ilike('rival_nombre', `%${rivalName}%`);

    if (error) {
      return { success: false, error: "Error al buscar los partidos contra este rival." };
    }

    if (!matches || matches.length === 0) {
      return { success: false, error: "No se encontraron partidos registrados contra este rival." };
    }

    // Calculate historical record
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    matches.forEach(match => {
      const gf = match.resultado_propio || 0;
      const ga = match.resultado_rival || 0;
      goalsFor += gf;
      goalsAgainst += ga;

      if (gf > ga) wins++;
      else if (gf === ga) draws++;
      else losses++;
    });

    // Mocked AI Response representing a structured scouting report
    // In a full implementation, you could send this data to OpenAI or N8N 
    // to generate a real dynamic report based on `match_events`.
    const mockedAIResponse: ScoutingReport = {
      tacticalWeaknesses: [
        "Transición defensiva lenta por las bandas, dejando espacios a los laterales rivales.",
        "Suelen dejar mucho espacio a la espalda de los centrales al adelantar las líneas.",
        "Poca contundencia en los balones aéreos durante los saques de esquina."
      ],
      historicalRecord: {
        wins,
        draws,
        losses,
        goalsFor,
        goalsAgainst
      },
      tacticalPlan: "Se recomienda presionar alto durante los primeros 15 minutos para forzar errores en su salida de balón. Buscar cambios de orientación y pases al espacio para aprovechar su lentitud en el repliegue. En defensa, mantener un bloque medio-bajo, cerrando líneas por dentro, y estar muy atentos a las vigilancias para salir rápido al contragolpe por las bandas."
    };

    return { success: true, data: mockedAIResponse };
  } catch (error: any) {
    console.error("Error en generateRivalScoutingAction:", error);
    return { success: false, error: error.message || "Ocurrió un error inesperado al generar el informe." };
  }
}
