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

 Jornada 3 (02-11-2025)	 Campo	Fecha / Hora

Sporting Saladar "A" 	-	C.D. Benijófar 	  Polideportivo Mpal. del Saladar F-11 Almoradi  (HA) 	  01-11-2025 - 10:00 
	
Callosa Deportiva C.F. "B"    	-	Guardamar Soccer C.D. "A" 	  	  
	
Racing San Miguel C.F. "A" 	-	C.D. Oriol "B" 	  Campo Mpal. Montesico Blanco F-11 S. Miguel de Salinas  (HA) 	  01-11-2025 - 11:15 
	
Torrevieja C.F "B" 	-	At. Benejúzar "A" 	  Campo Gabriel Samper F-11 Torrevieja  (HA) 	  01-11-2025 - 12:00 
	
Daya Nueva At. C.F. "A" 	-	C.F. At. Rabaloche 	  Campo Mpal. La Puebla Daya Nueva F-11 (HA) 	  01-11-2025 - 12:15 
	
C.F. Promesas de Rojales "C" 	-	C.D. Montesinos 	  Campo Mpal. de Rojales F-11 (HN) 	  01-11-2025 - 16:00 
	
C.D. Horadada Thiar "B" 	-	C.F. At. San Bartolomé "A" 	  Campo Mpal. José Villaescusa Carrasco Pilar de Horadada F-11 (HA) 	  02-11-2025 - 10:00 

 Jornada 4 (09-11-2025)	 Campo	Fecha / Hora

C.F. At. Rabaloche 	-	Callosa Deportiva C.F. "B"    	  	  
	
At. Benejúzar "A" 	-	Racing San Miguel C.F. "A" 	  Campo Mpal. de Benejuzar F-11 (HA) 	  08-11-2025 - 16:30 
	
C.D. Oriol "B" 	-	Daya Nueva At. C.F. "A" 	  Polideportivo Mpal. El Palmeral Orihuela F-11 (HA) 	  09-11-2025 - 09:45 
	
Guardamar Soccer C.D. "A" 	-	C.F. Promesas de Rojales "C" 	  Campo Mpal. Las Rabosas F-11 Guardamar  (HA) 	  09-11-2025 - 10:00 
	
C.D. Montesinos 	-	C.D. Horadada Thiar "B" 	  Campo Mpal. de Los Montesinos F-11 (HA) 	  09-11-2025 - 10:30 
	
C.D. Benijófar 	-	Torrevieja C.F "B" 	  Campo Mpal. de Benijofar F-11 (HA) 	  09-11-2025 - 11:30 
	
C.F. At. San Bartolomé "A" 	-	Sporting Saladar "A" 	  Polidep. Mpal. La Murada F-11 Orihuela (HA) 	  09-11-2025 - 11:30 
`;

function cleanTeamName(name) {
  if (!name) return "";
  let s = name.trim();
  // Quitar números iniciales de ordenación (ej. "11. ", "3. ", "11 ")
  s = s.replace(/^\d+[\.\s\-]+/, '').trim();
  return s;
}

function parseUserTextForClub(pdfTeamName, clubTeamName = "Saladar") {
  const lines = userPdfText.split(/\r?\n/);
  const matches = [];
  let currentJornadaDate = "";

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    const jornadaMatch = line.match(/Jornada\s+\d+\s*\(([^)]+)\)/i);
    if (jornadaMatch) {
      currentJornadaDate = jornadaMatch[1].trim();
      continue;
    }

    if (line.includes("Campo") && line.includes("Fecha / Hora")) continue;

    // 1. Extraer fechaHora si está presente
    let fechaHoraRaw = "";
    const dateMatch = line.match(/\d{2}[-/]\d{2}[-/]\d{4}\s*(?:-\s*|\s+)?\d{2}:\d{2}/);
    if (dateMatch) {
      fechaHoraRaw = dateMatch[0];
      line = line.substring(0, dateMatch.index).trim();
    }

    // 2. Quitar campo/estadio
    const campoMatch = line.match(/\s+(Campo|Polideportivo|Polidep\.)\s+.*$/i);
    if (campoMatch) {
      line = line.substring(0, campoMatch.index).trim();
    } else {
      line = line.replace(/\s*\((?:HA|HN|H\.A\.|H\.N\.)\)\s*$/i, '').trim();
    }

    line = line.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();

    // 3. Separar por guión
    const dashMatch = line.match(/^(.*?)(?:\s+(\d+))?\s*-\s*(?:(\d+)\s+)?(.*)$/);
    if (!dashMatch) continue;

    let local = cleanTeamName(dashMatch[1]);
    let visitante = cleanTeamName(dashMatch[4]);

    // Ignorar si alguno de los equipos es sólo números
    if (!local || !visitante || /^\d+$/.test(local) || /^\d+$/.test(visitante)) continue;

    function isOurClub(tName) {
      const lower = tName.toLowerCase();
      return lower.includes("saladar") || lower.includes("sporting");
    }

    const localIsUs = isOurClub(local);
    const visitIsUs = isOurClub(visitante);

    if (!localIsUs && !visitIsUs) continue;

    let lugar = "";
    let rivalNombre = "";

    if (localIsUs && !visitIsUs) {
      lugar = "Local";
      rivalNombre = visitante;
    } else if (visitIsUs && !localIsUs) {
      lugar = "Visitante";
      rivalNombre = local;
    } else {
      // Si ambos tienen "saladar", usar el sufijo "A" o "B" según pdfTeamName
      const isALocal = local.toUpperCase().includes("A");
      const isAForm = pdfTeamName.toUpperCase().includes("A");
      if (isALocal === isAForm) {
        lugar = "Local";
        rivalNombre = visitante;
      } else {
        lugar = "Visitante";
        rivalNombre = local;
      }
    }

    matches.push({
      local,
      visitante,
      lugar,
      rivalNombre,
      fechaHoraRaw: fechaHoraRaw || currentJornadaDate
    });
  }

  return matches;
}

console.log("Probando nuevo extractor para Sporting Saladar 'A':");
const results = parseUserTextForClub("Sporting Saladar 'A'");
console.table(results);
