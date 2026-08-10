const sampleLine1 = 'Torrevieja C.F "B" \t-\tC.D. Oriol "B" \t Campo Gabriel Samper F-11 Torrevieja (HA) \t 18-10-2025 - 10:00';
const sampleLine2 = 'C.D. Horadada Thiar "B" \t-\tSporting Saladar "A" \t Polideportivo Mpal. Pilar de Horadada F-11 (HA) \t 18-10-2025 - 17:00';

function parseFFCVMatchLine(line, targetTeamName) {
  let cleanLine = line.trim();
  if (!cleanLine || cleanLine.includes("Jornada") || cleanLine.includes("Fecha / Hora")) return null;

  // 1. Extraer fecha/hora al final de la línea if exists
  let fechaHora = "";
  const dateMatch = cleanLine.match(/\d{2}[-/]\d{2}[-/]\d{4}\s*(?:-\s*|\s+)?\d{2}:\d{2}/);
  if (dateMatch) {
    fechaHora = dateMatch[0];
    cleanLine = cleanLine.substring(0, dateMatch.index).trim();
  }

  // 2. Extraer y remover cualquier información de instalación / campo
  // (Campo ..., Polideportivo ..., Polidep. ..., o sufijos (HA)/(HN))
  let campo = "";
  const campoMatch = cleanLine.match(/\s+(Campo|Polideportivo|Polidep\.)\s+.*$/i);
  if (campoMatch) {
    campo = campoMatch[0].trim();
    cleanLine = cleanLine.substring(0, campoMatch.index).trim();
  } else {
    // Si no hay palabra 'Campo', remover sufijos (HA) o (HN) al final
    cleanLine = cleanLine.replace(/\s*\((?:HA|HN|H\.A\.|H\.N\.)\)\s*$/i, '').trim();
  }

  // 3. Ahora cleanLine contiene ÚNICAMENTE: "Equipo Local - Equipo Visitante" o "Equipo Local Goles - Goles Equipo Visitante"
  // Dividir por el guion '-' central entre los equipos
  // Reemplazar tabulaciones por espacios
  cleanLine = cleanLine.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();

  let local = "";
  let visitante = "";

  // Probar separación por '-' central
  const dashMatch = cleanLine.match(/^(.*?)(?:\s+(\d+))?\s*-\s*(?:(\d+)\s+)?(.*)$/);
  if (dashMatch) {
    local = dashMatch[1].trim();
    visitante = dashMatch[4].trim();
  }

  if (!local || !visitante) return null;

  // Limpiar posibles comillas y normalizar
  function norm(str) {
    return (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['"“”]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  }

  const normTarget = norm(targetTeamName);
  const normLocal = norm(local);
  const normVisit = norm(visitante);

  // Determinar con precisión si somos local o visitante
  // Nivel 1: Coincidencia exacta de palabras clave principales (ej. "sporting saladar")
  const targetKeywords = normTarget.split(' ').filter(w => w.length > 2); // ["sporting", "saladar", "a"]
  
  const localMatchCount = targetKeywords.filter(kw => normLocal.includes(kw)).length;
  const visitMatchCount = targetKeywords.filter(kw => normVisit.includes(kw)).length;

  let lugar = "";
  let rivalNombre = "";

  if (localMatchCount > visitMatchCount) {
    lugar = "Local";
    rivalNombre = visitante;
  } else if (visitMatchCount > localMatchCount) {
    lugar = "Visitante";
    rivalNombre = local;
  } else {
    // Si la cantidad de palabras clave empata, comparar por inclusión directa
    if (normLocal.includes(normTarget)) {
      lugar = "Local";
      rivalNombre = visitante;
    } else if (normVisit.includes(normTarget)) {
      lugar = "Visitante";
      rivalNombre = local;
    } else {
      return null; // El equipo buscado no juega este partido
    }
  }

  return {
    local,
    visitante,
    lugar,
    rivalNombre,
    campo,
    fechaHora
  };
}

console.log("Probando nuevo algoritmo estricto:");
console.log("\n1. Partido como Visitante:");
console.log(parseFFCVMatchLine(sampleLine2, 'Sporting Saladar "A"'));

console.log("\n2. Partido como Local:");
const sampleLine3 = 'Sporting Saladar "A" \t-\tTorrevieja C.F "B" \t Polideportivo Mpal. del Saladar F-11 Almoradi (HA) \t 25-10-2025 - 10:30';
console.log(parseFFCVMatchLine(sampleLine3, 'Sporting Saladar "A"'));
