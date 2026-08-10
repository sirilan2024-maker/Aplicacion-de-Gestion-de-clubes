const fs = require('fs');

function cleanFieldName(campoName) {
  return (campoName || '')
    .replace(/\s*\((?:HA|HN|H\.A\.|H\.N\.)\)\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function preprocessFFCVText(rawText) {
  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const blocks = [];
  let buffer = [];
  const dateTimeRegex = /\d{2}[-/]\d{2}[-/]\d{4}\s*-\s*\d{2}:\d{2}/;

  for (const line of lines) {
    buffer.push(line);
    if (dateTimeRegex.test(line)) {
      blocks.push(buffer.join(" "));
      buffer = [];
    }
  }
  return blocks;
}

function normalizeTeamName(name) {
  return (name || '')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['"“”]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseFFCVBlock(block) {
  let cleanBlock = block.replace(/^.*?(?:Jornada\s+\d+\s*(?:\([^)]*\))?|Fecha\s*\/\s*Hora)\s*/i, '').trim();

  // Regex exacta:
  // ^(.+?)\s*(?:(\d+)\s*-\s*(\d+)|-)\s+(.+?)\s+(Campo|Polideportivo|Polidep\.)\s+(.+?)\s*(\d{2}[-/]\d{2}[-/]\d{4}\s*-\s*\d{2}:\d{2})
  const regex = /^(.+?)\s*(?:(\d+)\s*-\s*(\d+)|-)\s+(.+?)\s+(Campo|Polideportivo|Polidep\.)\s+(.+?)\s*(\d{2}[-/]\d{2}[-/]\d{4}\s*-\s*\d{2}:\d{2})/i;
  
  let m = cleanBlock.match(regex);
  if (!m) {
    const flexRegex = /(.+?)\s*(?:(\d+)\s*-\s*(\d+)|-)\s+(.+?)\s+(Campo|Polideportivo|Polidep\.)\s+(.+?)\s*(\d{2}[-/]\d{2}[-/]\d{4}\s*-\s*\d{2}:\d{2})/i;
    m = cleanBlock.match(flexRegex);
  }
  if (!m) return null;

  const equipoLocal = m[1].trim();
  const golLocal = m[2] !== undefined ? parseInt(m[2], 10) : null;
  const golVisitante = m[3] !== undefined ? parseInt(m[3], 10) : null;
  const equipoVisitante = m[4].trim();
  const tipoInstalacion = m[5].trim();
  const nombreCampoRaw = m[6].trim();
  const nombreCampo = cleanFieldName(nombreCampoRaw);
  const fechaHoraRaw = m[7].trim();

  const isDescansa = equipoLocal.toLowerCase().includes('descansa') || equipoVisitante.toLowerCase().includes('descansa');

  return {
    equipoLocal,
    golLocal,
    golVisitante,
    equipoVisitante,
    tipoInstalacion,
    nombreCampo,
    fechaHoraRaw,
    isDescansa
  };
}

const samplePdfText = `
Jornada 1 (18-10-2025)
Sporting Saladar "A" 3-1 C.D. Horadada Thiar "B" Campo Polideportivo Mpal. del Saladar F-11 Almoradi (HA) 18-10-2025 - 10:00
Jornada 2 (25-10-2025)
Descansa - Sporting Saladar "B" Campo Campo Mpal. Sadrian (HN) 25-10-2025 - 12:00
Jornada 3 (13-12-2025)
At. Crevillente "A" - Sporting Saladar "A" Polideportivo Ciudad Dptva. Nord F-11 Crevillent 13-12-2025 - 11:30
`;

const blocks = preprocessFFCVText(samplePdfText);
console.log("Probando con muestra FFCV:");

blocks.forEach((b, i) => {
  const parsed = parseFFCVBlock(b);
  if (!parsed) {
    console.log(`Bloque ${i+1}: NO COINCIDE CON REGEX`);
    return;
  }
  if (parsed.isDescansa) {
    console.log(`Bloque ${i+1}: 🛑 FILTRADO POR DESCANSO ("${parsed.equipoLocal}" vs "${parsed.equipoVisitante}") - NO INSERTAR`);
    return;
  }
  console.log(`Bloque ${i+1}: 🟢 PARTIDO VÁLIDO:`, parsed);
});
