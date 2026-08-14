import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Parser de Alineación y Sustituciones FFCV
function parseFFCVSubstitutionsAndLineup(text, ourTeamNameInPdf) {
  const matchDuration = 90; // Minutos por partido (estándar FFCV)
  
  // 1. Extraer la sección del equipo nuestro en el PDF
  const equipoIdx = text.indexOf(ourTeamNameInPdf);
  if (equipoIdx === -1) return { titulares: [], suplentes: [], sustituciones: [] };

  const chunk = text.substring(equipoIdx, equipoIdx + 4000);

  // 2. Separar Titulares vs Suplentes
  const suplentesIdx = chunk.indexOf("Jugadores/as Suplentes");
  const titularesText = suplentesIdx !== -1 ? chunk.substring(0, suplentesIdx) : chunk;
  const suplentesText = suplentesIdx !== -1 ? chunk.substring(suplentesIdx, chunk.indexOf("Cuerpo Técnico") !== -1 ? chunk.indexOf("Cuerpo Técnico") : chunk.length) : '';

  // Regex para capturar jugadores con su número y nombre: "13. MULA SERRANO, MARIO"
  const playerRegex = /(\d{1,2})\.\s*([A-ZÁÉÍÓÚÑ\s,]+?)(?=\s*\d{1,2}\.|\s*Jugadores|\s*Cuerpo|\s*$)/g;

  const titulares = [];
  let m;
  while ((m = playerRegex.exec(titularesText)) !== null) {
    const dorsal = parseInt(m[1]);
    const name = m[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (name.length > 3) titulares.push({ dorsal, name });
  }

  const suplentes = [];
  while ((m = playerRegex.exec(suplentesText)) !== null) {
    const dorsal = parseInt(m[1]);
    const name = m[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (name.length > 3) suplentes.push({ dorsal, name });
  }

  // 3. Extraer Sustituciones en SUSTITUCIONES EFECTUADAS
  const sustIdx = text.indexOf("SUSTITUCIONES EFECTUADAS");
  const sustituciones = [];

  if (sustIdx !== -1) {
    const sustChunk = text.substring(sustIdx);
    // Regex: "El jugador (19) TABITI BENMELLOUK, MOHA min. 60 sustituye a (8 ) ANDREU RODRIGUEZ, JUANMA"
    const subRegex = /El\s+jugador\s*\(\s*(\d{1,2})\s*\)\s*([^\n]+?)\s*min\.\s*(\d{1,3})\s*sustituye\s+a\s*\(\s*(\d{1,2})\s*\)\s*([^\n]+)/gi;
    let sMatch;
    while ((sMatch = subRegex.exec(sustChunk)) !== null) {
      sustituciones.push({
        dorsalEntra: parseInt(sMatch[1]),
        nombreEntra: sMatch[2].trim(),
        minuto: parseInt(sMatch[3]),
        dorsalSale: parseInt(sMatch[4]),
        nombreSale: sMatch[5].trim()
      });
    }
  }

  return { titulares, suplentes, sustituciones };
}

// Calcular minutos jugados para cada jugador
function calculatePlayerMinutes(titulares, suplentes, sustituciones, totalMatchMinutes = 90) {
  const minutesMap = new Map(); // dorsal/name -> minutos

  // 1. Todos los titulares empiezan con totalMatchMinutes por defecto
  titulares.forEach(t => {
    minutesMap.set(t.dorsal, { ...t, isTitular: true, minutes: totalMatchMinutes });
  });

  // 2. Los suplentes empiezan con 0 minutos
  suplentes.forEach(s => {
    minutesMap.set(s.dorsal, { ...s, isTitular: false, minutes: 0 });
  });

  // 3. Aplicar sustituciones
  sustituciones.forEach(sub => {
    const minSust = sub.minuto;

    // Jugador que sale (titular o entró antes)
    if (minutesMap.has(sub.dorsalSale)) {
      const pSale = minutesMap.get(sub.dorsalSale);
      pSale.minutes = minSust; // Jugó desde el inicio (o su entrada) hasta minSust
    }

    // Jugador que entra (suplente)
    if (minutesMap.has(sub.dorsalEntra)) {
      const pEntra = minutesMap.get(sub.dorsalEntra);
      pEntra.minutes = totalMatchMinutes - minSust; // Juega desde minSust hasta el final
    }
  });

  return Array.from(minutesMap.values());
}

// Test con el texto aportado por el usuario
const sampleText = `
Equipo Sporting Saladar "A" 
13. MULA SERRANO, MARIO
4. EL ALLAM, OMAR
5. EL ORF RABI, ISMAIL
6. PARRES FABRA, TOMAS
7. FERNANDEZ AVILES, JOSE LUIS
8. ANDREU RODRIGUEZ, JUANMA
9. EL ORF CHAKIR, MOHAMMED AMIN
10. MAHDAD LITIME, MORAD
11. RIVAS ROSALES, ADRIAN JOSUE
17. KHAEF ALLAH DAGHMANI, MOHAMMED
36. LAASIRI, MOHAMMED AMIN 

Jugadores/as Suplentes
2. BELGHITI EL LYAZIDI, ZAKARYA
3. GARCIA BAILEN, MARTIN
19. TABITI BENMELLOUK, MOHA
21. REBOLLO CORDOBA, FRANCISCO RAFAEL
22. NAREJOS RAMON, MANUEL
23. LOUZANI ALFOCEA, YOUSEF
24. GALANT FERRI, FIDEL

SUSTITUCIONES EFECTUADAS 
Equipo Sporting Saladar "A" 
El jugador (19) TABITI BENMELLOUK, MOHA min. 60 sustituye a (8 ) ANDREU RODRIGUEZ, JUANMA
El jugador (24) GALANT FERRI, FIDEL min. 60 sustituye a (36) LAASIRI, MOHAMMED AMINE
El jugador (3 ) GARCIA BAILEN, MARTIN min. 60 sustituye a (11) RIVAS ROSALES, ADRIAN JOSUE
El jugador (23) LOUZANI ALFOCEA, YOUSEF min. 75 sustituye a (6 ) PARRES FABRA, TOMAS
El jugador (2 ) BELGHITI EL LYAZIDI, ZAKARYA min. 75 sustituye a (17) KHAEF ALLAH DAGHMANI, MOHAMMED
El jugador (21) REBOLLO CORDOBA, FRANCISCO RAFAEL min. 84 sustituye a (10) MAHDAD LITIME, MORAD
El jugador (22) NAREJOS RAMON, MANUEL min. 84 sustituye a (5 ) EL ORF RABI, ISMAIL
`;

const parsed = parseFFCVSubstitutionsAndLineup(sampleText, "Sporting Saladar \"A\"");
const calculated = calculatePlayerMinutes(parsed.titulares, parsed.suplentes, parsed.sustituciones, 90);

console.log("=== RESULTADO DEL CÁLCULO DE MINUTOS ===");
console.table(calculated.map(p => ({
  Dorsal: p.dorsal,
  Nombre: p.name,
  Titular: p.isTitular ? 'SÍ' : 'NO',
  'Minutos Jugados': p.minutes
})));
