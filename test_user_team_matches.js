const userPdfText = `
Jornada 1 (19-10-2025)	 Campo	Fecha / Hora

Torrevieja C.F "B" 	-	C.D. Oriol "B" 	  Campo Gabriel Samper F-11 Torrevieja  (HA) 	  18-10-2025 - 10:00 
	
Callosa Deportiva C.F. "B"    	-	C.F. At. San Bartolomé "A" 	  	  
	
Racing San Miguel C.F. "A" 	-	Guardamar Soccer C.D. "A" 	  Campo Mpal. Montesico Blanco F-11 S. Miguel de Salinas  (HA) 	  18-10-2025 - 11:00 
	
At. Benejúzar "A" 	-	C.F. At. Rabaloche 	  Campo Mpal. de Benejuzar F-11 (HA) 	  18-10-2025 - 11:15 
	
C.F. Promesas de Rojales "C" 	-	C.D. Benijófar 	  Campo Mpal. de Rojales F-11 (HN) 	  18-10-2025 - 15:00 
	
C.D. Horadada Thiar "B" 	-	Sporting Saladar "A" 	  Polideportivo Mpal. Pilar de Horadada F-11 (HA) 	  18-10-2025 - 17:00 
	
Daya Nueva At. C.F. "A" 	-	C.D. Montesinos 	  Campo Mpal. La Puebla Daya Nueva F-11 (HA) 	  19-10-2025 - 10:00 

 Jornada 2 (26-10-2025)	 Campo	Fecha / Hora

C.D. Oriol "B" 	-	At. Benejúzar "A" 	  Polideportivo Mpal. El Palmeral Orihuela F-11 (HA) 	  25-10-2025 - 09:15 
	
Sporting Saladar "A" 	-	Torrevieja C.F "B" 	  Polideportivo Mpal. del Saladar F-11 Almoradi  (HA) 	  25-10-2025 - 10:30 
`;

function normalizeTeamName(name) {
  return (name || '')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['"“”]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeParseDateTime(fechaHoraRaw, defaultDateStr) {
  if (!fechaHoraRaw && defaultDateStr) {
    fechaHoraRaw = defaultDateStr;
  }
  if (!fechaHoraRaw) return null;

  const match = fechaHoraRaw.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\s*(?:-\s*|\s+)?(\d{1,2})?:?(\d{2})?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    const hour = match[4] ? parseInt(match[4], 10) : 12;
    const min = match[5] ? parseInt(match[5], 10) : 0;

    if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020 && year <= 2035) {
      const d = new Date(year, month, day, hour, min);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

function processUserTextForTeam(pdfTeamName) {
  const normPdfTargetName = normalizeTeamName(pdfTeamName);
  const lines = userPdfText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const matches = [];
  let currentJornadaDate = "";

  for (const line of lines) {
    const jornadaMatch = line.match(/Jornada\s+\d+\s*\(([^)]+)\)/i);
    if (jornadaMatch) {
      currentJornadaDate = jornadaMatch[1].trim();
      continue;
    }
    if (line.includes("Campo") && line.includes("Fecha / Hora")) continue;

    let fechaHoraRaw = "";
    const dateMatch = line.match(/\d{2}[-/]\d{2}[-/]\d{4}\s*(?:-\s*|\s+)?\d{2}:\d{2}/);
    let textWithoutDate = line;
    if (dateMatch) {
      fechaHoraRaw = dateMatch[0];
      textWithoutDate = line.substring(0, dateMatch.index).trim();
    }

    const parts = textWithoutDate.split(/\t+|\s{2,}/).map(p => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;

    let equipoLocal = "";
    let equipoVisitante = "";
    let golLocal = null;
    let golVisitante = null;

    if (parts[1] === "-" && parts[2]) {
      equipoLocal = parts[0];
      equipoVisitante = parts[2];
    } else {
      const tm = parts[0].match(/(.*?)(?:\s+(\d+))?\s*-\s*(?:(\d+)\s+)?(.*)/);
      if (tm) {
        equipoLocal = tm[1].trim();
        golLocal = tm[2] ? parseInt(tm[2], 10) : null;
        golVisitante = tm[3] ? parseInt(tm[3], 10) : null;
        equipoVisitante = tm[4].trim();
      }
    }

    if (!equipoLocal || !equipoVisitante) continue;

    const normLocal = normalizeTeamName(equipoLocal);
    const normVisit = normalizeTeamName(equipoVisitante);

    const isLocal = normLocal.includes(normPdfTargetName) || normPdfTargetName.includes(normLocal);
    const isVisitante = normVisit.includes(normPdfTargetName) || normPdfTargetName.includes(normVisit);

    if (!isLocal && !isVisitante) continue;

    const rivalNombre = isLocal ? equipoVisitante : equipoLocal;
    const lugar = isLocal ? 'Local' : 'Visitante';
    const fechaHora = safeParseDateTime(fechaHoraRaw, currentJornadaDate);

    matches.push({
      equipoLocal,
      equipoVisitante,
      rivalNombre,
      lugar,
      fechaHora: fechaHora ? fechaHora.toLocaleString('es-ES') : "SIN FECHA"
    });
  }

  return matches;
}

console.log("Probando extracción para 'Sporting Saladar \"A\"':");
const saladarMatches = processUserTextForTeam("Sporting Saladar \"A\"");
console.table(saladarMatches);
