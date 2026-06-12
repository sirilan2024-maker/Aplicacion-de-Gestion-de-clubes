const text = `C.D. Benijófar 4 - 2 C.D. Horadada Thiar "B"   Campo Mpal. de Benijofar F-11 (HA)   25-10-2025 - 12:00 Sporting Saladar "A" 0 - 1 Torrevieja C.F "B"   Polideportivo Mpal. del Saladar F-11 Almoradi  (HA)   25-10-2025 - 10:30 C.D. Oriol "B" 2 - 2 At. Benejúzar "A"   Polideportivo Mpal. El Palmeral Orihuela F-11 (HA)   25-10-2025 - 09:15    Jornada 2 (26-10-2025)  Campo Fecha / Hora Daya Nueva At. C.F. "A" 4 - 1 C.D. Montesinos   Campo Mpal. La Puebla Daya Nueva F-11 (HA)   19-10-2025 - 10:00 C.D. Horadada Thiar "`;

const normalizedText = text.replace(/[\r\n]+/g, ' ');

// Match blocks ending with a date-time
const regex = /(.*?)\s*(\d{2}-\d{2}-\d{4}\s+-\s+\d{2}:\d{2})/g;
let match;
while ((match = regex.exec(normalizedText)) !== null) {
  let chunk = match[1].trim();
  const fechaRaw = match[2];

  // chunk e.g.: "Jornada 2 (26-10-2025)  Campo Fecha / Hora Daya Nueva At. C.F. "A" 4 - 1 C.D. Montesinos   Campo Mpal. La Puebla Daya Nueva F-11 (HA)"
  
  // The location is separated from the teams by at least 3 spaces.
  const parts = chunk.split(/\s{3,}/);
  if (parts.length >= 2) {
    // The last part is location, everything else is teams/headers
    const lugarRaw = parts[parts.length - 1];
    let equiposYScores = parts.slice(0, parts.length - 1).join(' ');

    equiposYScores = equiposYScores.replace(/.*(?:Fecha \/ Hora|Jornada \d+ \([^)]+\))\s*/i, '');

    const teamsMatch = equiposYScores.match(/(.*?)(?:\s+\d+)?\s+-\s+(?:\d+\s+)?(.*)/);
    if (teamsMatch) {
      console.log("MATCH FOUND:");
      console.log("  Local:", teamsMatch[1].trim());
      console.log("  Visitor:", teamsMatch[2].trim());
      console.log("  Lugar:", lugarRaw);
      console.log("  Fecha:", fechaRaw);
    }
  }
}
