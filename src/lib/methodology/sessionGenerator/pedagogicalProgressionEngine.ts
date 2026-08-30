import { SessionPhaseKey, SessionRequestIntent, ProgressionReport } from "./types";
import { evaluatePureTacticalAffinity } from "../tacticalEngine/tacticalAffinityEngine";

export interface ProgressionScoreBreakdown {
  totalScore: number;
  objectiveFit: number;
  categoryFit: number;
  pedagogicalFit: number;
  transitionFit: number;
  representationFit: number;
  microcycleFit: number;
  squadFit: number;
  spaceFit: number;
  goalkeeperFit: number;
  recencyPenalty: number;
  verificationConfidence: number;
  reasons: string[];
}

export class PedagogicalProgressionEngine {
  private static instance: PedagogicalProgressionEngine;

  private constructor() {}

  public static getInstance(): PedagogicalProgressionEngine {
    if (!PedagogicalProgressionEngine.instance) {
      PedagogicalProgressionEngine.instance = new PedagogicalProgressionEngine();
    }
    return PedagogicalProgressionEngine.instance;
  }

  /**
   * Computes a multi-factor score for an exercise given its phase, intent, and previous task context.
   */
  public scoreCandidate(
    exercise: any,
    phaseKey: SessionPhaseKey,
    intent: SessionRequestIntent,
    previousDrillExercise?: any
  ): ProgressionScoreBreakdown {
    const reasons: string[] = [];

    const name = (exercise.nombre || exercise.title || "").toLowerCase();
    const desc = (exercise.descripcion || exercise.description || "").toLowerCase();
    const exBlock = (exercise.bloque_sesion || "").toLowerCase();
    const exType = (exercise.tipo || "").toLowerCase();
    const tacObj = (exercise.objetivo_tactico || (exercise.tacticalObjective ? [exercise.tacticalObjective] : [])).map((t: string) => t.toLowerCase());
    const tecObj = (exercise.objetivo_tecnico || (exercise.technicalObjective ? [exercise.technicalObjective] : [])).map((t: string) => t.toLowerCase());
    const tags = (exercise.tags || []).map((t: string) => t.toLowerCase());

    const minP = exercise.min_players ?? (exercise.players ? parseInt(String(exercise.players).split("-")[0], 10) : undefined);
    const maxP = exercise.max_players ?? (exercise.players ? parseInt(String(exercise.players).split("-")[1] || exercise.players, 10) : undefined);
    const cargaFisica = exercise.carga_fisica ?? 2;
    const cargaCognitiva = exercise.carga_cognitiva ?? 2;
    const oposicion = exercise.oposicion ?? 2;
    const representatividad = exercise.representatividad ?? 2;

    // ─── 1. EXCLUSIONES SEMÁNTICAS (Descarte Estricto) ───────────────────────
    if (intent.excludedObjectives && intent.excludedObjectives.length > 0) {
      for (const excl of intent.excludedObjectives) {
        const e = excl.toLowerCase();
        const matchTac = tacObj.some((t: string) => t.includes(e) || e.includes(t));
        const matchTags = tags.some((t: string) => t.includes(e));
        const matchName = name.includes(e);

        if (matchTac || matchTags || matchName) {
          reasons.push(`⚠️ Excluido explícitamente: ${excl}`);
          return {
            totalScore: -500,
            objectiveFit: -500,
            categoryFit: 0,
            pedagogicalFit: 0,
            transitionFit: 0,
            representationFit: 0,
            microcycleFit: 0,
            squadFit: 0,
            spaceFit: 0,
            goalkeeperFit: 0,
            recencyPenalty: 0,
            verificationConfidence: 0,
            reasons
          };
        }
      }
    }

    // ─── 2. OBJECTIVE FIT (Afinidad Táctica Pura con Precedencia Absoluta) ───
    let objectiveFit = 0;
    const pureTacticalEval = evaluatePureTacticalAffinity(exercise, { 
      name: intent.primaryObjective, 
      game_phase: intent.primaryObjective 
    });

    if (phaseKey === "principal_1" || phaseKey === "principal_2" || phaseKey === "global") {
      // Para fases principales y global, la afinidad táctica es OBLIGATORIA
      if (!pureTacticalEval || !pureTacticalEval.hasMeaningfulAffinity) {
        // Comprobar si coincide con algún objetivo secundario explícito
        let matchedSecondary = false;
        if (intent.secondaryObjectives && intent.secondaryObjectives.length > 0) {
          for (const sec of intent.secondaryObjectives) {
            const secEval = evaluatePureTacticalAffinity(exercise, { name: sec, game_phase: sec });
            if (secEval && secEval.hasMeaningfulAffinity) {
              matchedSecondary = true;
              objectiveFit += (secEval.affinityType === "DIRECT" ? 35 : 20) + secEval.tacticalScore;
              reasons.push(`Alineado con objetivo secundario: "${sec}" (${secEval.affinityType})`);
              break;
            }
          }
        }

        if (!matchedSecondary) {
          reasons.push(`⚠️ Sin afinidad táctica real con "${intent.primaryObjective}"`);
          return {
            totalScore: -500,
            objectiveFit: -500,
            categoryFit: 0,
            pedagogicalFit: 0,
            transitionFit: 0,
            representationFit: 0,
            microcycleFit: 0,
            squadFit: 0,
            spaceFit: 0,
            goalkeeperFit: 0,
            recencyPenalty: 0,
            verificationConfidence: 0,
            reasons
          };
        }
      } else {
        if (pureTacticalEval.affinityType === "DIRECT") {
          objectiveFit += 50 + pureTacticalEval.tacticalScore;
          reasons.push(`Afinidad táctica directa principal: "${intent.primaryObjective}" (+${pureTacticalEval.tacticalScore} táctico)`);
        } else {
          objectiveFit += 25 + pureTacticalEval.tacticalScore;
          reasons.push(`Afinidad táctica secundaria: "${intent.primaryObjective}" (+${pureTacticalEval.tacticalScore} táctico)`);
        }
      }
    } else if (phaseKey === "activacion") {
      // En activación, se bonifican las tareas conectadas con el objetivo, pero se admiten rondos/activaciones genéricas no contradictorias
      if (pureTacticalEval && pureTacticalEval.hasMeaningfulAffinity) {
        objectiveFit += (pureTacticalEval.affinityType === "DIRECT" ? 40 : 20) + pureTacticalEval.tacticalScore;
        reasons.push(`Activación conectada con objetivo táctico: "${intent.primaryObjective}"`);
      } else if (exBlock.includes("calentamiento") || exBlock.includes("activacion") || exType.includes("calentamiento") || exType.includes("rondo")) {
        objectiveFit += 15;
        reasons.push("Activación general técnico-coordinativa");
      }
    } else if (phaseKey === "vuelta_calma") {
      objectiveFit += 20;
    }

    // ─── 2.5 CATEGORY FIT (Afinidad y Filtro de Categoría de Edad) ─────────
    let categoryFit = 0;
    if (intent.ageCategory) {
      const exCats: string[] = Array.isArray(exercise.categoria_edad) 
        ? exercise.categoria_edad 
        : [exercise.age_category].filter(Boolean);
      
      const targetCat = intent.ageCategory.toLowerCase().trim();
      if (exCats.some(c => c && c.toLowerCase() === targetCat)) {
        categoryFit += 25;
        reasons.push(`Categoría idónea (${targetCat})`);
      } else {
        const catOrder = ["querubin", "prebenjamin", "benjamin", "alevin", "infantil", "cadete", "juvenil", "senior"];
        const targetIdx = catOrder.indexOf(targetCat);
        const exIdx = catOrder.indexOf((exercise.age_category || exCats[0] || "").toLowerCase());
        if (targetIdx !== -1 && exIdx !== -1) {
          const dist = Math.abs(targetIdx - exIdx);
          if (dist === 1) {
            categoryFit += 10;
          } else if (dist >= 3) {
            categoryFit -= 50; // Penalizar fuertemente categorías incompatibles (ej. U6 en Senior)
          }
        }
      }
    }

    // ─── 3. PEDAGOGICAL FIT (Rol Didáctico del Bloque) ───────────────────────
    let pedagogicalFit = 0;

    switch (phaseKey) {
      case "activacion":
        if (exBlock.includes("calentamiento") || exBlock.includes("activacion") || exType.includes("calentamiento") || exType.includes("rondo")) {
          pedagogicalFit += 35;
        }
        if (oposicion <= 2 && cargaFisica <= 2) {
          pedagogicalFit += 20;
          reasons.push("Activación progresiva con baja oposición");
        } else if (oposicion > 2 || cargaFisica > 3) {
          pedagogicalFit -= 40; // Penalizar sobrecarga en calentamiento
        }
        break;

      case "principal_1":
        // Fijación conceptual / patrones de acción
        if (exType.includes("analitico") || exType.includes("rondo") || exType.includes("juego_medio") || exBlock.includes("principal")) {
          pedagogicalFit += 35;
        }
        if (oposicion >= 1 && oposicion <= 3 && representatividad <= 3) {
          pedagogicalFit += 25;
          reasons.push("Fijación táctica con oposición controlada");
        }
        break;

      case "principal_2":
        // Progresión / Oposición / Toma de decisiones
        if (exType.includes("juego_medio") || exType.includes("ssg") || exType.includes("globalizacion")) {
          pedagogicalFit += 35;
        }
        if (oposicion >= 2 && representatividad >= 2) {
          pedagogicalFit += 25;
          reasons.push("Progresión táctica con mayor incertidumbre");
        }
        break;

      case "global":
        // Transferencia competitiva
        if (exBlock === "global" || exType.includes("juego_global") || exType.includes("ssg") || exType.includes("partido") || exType.includes("conditioned")) {
          pedagogicalFit += 50;
        }
        if (representatividad >= 3 && oposicion >= 3) {
          pedagogicalFit += 30;
          reasons.push("Transferencia competitiva en situación representativa");
        } else if (representatividad < 3 || oposicion < 2) {
          pedagogicalFit -= 40; // Penalizar tareas con baja representatividad en bloque global
        }
        break;

      case "vuelta_calma":
        if (exBlock.includes("vuelta_calma") || exType.includes("vuelta_calma") || name.includes("vuelta") || name.includes("calma") || name.includes("estiramiento") || name.includes("regenerat")) {
          pedagogicalFit += 50;
        }
        if (cargaFisica <= 2 && oposicion <= 1 && cargaCognitiva <= 2) {
          pedagogicalFit += 30;
          reasons.push("Regeneración fisiológica y asimilación conceptual");
        } else {
          pedagogicalFit -= 150; // Penalización severa a tareas intensas en vuelta a la calma
        }
        break;
    }

    // ─── 4. TRANSITION FIT (Afinidad con la Tarea Previa) ────────────────────
    let transitionFit = 0;
    if (previousDrillExercise) {
      const prevTac = (previousDrillExercise.objetivo_tactico || (previousDrillExercise.tacticalObjective ? [previousDrillExercise.tacticalObjective] : [])).map((t: string) => t.toLowerCase());
      const prevTags = (previousDrillExercise.tags || []).map((t: string) => t.toLowerCase());
      const prevOpo = previousDrillExercise.oposicion ?? 2;
      const prevRep = previousDrillExercise.representatividad ?? 2;

      // Evaluar coincidencia de conceptos tácticos
      const sharedTactics = tacObj.filter((t: string) => prevTac.some((pt: string) => pt.includes(t) || t.includes(pt)));
      const sharedTags = tags.filter((t: string) => prevTags.includes(t));

      if (sharedTactics.length > 0 || sharedTags.length > 0) {
        transitionFit += 25;
        reasons.push("Afinidad conceptual directa con la tarea previa");
      }

      // Evaluar progresión didáctica (la oposición y representatividad no deben dar saltos regresivos en fase principal)
      if (phaseKey === "principal_2" && (oposicion >= prevOpo || representatividad >= prevRep)) {
        transitionFit += 15;
        reasons.push("Progresión ascendente de oposición/representatividad");
      } else if (phaseKey === "global" && representatividad >= prevRep) {
        transitionFit += 15;
        reasons.push("Transferencia a máxima representatividad");
      }
    }

    // ─── 5. REPRESENTATION FIT (Curva de Complejidad) ────────────────────────
    let representationFit = 0;
    if (phaseKey === "global" && representatividad >= 3) {
      representationFit += 20;
    } else if (phaseKey === "principal_1" && representatividad <= 3) {
      representationFit += 10;
    }

    // ─── 6. MICROCICLE FIT (MD-x Periodization) ──────────────────────────────
    let microcycleFit = 0;
    const md = intent.microcycleDay;

    if (md) {
      if (md === "MD-4") {
        // Tensión / Fuerza / Espacios Reducidos / Aceleraciones
        if (oposicion >= 3 || cargaFisica >= 3 || name.includes("rondo") || name.includes("duelo") || name.includes("1v1") || name.includes("espacio reducido")) {
          microcycleFit += 25;
          reasons.push("Alineado con MD-4 (Tensión / Fuerza / Duelos)");
        }
      } else if (md === "MD-3") {
        // Extensión / Resistencia Táctica / Espacios Medios-Grandes
        if (representatividad >= 3 || exType.includes("juego_medio") || exType.includes("juego_global") || name.includes("posici") || name.includes("sector")) {
          microcycleFit += 25;
          reasons.push("Alineado con MD-3 (Extensión / Resistencia / Espacios amplios)");
        }
      } else if (md === "MD-2") {
        // Velocidad / Reacción / Finalización
        if (name.includes("finalizaci") || name.includes("tiro") || name.includes("velocidad") || name.includes("transici") || exType.includes("ssg")) {
          microcycleFit += 25;
          reasons.push("Alineado con MD-2 (Velocidad / Reacción / Finalización)");
        }
      } else if (md === "MD-1") {
        // Activación / Balón Parado / Carga Reducida
        if (cargaFisica <= 2 || name.includes("abp") || name.includes("activaci") || name.includes("estrategia")) {
          microcycleFit += 25;
          reasons.push("Alineado con MD-1 (Activación pre-partido / Carga baja)");
        } else if (cargaFisica >= 3 || oposicion >= 3) {
          microcycleFit -= 30; // Evitar fatiga en MD-1
        }
      } else if (md === "MD+1") {
        // Regeneración post-partido
        if (cargaFisica <= 2 && oposicion <= 2) {
          microcycleFit += 25;
          reasons.push("Alineado con MD+1 (Regeneración post-partido)");
        }
      }
    }

    // ─── 7. SQUAD FIT (Ajuste a Jugadores Disponibles) ───────────────────────
    let squadFit = 0;
    const p = intent.players;
    if (p && minP !== undefined && maxP !== undefined) {
      if (p >= minP && p <= maxP) {
        squadFit += 20;
        reasons.push(`Ratio de plantilla ideal (${p} jugadores)`);
      } else if (p >= minP - 2 && p <= maxP + 4) {
        squadFit += 10;
      } else {
        squadFit -= 15;
      }
    }

    // ─── 8. SPACE FIT (Compatibilidad Espacial) ──────────────────────────────
    let spaceFit = 0;
    const space = intent.space;
    if (space) {
      if (space.includes("1/4") || space.includes("reducido")) {
        if (name.includes("campo completo") || name.includes("11v11")) {
          spaceFit -= 50; // Incompatible
        } else if (name.includes("rondo") || name.includes("espacio reducido") || name.includes("3v3") || name.includes("4v4")) {
          spaceFit += 20;
          reasons.push("Ajuste óptimo a 1/4 de campo");
        }
      } else if (space.includes("campo completo") || space.includes("11v11")) {
        if (exType.includes("juego_global") || name.includes("partido") || name.includes("posici")) {
          spaceFit += 20;
          reasons.push("Aprovechamiento de campo completo");
        }
      }
    }

    // ─── 9. GOALKEEPER FIT (Adaptación a Porteros Disponibles) ───────────────
    let goalkeeperFit = 0;
    const gk = intent.goalkeepers;
    if (gk !== undefined) {
      if (gk === 0) {
        if (name.includes("portero") || name.includes("+gk") || name.includes("+ gk") || name.includes("remate a portería")) {
          goalkeeperFit -= 30; // Penalizar si requiere porteros y no hay
        } else if (name.includes("rondo") || name.includes("posesión") || name.includes("miniporterias")) {
          goalkeeperFit += 15;
          reasons.push("Compatible sin porteros (0 GK)");
        }
      } else if (gk === 1) {
        if (name.includes("ataque-defensa") || name.includes("oleadas") || name.includes("1 portería") || name.includes("finalización")) {
          goalkeeperFit += 20;
          reasons.push("Diseñado para 1 portería activa (1 GK)");
        }
      } else if (gk >= 2) {
        if (exType.includes("juego_global") || exType.includes("ssg") || name.includes("partido") || name.includes("2 porterías")) {
          goalkeeperFit += 20;
          reasons.push("Diseñado con 2 porteros activos (2 GK)");
        }
      }
    }

    // ─── 10. RECENCY PENALTY (Memoria Histórica) ──────────────────────────────
    let recencyPenalty = 0;
    const recentIds = intent.recentExerciseIds || [];
    if (recentIds.includes(exercise.id) || recentIds.includes(exercise.nombre)) {
      recencyPenalty = -25;
      reasons.push("Penalización por uso reciente en sesiones previas");
    }

    // ─── 11. VERIFICATION CONFIDENCE ──────────────────────────────────────────
    let verificationConfidence = 0;
    if (exercise.verificationStatus === "VERIFIED") {
      verificationConfidence += 15;
      reasons.push("Evidencia documental externa verificada");
    } else if (!exercise.is_external && !exercise.external) {
      verificationConfidence += 10;
      reasons.push("Biblioteca oficial Sporting Saladar");
    }

    const totalScore = 
      objectiveFit +
      categoryFit +
      pedagogicalFit +
      transitionFit +
      representationFit +
      microcycleFit +
      squadFit +
      spaceFit +
      goalkeeperFit +
      recencyPenalty +
      verificationConfidence;

    return {
      totalScore,
      objectiveFit,
      categoryFit,
      pedagogicalFit,
      transitionFit,
      representationFit,
      microcycleFit,
      squadFit,
      spaceFit,
      goalkeeperFit,
      recencyPenalty,
      verificationConfidence,
      reasons
    };
  }

  /**
   * Generates a pedagogical progression report validating the continuity of the full session.
   */
  public evaluateSessionProgression(drills: any[], intent: SessionRequestIntent): ProgressionReport {
    const oppositionCurve = drills.map(d => d.exercise?.oposicion ?? (d.oppositionLevel ?? 2));
    const representativenessCurve = drills.map(d => d.exercise?.representatividad ?? (d.representativeness ?? 2));
    const cognitiveCurve = drills.map(d => d.exercise?.carga_cognitiva ?? (d.cognitiveLoad ?? 2));

    // Evaluar afinidad P1 -> P2
    const p1 = drills.find(d => d.phase === "principal_1");
    const p2 = drills.find(d => d.phase === "principal_2");
    let affinityScoreP1P2 = 70;
    if (p1 && p2) {
      const p1Tac = (p1.exercise?.objetivo_tactico || []).map((t: string) => t.toLowerCase());
      const p2Tac = (p2.exercise?.objetivo_tactico || []).map((t: string) => t.toLowerCase());
      const hasOverlap = p1Tac.some((t: string) => p2Tac.some((pt: string) => pt.includes(t) || t.includes(pt)));
      if (hasOverlap) affinityScoreP1P2 = 95;
    }

    // Evaluar afinidad P2 -> Global
    const globalDrill = drills.find(d => d.phase === "global");
    let affinityScoreP2Global = 70;
    if (p2 && globalDrill) {
      const p2Tac = (p2.exercise?.objetivo_tactico || []).map((t: string) => t.toLowerCase());
      const globTac = (globalDrill.exercise?.objetivo_tactico || []).map((t: string) => t.toLowerCase());
      const hasOverlap = p2Tac.some((t: string) => globTac.some((gt: string) => gt.includes(t) || t.includes(gt)));
      if (hasOverlap) affinityScoreP2Global = 90;
    }

    // Validar si la cadena didáctica es consistente
    // REGLA EXPLÍCITA: vuelta_calma debe existir, pertenecer al catálogo, carga_fisica <= 2, oposicion <= 1
    const vueltaCalmaDrill = drills.find(d => d.phase === "vuelta_calma");
    let isVueltaCalmaSafe = false;
    if (vueltaCalmaDrill && vueltaCalmaDrill.exercise) {
      const vcCargaFisica = vueltaCalmaDrill.exercise.carga_fisica ?? 999; // 999 = desconocido → inseguro
      const vcOposicion = vueltaCalmaDrill.exercise.oposicion ?? 999;
      isVueltaCalmaSafe = vcCargaFisica <= 2 && vcOposicion <= 1;
    }
    // Si no existe drill de vuelta_calma → isVueltaCalmaSafe = false → chainValid = false
    const chainValid = Boolean(affinityScoreP1P2 >= 70 && isVueltaCalmaSafe);

    return {
      oppositionCurve,
      representativenessCurve,
      cognitiveCurve,
      affinityScoreP1P2,
      affinityScoreP2Global,
      microcycleFit: intent.microcycleDay ? `Alineado con ${intent.microcycleDay}` : "Estándar",
      goalkeeperFit: intent.goalkeepers !== undefined ? `${intent.goalkeepers} GK integrados` : "Auto",
      spaceFit: intent.space || "Estándar",
      chainValid
    };
  }
}
