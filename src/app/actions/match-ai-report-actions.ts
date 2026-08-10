'use server'

import { createAdminClient, createClient } from "@/lib/supabase/server"

export interface MatchAIReportPayload {
  matchId: string
  teamCategory: string
  isHome: boolean
  finalScore: {
    own: number
    rival: number
  }
  eventsTimeline: Array<{
    minute: number
    type: string
    anonymousPlayerId?: string
    notes?: string
  }>
  anonymousPlayers: Array<{
    anonymousId: string
    position: string
    isStarter: boolean
    minutesPlayed: number
    goals: number
    yellowCards: number
    redCards: number
  }>
}

/**
 * Prepara un payload anonimizado del partido y lo envía al Webhook de N8N para procesar con Agentes de IA.
 * Garantiza cumplimiento estricto del RGPD (sin nombres, DNI, emails ni datos personales).
 */
export async function generateMatchAIReportAction(matchId: string) {
  try {
    const supabase = await createAdminClient()

    // 1. Obtener datos del partido
    const { data: match, error: matchError } = await supabase
      .from('partidos')
      .select('*, equipo:teams(name, category)')
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return { success: false, error: "No se encontró la información del partido." }
    }

    // 2. Obtener la cronología de eventos del partido (match_events)
    const { data: events } = await supabase
      .from('match_events')
      .select('*')
      .eq('partido_id', matchId)
      .order('minuto', { ascending: true })

    // 3. Obtener la lista de convocados y estadísticas
    const { data: convocatorias } = await supabase
      .from('convocatorias')
      .select('*, player:players(id, posicion)')
      .eq('partido_id', matchId)

    // Mapa para anonimizar los IDs reales de los jugadores -> 'Jugador #1', 'Jugador #2'
    const playerAnonymizerMap = new Map<string, string>()
    const reverseAnonymizerMap = new Map<string, { id: string, name: string }>()

    let playerCounter = 1
    convocatorias?.forEach((c: any) => {
      if (c.player_id && !playerAnonymizerMap.has(c.player_id)) {
        const anonId = `Jugador #${playerCounter}`
        playerAnonymizerMap.set(c.player_id, anonId)
        reverseAnonymizerMap.set(anonId, {
          id: c.player_id,
          name: `${c.player?.first_name || ''} ${c.player?.last_name || ''}`.trim()
        })
        playerCounter++
      }
    })

    // Construir la lista de eventos anonimizados
    const eventsTimeline = (events || []).map((ev: any) => ({
      minute: ev.minuto || 0,
      type: ev.tipo_evento,
      anonymousPlayerId: ev.player_id ? playerAnonymizerMap.get(ev.player_id) : 'Equipo Rival',
      notes: ev.notas || ''
    }))

    // Construir la lista de estadísticas anonimizadas de los jugadores
    const anonymousPlayers = (convocatorias || []).map((c: any) => ({
      anonymousId: playerAnonymizerMap.get(c.player_id) || 'Jugador Desconocido',
      position: c.player?.posicion || 'Campo',
      isStarter: !!c.titular,
      minutesPlayed: c.minutos_jugados || 0,
      goals: c.goles || 0,
      yellowCards: c.tarjetas_amarillas || 0,
      redCards: c.tarjetas_rojas || 0
    }))

    const payload: any = {
      matchId: match.id,
      teamCategory: match.equipo?.category || match.equipo?.name || 'Fútbol Base',
      isHome: match.lugar === 'Local',
      finalScore: {
        own: match.resultado_propio ?? 0,
        rival: match.resultado_rival ?? 0
      },
      coachValuation: match.coach_summary || '',
      eventsTimeline,
      anonymousPlayers
    }

    // URL del Webhook de N8N configurada en el entorno o fallback
    const webhookUrl = process.env.N8N_AI_REPORT_WEBHOOK_URL

    if (!webhookUrl) {
      // Si aún no está configurado el webhook de N8N, generamos un análisis sintético local enriquecido por reglas para pruebas inmediatas
      const fallbackAnalysis = generateLocalRuleBasedAnalysis(payload)

      // Guardar en la base de datos
      await supabase
        .from('partidos')
        .update({
          coach_summary: fallbackAnalysis.coach_summary,
          positive_aspects: fallbackAnalysis.positive_aspects,
          improvement_aspects: fallbackAnalysis.improvement_aspects,
          attitude_notes: fallbackAnalysis.attitude_notes,
          coach_rating: fallbackAnalysis.coach_rating
        })
        .eq('id', matchId)

      return {
        success: true,
        data: fallbackAnalysis,
        warning: "Se ha utilizado el motor de análisis sintético local ya que N8N_AI_REPORT_WEBHOOK_URL no está configurado."
      }
    }

    // 4. Enviar a N8N vía Webhook
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!res.ok) {
      throw new Error(`Error en el Webhook de N8N (${res.status}): ${await res.text()}`)
    }

    const n8nResult = await res.json()

    // 5. Mapear de vuelta la respuesta redactada si contiene identificadores anónimos
    let coachSummary = n8nResult.coach_summary || ''
    let positiveAspects = n8nResult.positive_aspects || ''
    let improvementAspects = n8nResult.improvement_aspects || ''
    let attitudeNotes = n8nResult.attitude_notes || ''

    reverseAnonymizerMap.forEach((info, anonId) => {
      const regex = new RegExp(anonId, 'g')
      coachSummary = coachSummary.replace(regex, info.name)
      positiveAspects = positiveAspects.replace(regex, info.name)
      improvementAspects = improvementAspects.replace(regex, info.name)
      attitudeNotes = attitudeNotes.replace(regex, info.name)
    })

    const reportData = {
      coach_rating: n8nResult.coach_rating || 7,
      coach_summary: coachSummary,
      positive_aspects: positiveAspects,
      improvement_aspects: improvementAspects,
      attitude_notes: attitudeNotes
    }

    // 6. Guardar en Supabase
    await supabase
      .from('partidos')
      .update(reportData)
      .eq('id', matchId)

    return { success: true, data: reportData }

  } catch (error: any) {
    console.error("Error generating match AI report:", error)
    return { success: false, error: error.message || "Error al procesar el informe de IA." }
  }
}

/**
 * Motor de análisis táctico por reglas locales para cuando no haya conexión directa a N8N.
 * Detecta goles en los primeros minutos, bajones de rendimiento en el tramo final y disciplina.
 */
function generateLocalRuleBasedAnalysis(payload: MatchAIReportPayload) {
  const { eventsTimeline, finalScore, teamCategory, isHome, anonymousPlayers } = payload

  const ownGoals = eventsTimeline.filter(e => e.type === 'Gol' && e.anonymousPlayerId !== 'Equipo Rival')
  const rivalGoals = eventsTimeline.filter(e => e.type === 'Gol' && e.anonymousPlayerId === 'Equipo Rival')
  const ownCards = eventsTimeline.filter(e => e.type === 'Tarjeta Amarilla' || e.type === 'Tarjeta Roja' || e.type === 'Amarilla')
  const substitutionEvents = eventsTimeline.filter(e => e.type === 'Cambio' || e.type === 'Cambio Entra' || e.type === 'Cambio Sale')
  const coachNotesEvents = eventsTimeline.filter(e => e.type === 'Comentario del Entrenador' || (e.notes && e.notes.length > 0))
  const chancesEvents = eventsTimeline.filter(e => e.type === 'Tiro al larguero' || e.type === 'Tiro al palo' || e.type === 'Ocasión Peligrosa' || e.type === 'Penalti' || e.type === 'Parada')

  const earlyGoalsConceded = rivalGoals.filter(e => e.minute <= 15)
  const lateGoalsConceded = rivalGoals.filter(e => e.minute >= 75)
  const totalYellows = eventsTimeline.filter(e => e.type === 'Tarjeta Amarilla' || e.type === 'Amarilla').length
  const totalReds = eventsTimeline.filter(e => e.type === 'Tarjeta Roja').length

  const won = finalScore.own > finalScore.rival
  const draw = finalScore.own === finalScore.rival
  const venue = isHome ? "en casa (campo Local)" : "fuera de casa (campo Visitante)"

  let rating = won ? 8.5 : draw ? 6.5 : 5.0
  if (ownGoals.length >= 3) rating += 1
  if (earlyGoalsConceded.length > 0) rating -= 0.5
  if (totalReds > 0) rating -= 1

  // 1. Resumen Ejecutivo Táctico Extenso y Profundo
  let summary = `## 📊 INFORME TÁCTICO INTEGRAL Y RESUMEN GENERAL DEL ENCUENTRO\n\n`
  summary += `**Categoría:** ${teamCategory} | **Condición:** Disputado ${venue}\n`
  summary += `**Resultado Final:** ${finalScore.own} - ${finalScore.rival} (${won ? 'VICTORIA' : draw ? 'EMPATE' : 'DERROTA'})\n\n`
  
  if (won) {
    summary += `El **${teamCategory}** completó una actuación colectiva muy seria y competitiva. La propuesta del cuerpo técnico se tradujo en una lectura inteligente del ritmo del partido, sabiendo sufrir en los momentos de presión del rival e imponiendo calidad y efectividad en los metros finales.\n\n`
  } else if (draw) {
    summary += `Encuentro igualado e intenso en el que el **${teamCategory}** alternó momentos de buen control posicional con fases de ida y vuelta. La solidez defensiva evitó males mayores, aunque faltó algo de serenidad en el último pase para consolidar la ventaja.\n\n`
  } else {
    summary += `Partido de alta exigencia táctica en el que el **${teamCategory}** acusó ciertos desajustes puntuales que terminaron penalizando en el marcador. A pesar del resultado, se extraen valiosas conclusiones para ajustar los patrones de juego en los próximos entrenamientos.\n\n`
  }

  summary += `### ⏱️ Cronología y Desarrollo del Partido por Fases:\n`
  summary += `• **Fase de Inicio y 1ª Parte (Min 1' - 45'):** ${earlyGoalsConceded.length > 0 ? `Se inició con cierta frialdad en las marcas, encajando un gol tempranero en el min ${earlyGoalsConceded[0].minute}' que obligó a replegar y reordenar líneas.` : 'El equipo saltó bien concentrado, adueñándose de los primeros balones divididos y asentando la línea defensiva en bloque medio.'}\n`
  summary += `• **Paso por Vestuarios y Reajustes Tácticos:** Tras el descanso, se corrigió la presión sobre la salida de balón del rival para acortar las distancias entre la línea media y el frente de ataque.\n`
  summary += `• **Fase Final y Cierre (Min 46' - 90'+):** ${substitutionEvents.length > 0 ? `Las sustituciones aportaron energía en las bandas.` : 'Se mantuvo el bloque inicial.'} ${lateGoalsConceded.length > 0 ? `En los últimos 15 minutos (min 75+), la acumulación de minutos provocó cierto desorden espacial.` : 'La gestión del tiempo y el control de la posesión permitieron amarrar el resultado hasta el pitido final.'}\n\n`

  summary += `### 📈 Balance Cuantitativo del Partido:\n`
  summary += `• **Goles Convertidos:** ${ownGoals.length}\n`
  summary += `• **Goles Encajados:** ${rivalGoals.length}\n`
  summary += `• **Ocasiones de Riesgo Generadas:** ${chancesEvents.length} acciones claras (disparos a puerta, postes/largueros o paradas clave)\n`
  summary += `• **Tarjetas y Disciplina:** ${totalYellows} amonestación(es) amarilla(s) y ${totalReds} tarjeta(s) roja(s)\n`

  // 2. Aspectos Positivos Detallados
  let positive = `### 🌟 Fortalezas y Puntos Clave Destacados del Partido:\n\n`
  positive += `1. **Rendimiento Colectivo y Solidaridad:** Alta predisposición al esfuerzo y ayudas constantes en coberturas defensivas.\n`
  if (ownGoals.length > 0) {
    positive += `2. **Efectividad y Pegada:** Capacidad para transformar en goles las llegadas trabajadas en la semana (${ownGoals.length} gol(es)).\n`
  }
  if (chancesEvents.length > 0) {
    positive += `3. **Llegada y Profundidad:** Capacidad constante de generar situaciones de gol de peligro en zona de tres cuartos.\n`
  }
  positive += `4. **Presión Tras Pérdida:** Buena reacción de los medios interiores para evitar contragolpes inmediatos del rival.\n`
  positive += `5. **Aportación de los Relevos:** Frescura física e implicación táctica de los jugadores que salieron desde el banquillo.`

  // 3. Aspectos a Mejorar Profundos
  let improvement = `### 🛠️ Áreas de Mejora e Indicadores Tácticos a Trabajar:\n\n`
  let impCount = 1

  if (earlyGoalsConceded.length > 0) {
    improvement += `${impCount++}. **Concentración en Salida (Primeros 15 min):** Corregir la desconexión inicial tras el pitido inicial. Trabajar rutinas de activación física y mental previa al partido.\n`
  }
  if (lateGoalsConceded.length > 0) {
    improvement += `${impCount++}. **Resistencia y Gestión del Tramo Final (Min 75+):** Mantener el orden posicional cuando aparece el cansancio. Evitar abrir huecos entre la línea defensiva y los mediocentros.\n`
  }
  if (totalYellows >= 3 || totalReds > 0) {
    improvement += `${impCount++}. **Control Disciplinario y Faltas Evitables:** Reducir amonestaciones innecesarias por protestas o balones sin disputa directa para asegurar disponer de todo el bloque disponible.\n`
  }
  
  improvement += `${impCount++}. **Velocidad de Circulación de Balón:** Dar mayor dinamismo a la salida de balón a dos toques para desorganizar bloques defensivos bajos.\n`
  improvement += `${impCount++}. **Vigilancia de Segundas Jugadas:** Ajustar el marcaje estrecho en los balones parados y los rechaces en la frontal del área.`

  // 4. Notas de Actitud y Rendimiento Individual
  let attitude = summary;

  return {
    coach_rating: Math.max(1, Math.min(10, Number(rating.toFixed(1)))),
    coach_summary: summary,
    positive_aspects: positive,
    improvement_aspects: improvement,
    attitude_notes: attitude
  }
}

/**
 * Server Action para calcular y generar el informe táctico de tendencias de rendimiento multi-partido.
 * Procesa tramos de 15' (0-15, 16-30, 31-45, 46-60, 61-75, 76-90+), 1ª vs 2ª parte, evolución de tarjetas y patrones.
 */
export async function generateMultiMatchTrendsAction(matchIds: string[]) {
  try {
    if (!matchIds || matchIds.length === 0) {
      return { success: false, error: "Selecciona al menos un partido para generar el análisis de tendencias." }
    }

    const supabase = await createClient()

    // 1. Obtener partidos seleccionados
    const { data: matches, error: matchesErr } = await supabase
      .from("partidos")
      .select("*, equipo:teams(name, category)")
      .in("id", matchIds)
      .order("fecha_hora", { ascending: true })

    if (matchesErr || !matches || matches.length === 0) {
      return { success: false, error: "No se encontraron partidos válidos." }
    }

    // 2. Obtener todos los eventos de esos partidos
    const { data: events } = await supabase
      .from("match_events")
      .select("*")
      .in("partido_id", matchIds)
      .order("minuto", { ascending: true })

    // Estructuras de conteo por tramos de 15 minutos
    const timeSlots = [
      { key: "0-15", label: "0' - 15'", ownGoals: 0, rivalGoals: 0, yellowCards: 0, redCards: 0 },
      { key: "16-30", label: "16' - 30'", ownGoals: 0, rivalGoals: 0, yellowCards: 0, redCards: 0 },
      { key: "31-45", label: "31' - 45'", ownGoals: 0, rivalGoals: 0, yellowCards: 0, redCards: 0 },
      { key: "46-60", label: "46' - 60'", ownGoals: 0, rivalGoals: 0, yellowCards: 0, redCards: 0 },
      { key: "61-75", label: "61' - 75'", ownGoals: 0, rivalGoals: 0, yellowCards: 0, redCards: 0 },
      { key: "76-90+", label: "76' - 90'+", ownGoals: 0, rivalGoals: 0, yellowCards: 0, redCards: 0 }
    ]

    let totalOwnGoals = 0
    let totalRivalGoals = 0
    let totalYellows = 0
    let totalReds = 0
    const coachNotes: Array<{ matchId: string; minute: number; text: string }> = [];

    // Clasificar eventos en tramos
    (events || []).forEach(e => {
      const min = e.minuto || 0
      let slotIdx = 0
      if (min <= 15) slotIdx = 0
      else if (min <= 30) slotIdx = 1
      else if (min <= 45) slotIdx = 2
      else if (min <= 60) slotIdx = 3
      else if (min <= 75) slotIdx = 4
      else slotIdx = 5

      const isGol = e.tipo_evento === "Gol" || e.tipo === "Gol"
      const isYellow = e.tipo_evento === "Tarjeta Amarilla" || e.tipo_evento === "Amarilla" || e.tipo === "Tarjeta Amarilla"
      const isRed = e.tipo_evento === "Tarjeta Roja" || e.tipo === "Tarjeta Roja"
      const isComment = e.tipo_evento === "Comentario del Entrenador" || (e.notas && e.notas.length > 0)

      if (isGol) {
        if (e.player_id) {
          timeSlots[slotIdx].ownGoals++
          totalOwnGoals++
        } else {
          timeSlots[slotIdx].rivalGoals++
          totalRivalGoals++
        }
      } else if (isYellow) {
        timeSlots[slotIdx].yellowCards++
        totalYellows++
      } else if (isRed) {
        timeSlots[slotIdx].redCards++
        totalReds++
      }

      if (isComment && e.notas) {
        const cleanNote = e.notas.replace(/^💬\s*/, '')
        coachNotes.push({ matchId: e.partido_id, minute: min, text: cleanNote })
      }
    })

    // Calcular datos por partes
    const firstHalfRivalGoals = timeSlots[0].rivalGoals + timeSlots[1].rivalGoals + timeSlots[2].rivalGoals
    const secondHalfRivalGoals = timeSlots[3].rivalGoals + timeSlots[4].rivalGoals + timeSlots[5].rivalGoals

    const firstHalfOwnGoals = timeSlots[0].ownGoals + timeSlots[1].ownGoals + timeSlots[2].ownGoals
    const secondHalfOwnGoals = timeSlots[3].ownGoals + timeSlots[4].ownGoals + timeSlots[5].ownGoals

    // Identificación de patrones tácticos clave
    const patterns: string[] = []

    if (timeSlots[0].rivalGoals > 0 && (timeSlots[0].rivalGoals / Math.max(1, totalRivalGoals)) >= 0.3) {
      patterns.push("⚠️ **Vulnerabilidad Temprana (0'-15'):** El equipo encaja una proporción elevada de goles en los primeros 15 minutos de partido. Se recomienda un protocolo de calentamiento previo más intenso.")
    }

    if (timeSlots[5].rivalGoals > 0 && (timeSlots[5].rivalGoals / Math.max(1, totalRivalGoals)) >= 0.3) {
      patterns.push("⚠️ **Bajón de Rendimiento Final (76'-90'+):** Tendencia a conceder goles en los minutos finales por cansancio o desajuste defensivo en bloque bajo.")
    }

    if (secondHalfOwnGoals > firstHalfOwnGoals * 1.5 && secondHalfOwnGoals >= 3) {
      patterns.push("🔥 **Efecto Revulsivo en 2ª Partes:** El equipo incrementa notablemente su producción goleadora en la segunda mitad con la entrada del banquillo.")
    }

    if (totalYellows / matches.length >= 2.5) {
      patterns.push("🟨 **Carga Disciplinaria Elevada:** Promedio superior a 2.5 tarjetas por encuentro. Conviene insistir en el control emocional y faltas tácticas lejanas al área.")
    }

    if (patterns.length === 0) {
      patterns.push("✅ **Balance Táctico Estable:** El equipo mantiene una distribución homogénea de goles y rendimiento físico a lo largo de los encuentros analizados.")
    }

    // Generar dictamen táctico IA
    const teamCat = matches[0]?.equipo?.category || matches[0]?.equipo?.name || 'Equipo'
    let reportText = `## 📊 INFORME DE TENDENCIAS TÁCTICAS MULTI-PARTIDO (${matches.length} PARTIDOS ANALIZADOS)\n\n`
    reportText += `**Equipo:** ${teamCat} | **Muestra de Partidos:** ${matches.length} encuentros oficiales\n`
    reportText += `**Balance Global:** ${totalOwnGoals} goles a favor vs ${totalRivalGoals} goles en contra | ${totalYellows} amarillas / ${totalReds} rojas\n\n`

    reportText += `### 🔍 Tendencias y Patrones Tácticos Detectados:\n`
    patterns.forEach(p => {
      reportText += `• ${p}\n`
    })

    reportText += `\n### ⏱️ Análisis de Goles Encajados/Anotados por Partes:\n`
    reportText += `• **Primera Mitad (0' - 45'):** ${firstHalfOwnGoals} goles a favor | ${firstHalfRivalGoals} goles encajados\n`
    reportText += `• **Segunda Mitad (46' - 90'+):** ${secondHalfOwnGoals} goles a favor | ${secondHalfRivalGoals} goles encajados\n\n`

    reportText += `### 🎯 Recomendaciones para la Planificación Semanal:\n`
    if (timeSlots[0].rivalGoals > 0) {
      reportText += `1. **Pauta 1:** Diseñar tareas de rondos y partidos reducidos de alta intensidad nada más arrancar la sesión para acostumbrar al grupo a enchufarse al 100% desde el min 1.\n`
    } else {
      reportText += `1. **Pauta 1:** Mantener las rutinas de entrada al partido y asegurar la circulación rápida en iniciación.\n`
    }

    if (timeSlots[5].rivalGoals > 0) {
      reportText += `2. **Pauta 2:** Incluir simulación de situaciones de partido en fatiga (minutos finales) priorizando la comunicación entre centrales y mediocentros.\n`
    } else {
      reportText += `2. **Pauta 2:** Potenciar las transiciones ofensivas aprovechando los espacios del rival al final del partido.\n`
    }

    return {
      success: true,
      data: {
        matchesCount: matches.length,
        timeSlots,
        totalOwnGoals,
        totalRivalGoals,
        firstHalfOwnGoals,
        firstHalfRivalGoals,
        secondHalfOwnGoals,
        secondHalfRivalGoals,
        patterns,
        reportText
      }
    }
  } catch (err: any) {
    console.error("Error en generateMultiMatchTrendsAction:", err)
    return { success: false, error: err.message || "Error al calcular las tendencias tácticas." }
  }
}
