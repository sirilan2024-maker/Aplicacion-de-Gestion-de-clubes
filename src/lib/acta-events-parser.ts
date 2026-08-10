// Parser especializado de eventos detallados de Actas Oficiales FFCV (Multilínea y robusto)

export interface ActaPlayer {
  dorsal: number | null;
  nameRaw: string;
  isStarter: boolean;
  participated: boolean;
}

export interface ActaGoal {
  minuto: number;
  nameRaw: string;
  tipo: 'Gol' | 'Gol en propia puerta' | 'Penalti';
  isUs: boolean;
}

export interface ActaCard {
  minuto: number;
  nameRaw: string;
  tipo: 'Tarjeta Amarilla' | 'Tarjeta Roja';
  motivo?: string;
  isUs: boolean;
}

export interface ActaSub {
  minuto: number;
  playerInRaw: string;
  playerOutRaw: string;
  isUs: boolean;
}

export interface ParsedActaEvents {
  goles: ActaGoal[];
  tarjetas: ActaCard[];
  sustituciones: ActaSub[];
  nuestrosJugadores: ActaPlayer[];
}

export function parseFFCVActaEvents(pdfText: string, isUsLocal: boolean, teamName: string): ParsedActaEvents {
  const goles: ActaGoal[] = [];
  const tarjetas: ActaCard[] = [];
  const sustituciones: ActaSub[] = [];
  const nuestrosJugadores: ActaPlayer[] = [];

  const text = pdfText.replace(/\r/g, '');

  // 1. EXTRAER GOLES MARCADOS (Robusto multilínea)
  const gIdx = text.indexOf("GOLES MARCADOS") !== -1 ? text.indexOf("GOLES MARCADOS") : text.indexOf("GOLES");
  if (gIdx !== -1) {
    const endIdx = text.indexOf("TARJETAS", gIdx) !== -1 ? text.indexOf("TARJETAS", gIdx) : gIdx + 4000;
    const goalsChunk = text.substring(gIdx, endIdx);

    // Regex global multilínea para capturar goles incluso si el nombre del jugador o el tipo de gol rompe en varias líneas
    const goalRegex = /\(\s*(\d+)['\+\d]*\s*\)\s*([\s\S]+?)(Gol\s+en\s+propia\s+puerta|Gol\s+en\s+propia|Gol\s+de\s+penalty|Gol\s+de\s+penalti|Penalty|Penalti|Gol)/gi;
    let match;
    while ((match = goalRegex.exec(goalsChunk)) !== null) {
      const min = parseInt(match[1], 10);
      let nameRaw = match[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      const tipoRaw = match[3].toLowerCase();

      // Limpiar prefijos de tabla como "EquipoC.D. Benijófar" o "EquipoSporting Saladar "A""
      nameRaw = nameRaw.replace(/^Equipo[^\s]+\s*/i, '').trim();

      let tipo: 'Gol' | 'Gol en propia puerta' | 'Penalti' = 'Gol';
      if (tipoRaw.includes('propia')) tipo = 'Gol en propia puerta';
      else if (tipoRaw.includes('penal')) tipo = 'Penalti';

      goles.push({
        minuto: isNaN(min) ? 1 : min,
        nameRaw,
        tipo,
        isUs: true
      });
    }
  }

  // 2. EXTRAER TARJETAS / AMONESTACIONES (Robusto multilínea)
  const tIdx = text.indexOf("TARJETAS") !== -1 ? text.indexOf("TARJETAS") : text.indexOf("AMONESTACIONES");
  if (tIdx !== -1) {
    const endIdx = text.indexOf("FIRMA DE LOS DELEGADOS", tIdx) !== -1 ? text.indexOf("FIRMA DE LOS DELEGADOS", tIdx) : tIdx + 4000;
    const tarjChunk = text.substring(tIdx, endIdx);

    const cardRegex = /\(\s*(\d+)['\+\d]*\s*\)\s*([\s\S]+?)(Amarilla|Roja|Doble Amarilla)/gi;
    let match;
    while ((match = cardRegex.exec(tarjChunk)) !== null) {
      const min = parseInt(match[1], 10);
      let nameRaw = match[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      const cardStr = match[3].toLowerCase();

      nameRaw = nameRaw.replace(/^Equipo[^\s]+\s*/i, '').trim();
      const tipo: 'Tarjeta Amarilla' | 'Tarjeta Roja' = cardStr.includes('roja') || cardStr.includes('doble') ? 'Tarjeta Roja' : 'Tarjeta Amarilla';

      tarjetas.push({
        minuto: isNaN(min) ? 1 : min,
        nameRaw,
        tipo,
        isUs: true
      });
    }
  }

  // 3. EXTRAER INCIDENCIAS / SUSTITUCIONES
  const incIdx = text.indexOf("INCIDENCIAS");
  if (incIdx !== -1) {
    const incChunk = text.substring(incIdx);
    const subMatches = incChunk.matchAll(/minuto\s+(\d+)\s+el\s+jugador\s*\(([^)]+)\)\s*([^\n]+?)\s*sustituy[oó]\s+al\s+jugador\s*\(([^)]+)\)\s*([^\n\.]+)/gi);
    
    for (const sm of subMatches) {
      const minuto = parseInt(sm[1], 10);
      const playerInRaw = sm[3].replace(/\s+/g, ' ').trim();
      const playerOutRaw = sm[5].replace(/\s+/g, ' ').trim();

      sustituciones.push({
        minuto: isNaN(minuto) ? 40 : minuto,
        playerInRaw,
        playerOutRaw,
        isUs: true
      });
    }
  }

  return { goles, tarjetas, sustituciones, nuestrosJugadores };
}
