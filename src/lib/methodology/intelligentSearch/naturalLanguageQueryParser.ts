import { ParsedSearchIntent } from "./types";

export class NaturalLanguageQueryParser {
  private static readonly AGE_PATTERNS: Record<string, RegExp[]> = {
    querubin: [/querub[ií]n/i, /\bu6\b/i, /sub-?6/i],
    prebenjamin: [/prebenjam[ií]n/i, /\bu7\b/i, /\bu8\b/i, /sub-?7/i, /sub-?8/i],
    benjamin: [/benjam[ií]n/i, /\bu9\b/i, /\bu10\b/i, /sub-?9/i, /sub-?10/i],
    alevin: [/alev[ií]n/i, /\bu11\b/i, /\bu12\b/i, /sub-?11/i, /sub-?12/i],
    infantil: [/infantil/i, /\bu13\b/i, /\bu14\b/i, /sub-?13/i, /sub-?14/i, /infantiles/i],
    cadete: [/cadete/i, /\bu15\b/i, /\bu16\b/i, /sub-?15/i, /sub-?16/i, /cadetes/i],
    juvenil: [/juvenil/i, /\bu17\b/i, /\bu18\b/i, /\bu19\b/i, /sub-?17/i, /sub-?19/i, /juveniles/i],
    senior: [/senior/i, /amateur/i, /primer equipo/i]
  };

  private static readonly OBJECTIVE_PATTERNS: Record<string, RegExp[]> = {
    "presión tras pérdida": [
      /presi[oó]n\s+tras\s+p[eé]rdida/i,
      /pressing\s+tras\s+p[eé]rdida/i,
      /acoso\s+tras\s+p[eé]rdida/i,
      /recuperaci[oó]n\s+inmediata(?:\s+tras\s+p[eé]rdida)?/i,
      /\bptp\b/i,
      /gegenpressing/i,
      /contra-?presi[oó]n/i,
      /re-?presi[oó]n/i
    ],
    "repliegue": [/repliegue(?:\s+defensivo)?/i, /temporizaci[oó]n\s+defensiva/i],
    "transición defensiva": [/transici[oó]n\s+defensiva/i, /balance\s+defensivo/i, /reorganizaci[oó]n\s+defensiva/i],
    "presión alta": [/presi[oó]n\s+alta/i, /bloque\s+alto/i, /acoso\s+alto/i, /pressing\s+alto/i, /presi[oó]n\s+adelantada/i],
    "posesión": [
      /posesi[oó]n\s+y\s+circulaci[oó]n/i,
      /circulaci[oó]n\s+y\s+posesi[oó]n/i,
      /posesi[oó]n/i,
      /circulaci[oó]n/i,
      /conservaci[oó]n/i,
      /mantenimiento/i,
      /rondo/i
    ],
    "salida de balón": [/salida\s+de\s+bal[oó]n/i, /salida\s+limpia/i, /iniciaci[oó]n/i, /construcci[oó]n/i],
    "finalización": [
      /finalizaci[oó]n\s+y\s+remate/i,
      /remate\s+y\s+finalizaci[oó]n/i,
      /finalizaci[oó]n/i,
      /remate/i,
      /tiro/i,
      /\bgol\b/i,
      /chut/i,
      /definici[oó]n/i
    ],
    "transición ofensiva": [/transici[oó]n\s+ofensiva/i, /contraataque/i, /ataque\s+r[aá]pido/i, /verticalidad/i],
    "amplitud": [/amplitud/i, /cambio\s+de\s+orientaci[oó]n/i, /juego\s+exterior/i, /extremos/i],
    "profundidad": [/profundidad/i, /desmarque\s+de\s+ruptura/i, /filtrar\s+pase/i],
    "progresión": [
      /progresi[oó]n\s+y\s+duelos(?:\s+1v1)?/i,
      /progresi[oó]n/i,
      /duelos(?:\s+1v1)?/i,
      /\b1v1\b/i,
      /\b1c1\b/i,
      /1\s+contra\s+1/i,
      /1\s+c\s+1/i,
      /mano\s+a\s+mano/i,
      /regate/i,
      /desborde/i,
      /superar\s+l[ií]neas/i,
      /hombre\s+libre/i
    ],
    "organización defensiva": [/organizaci[oó]n\s+defensiva/i, /defensa\s+organizada/i, /basculaci[oó]n/i, /defensa\s+zonal/i, /bloque\s+medio/i, /bloque\s+bajo/i],
    "calentamiento": [/calentamiento/i, /activaci[oó]n/i, /rueda\s+de\s+pase/i],
    "coordinación": [/coordinaci[oó]n/i, /psicomotricidad/i, /agilidad/i],
    "balón parado": [/\babp\b/i, /c[oó]rner/i, /falta\s+lateral/i, /bal[oó]n\s+parado/i, /estrategia/i]
  };

  private static readonly SPACE_PATTERNS: Record<string, RegExp[]> = {
    "1/4 de campo": [/1\/4\s*(?:de\s*)?campo/i, /cuarto\s+de\s+campo/i, /doble\s+[aá]rea/i],
    "1/2 campo": [/1\/2\s*(?:de\s*)?campo/i, /medio\s+campo/i, /medio\s+terreno/i],
    "3/4 de campo": [/3\/4\s*(?:de\s*)?campo/i, /tres\s+cuartos\s+(?:de\s*)?campo/i],
    "campo completo": [/campo\s+completo/i, /todo\s+el\s+campo/i, /11v11/i, /campo\s+entero/i],
    "espacio reducido": [/espacio\s+reducido/i, /campo\s+peque[ñn]o/i, /cuadrado\s+peque[ñn]o/i, /zona\s+reducida/i]
  };

  public static parse(query: string): ParsedSearchIntent {
    const raw = (query || "").trim();

    // 1. Detect Exclusivity Directive ("exclusivamente", "solo", "únicamente")
    const isExclusivePriority = /(?:exclusivamente|solo\b|s[oó]lo\b|únicamente|exclusivo)/i.test(raw);

    // 2. Extract Goalkeepers (e.g., "2 porteros", "sin porteros", "1 arquero")
    let extractedGoalkeepers: number | undefined;
    const matchGk = raw.match(/(\d+)\s*(?:porteros?|arqueros?|guardametas?|gk)/i);
    if (matchGk) {
      extractedGoalkeepers = parseInt(matchGk[1], 10);
    } else if (/(?:sin\s+(?:porteros?|arqueros?|guardametas?)|0\s*porteros?)/i.test(raw)) {
      extractedGoalkeepers = 0;
    }

    // 2.1 Detect Explicit Exclusion Clauses (FASE 56)
    const excludedObjectives: string[] = [];
    let positiveText = raw;

    const exclusionRegexes = [
      /(?:no\s+quiero|no\s+deseo|sin\b|no\s+trabajar|evita(?:r)?|no\s+incluir|excluye|excluyendo)\s+([^.,;\n]+?)(?:como\s+objetivo\s+principal|[.,;\n]|$)/gi,
      /(?:evitando|descartando)\s+([^.,;\n]+)/gi
    ];

    for (const regex of exclusionRegexes) {
      let match;
      while ((match = regex.exec(raw)) !== null) {
        const fullMatch = match[0];
        const snippet = match[1] || "";

        // Si es una cláusula de porteros, ignorar como exclusión táctica
        if (/(?:porteros?|arqueros?|guardametas?)/i.test(snippet)) {
          continue;
        }
        
        for (const [obj, objRegexes] of Object.entries(this.OBJECTIVE_PATTERNS)) {
          for (const oRegex of objRegexes) {
            if (oRegex.test(snippet) && !excludedObjectives.includes(obj)) {
              excludedObjectives.push(obj);
              break;
            }
          }
        }

        if (/repliegue/i.test(snippet) && !excludedObjectives.includes("repliegue")) {
          excludedObjectives.push("repliegue");
        }
        if (/presi[oó]n\s+tras\s+p[eé]rdida/i.test(snippet) && !excludedObjectives.includes("presión tras pérdida")) {
          excludedObjectives.push("presión tras pérdida");
        }
        if (/presi[oó]n\s+alta/i.test(snippet) && !excludedObjectives.includes("presión alta")) {
          excludedObjectives.push("presión alta");
        }

        positiveText = positiveText.replace(fullMatch, " ");
      }
    }

    let cleaned = positiveText;
    let extractedAgeCategory: string | undefined;
    const extractedObjectives: string[] = [];
    let extractedPlayersMin: number | undefined;
    let extractedPlayersMax: number | undefined;
    let extractedDurationMin: number | undefined;
    let extractedDurationMax: number | undefined;
    let extractedSpace: string | undefined;
    let extractedMicrocycleDay: string | undefined;

    // 2.5 Extract Microcycle Day (MD-x / MD+x)
    const matchMd = raw.match(/\b(MD\s*[-+]\s*[1-5]|MD\s*\+\s*1|MD\s*-\s*1|MD\s*-\s*2|MD\s*-\s*3|MD\s*-\s*4|MD\s*-\s*5|\bMD\b)/i);
    if (matchMd) {
      extractedMicrocycleDay = matchMd[0].replace(/\s+/g, "").toUpperCase();
      cleaned = cleaned.replace(matchMd[0], " ").trim();
    } else if (/(?:recuperaci[oó]n|post-?partido)/i.test(raw)) {
      extractedMicrocycleDay = "MD+1";
    } else if (/(?:activaci[oó]n\s+pre-?partido|pre-?partido)/i.test(raw)) {
      extractedMicrocycleDay = "MD-1";
    }

    // 3. Extract Player Counts (ÚNICAMENTE si hay indicación explícita de jugadores/plantilla; NUNCA por '1v1', '3v2', '5v5')
    const matchPlayersRange = cleaned.match(/(\d+)\s*(?:a|-)\s*(\d+)\s*(?:jugadores|jug|futbolistas|plantilla|pax)\b/i);
    if (matchPlayersRange) {
      extractedPlayersMin = parseInt(matchPlayersRange[1], 10);
      extractedPlayersMax = parseInt(matchPlayersRange[2], 10);
      cleaned = cleaned.replace(matchPlayersRange[0], " ").trim();
    } else {
      const matchExactPlayers = cleaned.match(/(?:para\s+)?(\d+)\s*(?:jugadores|jug|futbolistas|pax)\b/i) ||
                                cleaned.match(/plantilla\s+(?:de\s+)?(\d+)/i);
      if (matchExactPlayers) {
        const p = parseInt(matchExactPlayers[1], 10);
        extractedPlayersMin = p;
        extractedPlayersMax = p;
        cleaned = cleaned.replace(matchExactPlayers[0], " ").trim();
      }
    }

    // 4. Extract Age
    for (const [cat, regexes] of Object.entries(this.AGE_PATTERNS)) {
      for (const regex of regexes) {
        if (regex.test(cleaned) || (extractedAgeCategory === undefined && regex.test(positiveText))) {
          extractedAgeCategory = cat;
          cleaned = cleaned.replace(regex, " ").trim();
          break;
        }
      }
      if (extractedAgeCategory) break;
    }

    // 5. Extract Positive Objectives (filtering out any that are excluded)
    for (const [obj, regexes] of Object.entries(this.OBJECTIVE_PATTERNS)) {
      if (excludedObjectives.includes(obj)) continue; // Skip if explicitly excluded
      for (const regex of regexes) {
        if (regex.test(cleaned) || regex.test(positiveText)) {
          if (!extractedObjectives.includes(obj)) {
            extractedObjectives.push(obj);
          }
          cleaned = cleaned.replace(regex, " ").trim();
        }
      }
    }

    // 6. Extract Duration (e.g. "15 min", "20 minutos", "75 minutos")
    const matchDurRange = cleaned.match(/(\d+)\s*(?:a|-)\s*(\d+)\s*(?:minutos|min|m\b)/i);
    if (matchDurRange) {
      extractedDurationMin = parseInt(matchDurRange[1], 10);
      extractedDurationMax = parseInt(matchDurRange[2], 10);
      cleaned = cleaned.replace(matchDurRange[0], " ").trim();
    } else {
      const matchExactDur = cleaned.match(/(\d+)\s*(?:minutos|min|m\b)/i);
      if (matchExactDur) {
        const dur = parseInt(matchExactDur[1], 10);
        extractedDurationMin = dur;
        extractedDurationMax = dur;
        cleaned = cleaned.replace(matchExactDur[0], " ").trim();
      }
    }

    // 7. Extract Space
    for (const [spaceName, regexes] of Object.entries(this.SPACE_PATTERNS)) {
      for (const regex of regexes) {
        if (regex.test(cleaned)) {
          extractedSpace = spaceName;
          cleaned = cleaned.replace(regex, " ").trim();
          break;
        }
      }
      if (extractedSpace) break;
    }

    // 8. Extract Intensity
    let extractedIntensity: 'baja' | 'media' | 'alta' | undefined;
    if (/(?:m[aá]s\s+intensa|mayor\s+intensidad|alta\s+intensidad|m[aá]xima\s+intensidad|intensa\b)/i.test(cleaned)) {
      extractedIntensity = 'alta';
    } else if (/(?:baja\s+intensidad|suave\b|regenerativo)/i.test(cleaned)) {
      extractedIntensity = 'baja';
    }

    // 9. Extract Requested External Sources & Counts
    const requestedExternalSources: string[] = [];
    let requestedExternalCount: number | undefined;

    if (/\buefa\b/i.test(raw)) requestedExternalSources.push("UEFA");
    if (/\brfef\b/i.test(raw)) requestedExternalSources.push("RFEF");
    if (/the\s+fa|fa\s+learning/i.test(raw)) requestedExternalSources.push("The FA");
    if (/footballdna/i.test(raw)) requestedExternalSources.push("FootballDNA");
    if (/soccer\s+coach\s+weekly/i.test(raw)) requestedExternalSources.push("Soccer Coach Weekly");
    if (/the\s+coaching\s+manual|coaching\s+manual/i.test(raw)) requestedExternalSources.push("The Coaching Manual");

    // Match counts like "2 ejercicios externos", "dos ejercicios de uefa", "1 externo", "3 ejercicios de The Coaching Manual"
    const matchExtCount = raw.match(/(\d+|un|una|dos|tres|cuatro)\s*(?:ejercicios?\s*)?(?:externos?|de\s+(?:uefa|rfef|the fa|footballdna|soccer coach weekly|the coaching manual|coaching manual|internet|la web))/i);
    if (matchExtCount) {
      const word = matchExtCount[1].toLowerCase();
      if (word === "un" || word === "una") requestedExternalCount = 1;
      else if (word === "dos") requestedExternalCount = 2;
      else if (word === "tres") requestedExternalCount = 3;
      else if (word === "cuatro") requestedExternalCount = 4;
      else requestedExternalCount = parseInt(word, 10) || 1;
    } else if (/externos?|fuentes?\s+externas?|de\s+la\s+web/i.test(raw) || requestedExternalSources.length > 0) {
      requestedExternalCount = 1;
    }

    // 10. Extract Requirement for Fully Verified External Exercises (FASE 59)
    const requireVerifiedOnly = /(?:verificables?|plenamente\s+verificables?|verificados?|con\s+evidencia(?:\s+espec[íi]fica|\s+documental)?|documentalmente\s+verificables?)/i.test(raw);

    // Clean up residual punctuation and spaces
    cleaned = cleaned.replace(/[,\-_/]/g, " ").replace(/\s+/g, " ").trim();

    return {
      rawQuery: raw,
      cleanedQuery: cleaned,
      extractedAgeCategory,
      extractedObjectives,
      extractedPlayersMin,
      extractedPlayersMax,
      extractedDurationMin,
      extractedDurationMax,
      extractedSpace,
      extractedIntensity,
      extractedGoalkeepers,
      extractedMicrocycleDay,
      requestedExternalSources: requestedExternalSources.length > 0 ? requestedExternalSources : undefined,
      requestedExternalCount,
      excludedObjectives: excludedObjectives.length > 0 ? excludedObjectives : undefined,
      isExclusivePriority: isExclusivePriority || undefined,
      requireVerifiedOnly: requireVerifiedOnly || undefined
    };
  }
}
