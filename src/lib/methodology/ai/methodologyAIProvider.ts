/**
 * Proveedor de Inteligencia Artificial Metodológica v1.0 (TypeScript)
 * Antigravity Methodology OS - Fases 5.1, 5.2 & 5.3
 */

import Groq from "groq-sdk";
import { 
  MethodologyAIContext, 
  MethodologyAIResponse, 
  MethodologyAIActionProposal,
  MethodologyAIPlanningProposal,
  MethodologyAIProvider as IMethodologyAIProvider 
} from "./types";
import { buildSessionActionProposal, buildMicrocycleActionProposal } from "./methodologyAIActionService";
import { buildAIPlanningProposal } from "./methodologyAIPlanningService";

export class MethodologyAIProvider implements IMethodologyAIProvider {
  private groq: Groq | null = null;

  constructor(apiKey?: string) {
    const key = apiKey || process.env.GROQ_API_KEY;
    this.groq = key ? new Groq({ apiKey: key }) : null;
  }

  async askAssistant(prompt: string, context: MethodologyAIContext): Promise<MethodologyAIResponse> {
    if (!context || !context.club || !context.club.id) {
      throw new Error("Contexto metodológico no proporcionado o inválido");
    }

    const isTeamScope = context.scope === 'team' || context.scope === 'planning';
    const sampleSize = isTeamScope ? (context.teamReport?.sampleSize || 0) : (context.teamsOverview?.length || 0);

    if (!this.groq) {
      return this.generateDeterministicAnalysis(prompt, context);
    }

    try {
      const systemPrompt = `Eres el COPILOTO METODOLÓGICO Y PLANIFICADOR de Antigravity Methodology OS.
Tu misión es interpretar objetivamente el contexto metodológico estructurado que se te entrega y proponer diagnósticos, actuaciones y planificaciones semanales.

PRINCIPIOS INQUEBRANTABLES:
1. Ground Truth Estricto: Usa ÚNICAMENTE los datos entregados en el contexto JSON. NUNCA inventes números, partidos, nombres ni estadísticas.
2. Separación de Respuestas:
   - HECHOS (Facts): Datos directos, porcentajes y métricas verificables presentes en el contexto.
   - INTERPRETACIONES: Diagnóstico lógico derivado de las reglas metodológicas (ej. cobertura baja, fatiga en MD-1).
   - PROPUESTAS (Recommendations): Sugerencias orientativas para consideración humana.
3. Regla N < 3: Si un equipo tiene menos de 3 sesiones evaluadas (N < 3), DEBES declarar explícitamente que los datos son insuficientes para establecer tendencias estadísticas o diagnósticos concluyentes.
4. Cero persistencia directa: Todas las propuestas de actuación y planificación requieren revisión y confirmación explícita del usuario humano.
5. Formato de Salida: DEBES responder EXCLUSIVAMENTE con un JSON válido con la siguiente estructura:

{
  "answer": "Resumen ejecutivo directo de la respuesta para el usuario.",
  "facts": ["Hecho 1 comprobable...", "Hecho 2..."],
  "interpretations": ["Interpretación 1...", "Interpretación 2..."],
  "recommendations": ["Propuesta o recomendación metodológica 1..."],
  "evidence": [
    { "metric": "Nombre métrica", "value": "Valor", "reference": "Equipo o entidad" }
  ],
  "dataSufficiency": {
    "sufficient": true/false,
    "sampleSize": number,
    "notice": "Aviso si N < 3 o datos parciales"
  },
  "referencedTeams": ["Cadete A", "Juvenil B"],
  "actionProposals": [],
  "planningProposal": null
}`;

      const userMessage = `CONTEXTO METODOLÓGICO ACTUAL:
${JSON.stringify(context, null, 2)}

PREGUNTA DEL USUARIO:
${prompt}`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.1,
        response_format: { type: "json_object" }
      });

      const rawContent = completion.choices?.[0]?.message?.content || "{}";
      const parsed = JSON.parse(rawContent);

      return {
        answer: parsed.answer || "No se pudo generar un resumen.",
        facts: Array.isArray(parsed.facts) ? parsed.facts : [],
        interpretations: Array.isArray(parsed.interpretations) ? parsed.interpretations : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
        evidence: Array.isArray(parsed.evidence) ? parsed.evidence : [],
        dataSufficiency: parsed.dataSufficiency || {
          sufficient: sampleSize >= 3,
          sampleSize,
          notice: sampleSize < 3 ? "Muestra reducida (N < 3)." : undefined
        },
        referencedTeams: Array.isArray(parsed.referencedTeams) ? parsed.referencedTeams : [],
        actionProposals: Array.isArray(parsed.actionProposals) ? parsed.actionProposals : [],
        planningProposal: parsed.planningProposal || (context.scope === 'planning' ? buildAIPlanningProposal(context) : undefined)
      };

    } catch (err: any) {
      console.warn("Groq API error o fallback, usando generador determinista:", err.message);
      return this.generateDeterministicAnalysis(prompt, context);
    }
  }

  generateDeterministicAnalysis(prompt: string, context: MethodologyAIContext): MethodologyAIResponse {
    if (context.scope === 'planning') {
      const plan = buildAIPlanningProposal(context);
      const sampleSize = context.teamReport?.sampleSize || 0;
      const isInsufficient = sampleSize < 3;

      const facts = [
        `Planificación semanal generada para ${context.team?.name || 'Equipo'}.`,
        `Días de entrenamiento activos: ${plan.proposedMicrocycle.trainingDaysCount}, Total minutos: ${plan.proposedMicrocycle.totalPlannedMinutes} min.`,
        `Índice de carga semanal acumulada: ${plan.proposedMicrocycle.weeklyLoadIndex}%.`
      ];

      const interpretations = [
        `Estructura semanal distribuida respetando la proximidad al día de partido (${context.planningContext?.matchContext?.matchDayDate || 'Sin partido programado'}).`,
        `Carga modulada evitando sesiones de alta intensidad en MD-1.`
      ];

      const recommendations = [
        `Revisar los objetivos de sesión sugeridos para los días de entrenamiento programados.`,
        `Confirmar y aplicar la propuesta al constructor de microciclos.`
      ];

      return {
        answer: `Propuesta de planificación de microciclo generada para ${context.team?.name || 'Equipo'}: ${plan.proposedMicrocycle.trainingDaysCount} sesiones planificadas (${plan.proposedMicrocycle.totalPlannedMinutes} min).`,
        facts,
        interpretations,
        recommendations,
        evidence: plan.evidence,
        dataSufficiency: {
          sufficient: !isInsufficient,
          sampleSize,
          notice: isInsufficient ? "N < 3: Planificación basada en modelo general por muestra reducida." : undefined
        },
        referencedTeams: context.team?.name ? [context.team.name] : [],
        planningProposal: plan
      };
    }

    const isClub = context.scope === 'club_direction';
    const teams = context.teamsOverview || [];
    const attentionTeams = teams.filter(t => t.status === 'atencion');
    const trackingTeams = teams.filter(t => t.status === 'en_seguimiento');
    const solidTeams = teams.filter(t => t.status === 'solido');
    const insufficientTeams = teams.filter(t => t.status === 'datos_insuficientes');

    if (isClub) {
      const facts = [
        `Total de equipos auditados: ${teams.length}.`,
        `Equipos sólidos: ${solidTeams.length}, En seguimiento: ${trackingTeams.length}, En atención: ${attentionTeams.length}.`,
        `Equipos con datos insuficientes (N < 3): ${insufficientTeams.length}.`
      ];

      const interpretations: string[] = [];
      if (attentionTeams.length > 0) {
        interpretations.push(`Existen ${attentionTeams.length} equipo(s) que requieren intervención prioritaria por baja cobertura o RPE elevado.`);
      }
      if (solidTeams.length > 0) {
        interpretations.push(`${solidTeams.length} equipo(s) mantienen una alta adherencia al modelo de juego institucional.`);
      }

      const recommendations: string[] = [];
      const actionProposals: MethodologyAIActionProposal[] = [];

      if (attentionTeams.length > 0) {
        recommendations.push(`Revisar con los cuerpos técnicos de: ${attentionTeams.map(t => t.teamName).join(', ')} la planificación del próximo microciclo.`);
        
        attentionTeams.forEach((t, i) => {
          actionProposals.push(buildMicrocycleActionProposal({
            id: `act-auto-${i + 1}`,
            type: 'adjust_microcycle_day',
            title: `Ajustar Microciclo: ${t.teamName}`,
            rationale: `El equipo registra estado de atención con cobertura de ${t.modelCoveragePercentage}% y consecución de ${t.avgAchievement.toFixed(1)}/4.`,
            evidence: [
              { metric: 'Estado', value: t.status, reference: t.teamName },
              { metric: 'Consecución', value: `${t.avgAchievement.toFixed(1)}/4`, reference: t.teamName }
            ],
            target: { teamId: t.teamId, dayOfWeek: 3, microcycleDay: 'MD-3' },
            proposedChanges: {
              modificationsSummary: [
                'Priorizar principios rezagados en sesión principal',
                'Modular carga evitando picos de fatiga en días MD-1'
              ]
            }
          }));
        });
      } else {
        recommendations.push("Mantener la pauta de seguimiento y evaluación continua de sesiones.");
      }

      const evidence = teams.map(t => ({
        metric: `Estado metodológico: ${t.status}`,
        value: `Consecución: ${t.avgAchievement.toFixed(1)}/4, Cobertura: ${t.modelCoveragePercentage}%`,
        reference: t.teamName
      }));

      return {
        answer: `Diagnóstico global: ${solidTeams.length} equipos en estado óptimo, ${trackingTeams.length} en seguimiento y ${attentionTeams.length} requieren atención prioritaria.`,
        facts,
        interpretations,
        recommendations,
        evidence,
        dataSufficiency: {
          sufficient: teams.length > 0,
          sampleSize: teams.length,
          notice: insufficientTeams.length > 0 ? `${insufficientTeams.length} equipos tienen datos insuficientes.` : undefined
        },
        referencedTeams: teams.map(t => t.teamName),
        actionProposals
      };
    } else {
      const summary = context.teamReport?.summary || {
        totalSessions: 0,
        completedSessions: 0,
        evaluatedSessions: 0,
        evaluationPercentage: 0,
        avgObjectiveAchievement: 0,
        avgRpe: 0,
        modelCoveragePercentage: 0
      };
      const sampleSize = context.teamReport?.sampleSize || 0;
      const isInsufficient = sampleSize < 3;

      const facts = [
        `Sesiones evaluadas: ${sampleSize}.`,
        `Consecución media: ${summary.avgObjectiveAchievement?.toFixed(1) || '0.0'}/4.`,
        `Cobertura del modelo: ${summary.modelCoveragePercentage || 0}%.`
      ];

      const interpretations: string[] = [];
      const actionProposals: MethodologyAIActionProposal[] = [];

      if (isInsufficient) {
        interpretations.push("Muestra insuficiente (N < 3). No se pueden emitir tendencias concluyentes según las reglas metodológicas.");
      } else {
        if ((summary.avgObjectiveAchievement || 0) < 2.2) {
          interpretations.push("Nivel de consecución de objetivos por debajo del umbral de alarma (2.2).");
          actionProposals.push(buildSessionActionProposal({
            id: `act-sess-${context.team?.id || 'team'}`,
            type: 'regenerate_session_block',
            title: `Regenerar Bloque Principal: ${context.team?.name || 'Equipo'}`,
            rationale: 'Ajustar la tarea principal para favorecer la consecución del objetivo curricular.',
            target: { teamId: context.team?.id, blockId: 'principal_1' },
            proposedChanges: {
              modificationsSummary: ['Sustituir por tarea con menor oposición y mayor representatividad']
            }
          }));
        }
        if ((summary.modelCoveragePercentage || 0) < 60) {
          interpretations.push("Cobertura del currículo por debajo del objetivo mínimo del 60%.");
        }
      }

      const recommendations = isInsufficient
        ? ["Registrar y evaluar al menos 3 sesiones para habilitar el análisis de tendencias."]
        : ["Priorizar principios rezagados y modular la carga en días MD-1."];

      return {
        answer: isInsufficient
          ? "Datos insuficientes (N < 3): Muestra insuficiente para inferir tendencias estadísticas."
          : `El equipo ${context.team?.name || ''} registra una consecución de ${summary.avgObjectiveAchievement?.toFixed(1)}/4 con cobertura del ${summary.modelCoveragePercentage}%.`,
        facts,
        interpretations,
        recommendations,
        evidence: [
          { metric: "Sesiones evaluadas", value: sampleSize, reference: context.team?.name || "Equipo" },
          { metric: "Consecución", value: `${summary.avgObjectiveAchievement?.toFixed(1) || '0.0'}/4`, reference: context.team?.name || "Equipo" }
        ],
        dataSufficiency: {
          sufficient: !isInsufficient,
          sampleSize,
          notice: isInsufficient ? "N < 3: Muestra insuficiente para inferir tendencias." : undefined
        },
        referencedTeams: context.team?.name ? [context.team.name] : [],
        actionProposals
      };
    }
  }
}
