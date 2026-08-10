import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
// @ts-ignore
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

dotenv.config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const MESES = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

function parseFFCVActaText(text) {
  // Normalizar espacio entre "el" y número (ej. "el15" -> "el 15")
  const cleanText = text.replace(/celebrado\s*el(\d{1,2})/gi, 'celebrado el $1');

  let fecha = null;
  const fechaMatch = cleanText.match(/celebrado\s+el\s*([0-9]{1,2}\s+de\s+[a-zA-ZáéíóúÁÉÍÓÚ]+\s+de\s+[0-9]{4}|[0-9]{1,2}[./-][0-9]{1,2}[./-][0-9]{2,4})/i);
  if (fechaMatch) {
    const rawDateStr = fechaMatch[1];
    const textMatch = rawDateStr.match(/(\d{1,2})\s+de\s+([a-z]+)\s+de\s+(\d{4})/i);
    if (textMatch) {
      const day = parseInt(textMatch[1], 10);
      const month = MESES[textMatch[2].toLowerCase()];
      const year = parseInt(textMatch[3], 10);
      if (day >= 1 && day <= 31 && month !== undefined && year >= 2020) {
        fecha = new Date(year, month, day);
      }
    } else {
      const numMatch = rawDateStr.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})/);
      if (numMatch) {
        const day = parseInt(numMatch[1], 10);
        const month = parseInt(numMatch[2], 10) - 1;
        let year = parseInt(numMatch[3], 10);
        if (year < 100) year += 2000;
        fecha = new Date(year, month, day);
      }
    }
  }

  return { fecha };
}

function parseFFCVActaGoals(pdfText) {
  let golLocal = null;
  let golVisitante = null;

  const resIdx = pdfText.indexOf("Resultado");
  if (resIdx !== -1) {
    const resChunk = pdfText.substring(resIdx, resIdx + 600);
    const lines = resChunk.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const numsPerLine = [];

    lines.forEach(line => {
      const parenthesized = line.match(/\((\d+)\)/g);
      if (parenthesized && parenthesized.length >= 1) {
        const nums = parenthesized.map(p => parseInt(p.replace(/[()]/g, ''), 10));
        numsPerLine.push(nums);
      }
    });

    if (numsPerLine.length >= 2) {
      const localNums = numsPerLine[0];
      golLocal = localNums[localNums.length - 1];

      const visitNums = numsPerLine[1];
      golVisitante = visitNums[visitNums.length - 1];
    }
  }

  return { golLocal, golVisitante };
}

async function testMatchPendingActas() {
  // Probar la mejora de fechas
  console.log("Probando reconocedor mejorado de actas...");
}

testMatchPendingActas();
