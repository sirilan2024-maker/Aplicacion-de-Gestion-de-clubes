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

function parseFFCVMatchLine(line, targetTeamName) {
  let cleanLine = line.trim();
  if (!cleanLine || cleanLine.includes("Jornada") || cleanLine.includes("Fecha / Hora")) return null;

  // 1. Extraer fecha/hora al final de la línea si existe
  let fechaHora = "";
  const dateMatch = cleanLine.match(/\d{2}[-/]\d{2}[-/]\d{4}\s*(?:-\s*|\s+)?\d{2}:\d{2}/);
  if (dateMatch) {
    fechaHora = dateMatch[0];
    cleanLine = cleanLine.substring(0, dateMatch.index).trim();
  }

  // 2. Extraer y remover cualquier información de instalación / campo
  let campo = "";
  const campoMatch = cleanLine.match(/\s+(Campo|Polideportivo|Polidep\.)\s+.*$/i);
  if (campoMatch) {
    campo = campoMatch[0].trim();
    cleanLine = cleanLine.substring(0, campoMatch.index).trim();
  } else {
    cleanLine = cleanLine.replace(/\s*\((?:HA|HN|H\.A\.|H\.N\.)\)\s*$/i, '').trim();
  }

  cleanLine = cleanLine.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();

  let local = "";
  let visitante = "";

  const dashMatch = cleanLine.match(/^(.*?)(?:\s+(\d+))?\s*-\s*(?:(\d+)\s+)?(.*)$/);
  if (dashMatch) {
    local = dashMatch[1].trim();
    visitante = dashMatch[4].trim();
  }

  if (!local || !visitante) return null;

  function norm(str) {
    return (str || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['"“”]/g, "").replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
  }

  const normTarget = norm(targetTeamName);
  const normLocal = norm(local);
  const normVisit = norm(visitante);

  const targetKeywords = normTarget.split(' ').filter(w => w.length > 2);
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
    if (normLocal.includes(normTarget)) {
      lugar = "Local";
      rivalNombre = visitante;
    } else if (normVisit.includes(normTarget)) {
      lugar = "Visitante";
      rivalNombre = local;
    } else {
      return null;
    }
  }

  return { local, visitante, lugar, rivalNombre, campo, fechaHora };
}

const lines = userPdfText.split(/\r?\n/);
const matches = [];

lines.forEach(l => {
  const parsed = parseFFCVMatchLine(l, 'Sporting Saladar "A"');
  if (parsed) matches.push(parsed);
});

console.log(`Encontrados ${matches.length} partidos para Sporting Saladar "A":`);
console.table(matches);
