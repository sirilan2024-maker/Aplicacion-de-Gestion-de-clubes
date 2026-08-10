const userPdfText = `
Jornada 1 (19-10-2025)	 Campo	Fecha / Hora

Torrevieja C.F "B" 	-	C.D. Oriol "B" 	  Campo Gabriel Samper F-11 Torrevieja  (HA) 	  18-10-2025 - 10:00 
	
Callosa Deportiva C.F. "B"    	-	C.F. At. San Bartolomé "A" 	  	  
	
Racing San Miguel C.F. "A" 	-	Guardamar Soccer C.D. "A" 	  Campo Mpal. Montesico Blanco F-11 S. Miguel de Salinas  (HA) 	  18-10-2025 - 11:00 
	
At. Benejúzar "A" 	-	C.F. At. Rabaloche 	  Campo Mpal. de Benejuzar F-11 (HA) 	  18-10-2025 - 11:15 
	
C.F. Promesas de Rojales "C" 	-	C.D. Benijófar 	  Campo Mpal. de Rojales F-11 (HN) 	  18-10-2025 - 15:00 
	
C.D. Horadada Thiar "B" 	-	Sporting Saladar "A" 	  Polideportivo Mpal. Pilar de Horadada F-11 (HA) 	  18-10-2025 - 17:00 
	
Daya Nueva At. C.F. "A" 	-	C.D. Montesinos 	  Campo Mpal. La Puebla Daya Nueva F-11 (HA) 	  19-10-2025 - 10:00 
`;

function parseLineFFCV(line) {
  if (!line || line.includes("Jornada") || line.includes("Fecha / Hora")) return null;

  let fechaHora = "";
  const dateMatch = line.match(/\d{2}[-/]\d{2}[-/]\d{4}\s*-\s*\d{2}:\d{2}/);
  let textWithoutDate = line;
  if (dateMatch) {
    fechaHora = dateMatch[0];
    textWithoutDate = line.substring(0, dateMatch.index).trim();
  }

  const parts = textWithoutDate.split(/\t+|\s{2,}/).map(p => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;

  let local = "";
  let visitante = "";
  let campo = "";
  let golLocal = null;
  let golVisitante = null;

  if (parts[1] === "-" && parts[2]) {
    local = parts[0];
    visitante = parts[2];
    if (parts.length > 3) {
      campo = parts.slice(3).join(" ");
    }
  } else {
    const tm = parts[0].match(/(.*?)(?:\s+(\d+))?\s*-\s*(?:(\d+)\s+)?(.*)/);
    if (tm) {
      local = tm[1].trim();
      golLocal = tm[2] ? parseInt(tm[2], 10) : null;
      golVisitante = tm[3] ? parseInt(tm[3], 10) : null;
      visitante = tm[4].trim();
      if (parts.length > 1) {
        campo = parts.slice(1).join(" ");
      }
    }
  }

  if (!local || !visitante) return null;

  return { local, visitante, golLocal, golVisitante, campo, fechaHora };
}

const lines = userPdfText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
console.log("Probando parser refinado FFCV:");

lines.forEach((l, i) => {
  const p = parseLineFFCV(l);
  if (p) {
    console.log(`\nFila ${i+1}:`);
    console.log(`  LOCAL:     "${p.local}"`);
    console.log(`  VISITANTE: "${p.visitante}"`);
    console.log(`  CAMPO:     "${p.campo}"`);
    console.log(`  FECHA:     "${p.fechaHora}"`);
  }
});
