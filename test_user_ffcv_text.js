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
	
C.D. Benijófar 	-	C.D. Horadada Thiar "B" 	  Campo Mpal. de Benijofar F-11 (HA) 	  25-10-2025 - 12:00 
	
Guardamar Soccer C.D. "A" 	-	Daya Nueva At. C.F. "A" 	  Campo Mpal. Las Rabosas F-11 Guardamar  (HA) 	  25-10-2025 - 12:45 
	
C.D. Montesinos 	-	Callosa Deportiva C.F. "B"    	  	  
	
C.F. At. Rabaloche 	-	Racing San Miguel C.F. "A" 	  Polideportivo Mpal. Fco. Gonzalez Pertegal Polin F-11 (HA) 	  25-10-2025 - 17:00 
	
C.F. At. San Bartolomé "A" 	-	C.F. Promesas de Rojales "C" 	  Polideportivo municipal San Bartolomé (HA) 	  26-10-2025 - 09:00 
`;

function parseUserText(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  let currentJornada = "";
  const matches = [];

  for (const line of lines) {
    // Detectar Jornada
    const jornadaMatch = line.match(/Jornada\s+\d+\s*\(([^)]+)\)/i);
    if (jornadaMatch) {
      currentJornada = line;
      continue;
    }

    if (line.includes("Campo") && line.includes("Fecha / Hora")) {
      continue; // Cabecera
    }

    // Dividir por tabulaciones (\t) o 2 o más espacios consecutivos
    const columns = line.split(/\t+|\s{2,}/).map(c => c.trim()).filter(Boolean);
    
    // Buscar la estructura de equipos: "Equipo Local - Equipo Visitante" o "Equipo Local [Goles] - [Goles] Equipo Visitante"
    // O columnas separadas por "-"
    if (columns.length >= 1) {
      const lineText = columns.join(' ');
      // Regex para separar equipos y fecha/hora
      const matchPattern = /^(.*?)\s*(?:(\d+)\s*-\s*(\d+)|-)\s+(.*?)(?:\s+(Campo[^\t]+|Polideportivo[^\t]+|Polidep\.[^\t]+))?(?:\s+(\d{2}[-/]\d{2}[-/]\d{4}\s*-\s*\d{2}:\d{2}))?$/i;
      
      const m = lineText.match(matchPattern);
      if (m) {
        const equipoLocal = m[1].trim();
        const golLocal = m[2] ? parseInt(m[2], 10) : null;
        const golVisitante = m[3] ? parseInt(m[3], 10) : null;
        const equipoVisitante = m[4].trim();
        const campoStr = m[5] ? m[5].trim() : "";
        const fechaHoraStr = m[6] ? m[6].trim() : "";

        matches.push({
          equipoLocal,
          golLocal,
          golVisitante,
          equipoVisitante,
          campoStr,
          fechaHoraStr
        });
      }
    }
  }

  return matches;
}

console.log("Probando parseo del texto del usuario...");
const results = parseUserText(userPdfText);
console.log(`Extraídos ${results.length} partidos:`);
results.forEach((r, idx) => {
  console.log(`\nPartido ${idx + 1}:`);
  console.log(`  Local: "${r.equipoLocal}"`);
  console.log(`  Visitante: "${r.equipoVisitante}"`);
  console.log(`  Campo: "${r.campoStr}"`);
  console.log(`  Fecha: "${r.fechaHoraStr}"`);
});
