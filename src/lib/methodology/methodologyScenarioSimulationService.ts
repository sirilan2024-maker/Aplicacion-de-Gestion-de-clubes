/**
 * Servicio Determinista de Simulación de Escenarios Metodológicos v1.0 (TypeScript)
 * Antigravity Methodology OS - Fase 5.6
 */

import { validateMethodologySessionProposal } from "./methodologySessionGenerator";

export interface SimulatedScenarioResult {
  scenarioId: string;
  label: string;
  input: Record<string, any>;
  planned: {
    durationMin: number;
    targetLoad: string | number;
    objective: string;
  };
  simulated: {
    durationMin: number;
    targetLoad: string | number;
    objective: string;
  };
  deviations: {
    durationDiffMin: number;
    loadChanged: boolean;
  };
  methodologyImpact: {
    objectiveFocus: string;
    estimatedLoad: string | number;
    durationMin: number;
    principlesCovered: string[];
    suitabilityScore: 'alto' | 'moderado_con_riesgos' | 'no_recomendado';
  };
  constraintChecks: Array<{
    check: string;
    passed: boolean;
    reason?: string;
  }>;
  risks: string[];
  evidence: string[];
  deterministicValidation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export function simulateScenario(params: {
  scenarioId: string;
  label?: string;
  basePlan: any;
  modifications?: Record<string, any>;
  team?: any;
  curriculumPrinciples?: any[];
  historySummary?: any;
}): SimulatedScenarioResult {
  const {
    scenarioId,
    label,
    basePlan,
    modifications = {},
    team = {},
    curriculumPrinciples = [],
    historySummary = {}
  } = params;

  if (!scenarioId || !basePlan) {
    throw new Error("Parámetros obligatorios incompletos: se requiere scenarioId y basePlan.");
  }

  const isSession = Boolean(basePlan.blocks || basePlan.objective);

  const simulated = {
    ...basePlan,
    ...modifications
  };

  const constraintChecks: Array<{ check: string; passed: boolean; reason?: string }> = [];
  const risks: string[] = [];
  const deviations: { durationDiffMin: number; loadChanged: boolean } = {
    durationDiffMin: 0,
    loadChanged: false
  };

  const plannedDuration = basePlan.durationMinutes || basePlan.plannedDurationMin || 90;
  const simulatedDuration = simulated.durationMinutes || simulated.plannedDurationMin || plannedDuration;
  deviations.durationDiffMin = simulatedDuration - plannedDuration;

  const plannedLoad = basePlan.intensityLoad || basePlan.targetLoad || 'Media';
  const simulatedLoad = simulated.intensityLoad || simulated.targetLoad || plannedLoad;
  deviations.loadChanged = simulatedLoad !== plannedLoad;

  const md = simulated.microcycleDay || basePlan.microcycleDay || 'MD-3';
  if (md === 'MD-1' && (simulatedLoad === 'Alta' || simulatedLoad === 4 || simulatedLoad === 5)) {
    risks.push("Riesgo de Fatiga: Se ha simulado carga alta en jornada previa a competición (MD-1).");
    constraintChecks.push({ check: 'md_load_compatibility', passed: false, reason: 'MD-1 exige carga baja/moderada' });
  } else {
    constraintChecks.push({ check: 'md_load_compatibility', passed: true });
  }

  if (simulatedDuration > 120) {
    risks.push("Riesgo Temporal: Duración superior a 120 minutos excede el umbral pedagógico recomendado.");
    constraintChecks.push({ check: 'duration_bounds', passed: false, reason: 'Duración > 120 min' });
  } else if (simulatedDuration < 45) {
    risks.push("Advertencia: Duración inferior a 45 minutos puede comprometer la consecución del objetivo.");
    constraintChecks.push({ check: 'duration_bounds', passed: true });
  } else {
    constraintChecks.push({ check: 'duration_bounds', passed: true });
  }

  let deterministicValidation: any = { valid: true, errors: [], warnings: [] };
  if (isSession && simulated.blocks) {
    deterministicValidation = validateMethodologySessionProposal(simulated);
  }

  const methodologyImpact = {
    objectiveFocus: simulated.objective || basePlan.objective || 'Desarrollo táctico general',
    estimatedLoad: simulatedLoad,
    durationMin: simulatedDuration,
    principlesCovered: [simulated.objective || basePlan.objective].filter(Boolean),
    suitabilityScore: (constraintChecks.every(c => c.passed) && deterministicValidation.valid) ? 'alto' : 'moderado_con_riesgos' as any
  };

  const evidence = [
    `Duración simulada: ${simulatedDuration} min (Δ=${deviations.durationDiffMin >= 0 ? '+' : ''}${deviations.durationDiffMin} min)`,
    `Carga simulada: ${simulatedLoad} (Estructura: ${md})`,
    `Restricciones superadas: ${constraintChecks.filter(c => c.passed).length} de ${constraintChecks.length}`
  ];

  return {
    scenarioId,
    label: label || `Escenario ${scenarioId}`,
    input: modifications,
    planned: {
      durationMin: plannedDuration,
      targetLoad: plannedLoad,
      objective: basePlan.objective || 'Plan base'
    },
    simulated: {
      durationMin: simulatedDuration,
      targetLoad: simulatedLoad,
      objective: simulated.objective || basePlan.objective
    },
    deviations,
    methodologyImpact,
    constraintChecks,
    risks,
    evidence,
    deterministicValidation
  };
}
