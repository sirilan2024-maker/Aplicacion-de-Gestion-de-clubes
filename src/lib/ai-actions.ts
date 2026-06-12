"use server"

import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

/**
 * MOCK AI Analysis - Since we can't call OpenAI or Gemini directly without API keys here,
 * we will simulate an AI analysis engine that reads the events and coach report.
 */
export async function analyzeMatchData(matchId: string, teamId: string) {
  const supabase = createClient(cookies())

  // 1. Fetch match and coach report
  const { data: match } = await supabase.from("partidos").select("*").eq("id", matchId).single()
  
  // 2. Fetch live events
  const { data: events } = await supabase.from("match_live_events").select("*").eq("partido_id", matchId)

  // 3. Fetch convocatorias (attendance)
  const { data: convocatorias } = await supabase.from("convocatorias").select("*").eq("partido_id", matchId)

  if (!match) return { error: "Partido no encontrado" }

  // SIMULATED AI GENERATION:
  const eventsCount = events?.length || 0;
  const goalsCount = events?.filter((e: any) => e.tipo === 'Gol').length || 0;
  const rating = match.resultado_propio > match.resultado_rival ? 8.5 : match.resultado_propio === match.resultado_rival ? 6.0 : 4.5;
  
  const analysisText = `
### Análisis Generado por IA
El equipo registró un total de ${eventsCount} eventos durante el partido. 
El resultado fue de ${match.resultado_propio} a ${match.resultado_rival}.
Se observó una intensidad moderada con ${goalsCount} ocasiones clave convertidas.

**Puntos Fuertes Detectados (Basado en el Informe del Entrenador):**
El entrenador indicó: "${match.coach_report || 'Sin observaciones específicas.'}". 
Esto sugiere que el aspecto táctico debe ser reforzado durante la próxima sesión de entrenamiento.

**Recomendaciones:**
1. Aumentar el enfoque en balón parado.
2. Revisar el posicionamiento defensivo tras pérdida de balón.
  `.trim()

  const metrics = {
    total_events: eventsCount,
    goals: goalsCount,
    attendance_rate: convocatorias?.length ? "Alta" : "Baja"
  }

  // Save to AI reports table
  const { data: report, error } = await supabase
    .from("ai_analysis_reports")
    .insert({
      team_id: teamId,
      match_id: matchId,
      type: "match_evaluation",
      analysis_text: analysisText,
      rating: rating,
      metrics_json: metrics
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating AI report:", error)
    return { error: "No se pudo guardar el informe de IA." }
  }

  return { success: true, report }
}
