import { 
  TacticalPrincipleReadiness, 
  TeamCompetencyAggregation 
} from "./types";

interface TacticalMappingDefinition {
  code: string;
  name: string;
  gamePhase: 'Ataque' | 'Defensa' | 'Transición Ataque-Defensa' | 'Transición Defensa-Ataque' | 'Balón Parado';
  competencyIds: string[];
  description: string;
}

export class TeamTacticalIntelligenceService {
  private static instance: TeamTacticalIntelligenceService;

  private readonly principleMappings: TacticalMappingDefinition[] = [
    {
      code: 'salida_balon',
      name: 'Salida de Balón e Iniciación del Juego',
      gamePhase: 'Ataque',
      competencyIds: ['tac_salida_balon', 'tec_pase', 'tec_control', 'tec_perfil_corporal'],
      description: 'Capacidad de superar la primera línea de presión rival con circulación limpia y tercer hombre.'
    },
    {
      code: 'conservacion_posicion',
      name: 'Conservación y Juego Posicional',
      gamePhase: 'Ataque',
      competencyIds: ['tac_toma_decisiones', 'tac_ocupacion_espacios', 'tec_pase', 'tec_control'],
      description: 'Mantenimiento del balón en campo rival mediante ocupación racional y atracción.'
    },
    {
      code: 'presion_tras_perdida',
      name: 'Presión Tras Pérdida Inmediata (<3s)',
      gamePhase: 'Transición Ataque-Defensa',
      competencyIds: ['tac_transicion_defensiva', 'tac_presion', 'fis_aceleracion_velocidad'],
      description: 'Acoso intensivo en los primeros segundos post-pérdida para evitar contras y reiniciar ataque.'
    },
    {
      code: 'presion_alta',
      name: 'Presión Alta y Saltos de Acoso',
      gamePhase: 'Defensa',
      competencyIds: ['tac_presion', 'tac_toma_decisiones', 'fis_aceleracion_velocidad', 'psi_comunicacion'],
      description: 'Bloque alto coordinado para forzar pérdidas en el tercio defensivo rival.'
    },
    {
      code: 'transicion_ofensiva',
      name: 'Transición Ofensiva Rápida y Contraataque',
      gamePhase: 'Transición Defensa-Ataque',
      competencyIds: ['tac_toma_decisiones', 'fis_aceleracion_velocidad', 'tec_conduccion', 'tec_pase'],
      description: 'Explotación vertical de espacios tras recuperación de balón.'
    },
    {
      code: 'finalizacion_area',
      name: 'Finalización Rápida y Remate en Área',
      gamePhase: 'Ataque',
      competencyIds: ['tec_finalizacion', 'tec_regate', 'pos_st_desmarques_remate'],
      description: 'Eficacia en los últimos 20 metros y remates a 1-2 toques.'
    },
    {
      code: 'defensa_area',
      name: 'Defensa de Área y Duelos Directos',
      gamePhase: 'Defensa',
      competencyIds: ['pos_cb_duelo_cobertura', 'pos_gk_blocaje', 'psi_concentracion', 'tac_presion'],
      description: 'Solvencia en centros laterales, coberturas y contención en área propia.'
    }
  ];

  private constructor() {}

  public static getInstance(): TeamTacticalIntelligenceService {
    if (!TeamTacticalIntelligenceService.instance) {
      TeamTacticalIntelligenceService.instance = new TeamTacticalIntelligenceService();
    }
    return TeamTacticalIntelligenceService.instance;
  }

  /**
   * Evaluates collective readiness across all tactical game model principles.
   */
  public evaluateTacticalReadiness(teamCompetencies: TeamCompetencyAggregation[]): TacticalPrincipleReadiness[] {
    const readinessList: TacticalPrincipleReadiness[] = [];
    const compMap = new Map(teamCompetencies.map(c => [c.competencyId, c]));

    for (const mapping of this.principleMappings) {
      const scores: number[] = [];
      const usedCompNames: string[] = [];

      for (const cid of mapping.competencyIds) {
        const comp = compMap.get(cid);
        if (comp) {
          scores.push(comp.averageScore);
          usedCompNames.push(`${comp.competencyName} (${comp.averageScore}/5)`);
        }
      }

      const avgReadiness = scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
        : 3.0; // fallback neutral

      let readinessLevel: 'ALTO' | 'MEDIO' | 'CRITICO' = 'MEDIO';
      let isPriority = false;

      if (avgReadiness <= 2.7) {
        readinessLevel = 'CRITICO';
        isPriority = true;
      } else if (avgReadiness >= 3.8) {
        readinessLevel = 'ALTO';
      }

      const rationale = isPriority
        ? `Nivel colectivo crítico (${avgReadiness}/5) basado en: ${usedCompNames.join(', ')}. Requiere trabajo prioritario en sesiones.`
        : `Nivel colectivo ${readinessLevel.toLowerCase()} (${avgReadiness}/5) basado en: ${usedCompNames.join(', ')}.`;

      readinessList.push({
        principleCode: mapping.code,
        principleName: mapping.name,
        gamePhase: mapping.gamePhase,
        readinessScore: avgReadiness,
        readinessLevel,
        relatedCompetencyIds: mapping.competencyIds,
        isPriorityForTraining: isPriority,
        rationale
      });
    }

    return readinessList.sort((a, b) => a.readinessScore - b.readinessScore);
  }
}
