import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// @ts-ignore
import pdfParse from "pdf-parse/lib/pdf-parse.js";

export const runtime = "nodejs";
export const maxDuration = 60; // 60s timeout for batch processing

const MESES: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

function parseFFCVActaText(text: string) {
  // 1. Normalizar espacio entre "el" y número (ej. "el15" -> "el 15")
  const cleanText = text.replace(/celebrado\s*el(\d{1,2})/gi, 'celebrado el $1');

  let fecha: Date | null = null;
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

  // 2. Extraer Clubes (Local y Visitante)
  let localTeam: string | null = null;
  let awayTeam: string | null = null;
  const clubesMatch = cleanText.match(/Clubes:\s*([^\n,]+)(?:,\s*de[^\n]+)?\s*\n\s*([^\n,]+)(?:,\s*de[^\n]+)?/i);
  if (clubesMatch) {
    localTeam = clubesMatch[1].trim();
    awayTeam = clubesMatch[2].trim();
  }

  // 3. Extraer Campo
  let campo: string | null = null;
  const campoMatch = cleanText.match(/Campo:\s*([^\n]+)/i);
  if (campoMatch) {
    campo = campoMatch[1].trim();
  }

  return { fecha, localTeam, awayTeam, campo };
}

function extractGoalsFromActa(text: string, isLocal: boolean): { resultadoPropio: number | null, resultadoRival: number | null } {
  let golLocal: number | null = null;
  let golVisitante: number | null = null;

  const resIdx = text.indexOf("Resultado");
  if (resIdx !== -1) {
    const resChunk = text.substring(resIdx, resIdx + 600);
    const lines = resChunk.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const numsPerLine: number[][] = [];

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

  if (golLocal !== null && golVisitante !== null) {
    return {
      resultadoPropio: isLocal ? golLocal : golVisitante,
      resultadoRival: isLocal ? golVisitante : golLocal
    };
  }

  return { resultadoPropio: null, resultadoRival: null };
}

function normalizeName(str: string): string {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchPlayerInList(nameRaw: string, playersList: any[]): any {
  if (!nameRaw || !playersList || playersList.length === 0) return null;
  const normTarget = normalizeName(nameRaw);
  const targetTokens = normTarget.split(' ').filter(w => w.length > 2);

  let bestPlayer: any = null;
  let maxScore = 0;

  for (const player of playersList) {
    const fullName = normalizeName(`${player.last_name || ''} ${player.first_name || ''}`);
    const revName = normalizeName(`${player.first_name || ''} ${player.last_name || ''}`);
    const playerTokens = [...fullName.split(' '), ...revName.split(' ')].filter(w => w.length > 2);

    let score = 0;
    targetTokens.forEach(token => {
      if (playerTokens.some(pt => pt.includes(token) || token.includes(pt))) {
        score += 1;
      }
    });

    if (score > maxScore) {
      maxScore = score;
      bestPlayer = player;
    }
  }

  return maxScore >= 1 ? bestPlayer : null;
}

function extractAllDatesFromText(text: string): Date[] {
  const dates: Date[] = [];
  const ffcvParsed = parseFFCVActaText(text);
  if (ffcvParsed.fecha) {
    dates.push(ffcvParsed.fecha);
  }

  // Regex 1: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY o DD/MM/YY
  const dateRegex = /\b(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})\b/g;
  let match: RegExpExecArray | null;
  while ((match = dateRegex.exec(text)) !== null) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;

    if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020 && year <= 2030) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) dates.push(d);
    }
  }

  // Regex 2: "12 de Mayo de 2024"
  const textDateRegex = /\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\b/gi;
  while ((match = textDateRegex.exec(text)) !== null) {
    const day = parseInt(match[1], 10);
    const month = MESES[match[2].toLowerCase()];
    const year = parseInt(match[3], 10);
    if (day >= 1 && day <= 31 && month !== undefined && year >= 2020 && year <= 2030) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) dates.push(d);
    }
  }

  return dates;
}

function extractCategoryFromText(text: string, fileName?: string): string | null {
  // 0. Si el nombre del archivo especifica la categoría (ej. "Acta SENIOR (7).pdf"), priorizarlo 100%
  if (fileName) {
    const fnUpper = fileName.toUpperCase();
    if (fnUpper.includes("SENIOR")) return "SENIOR";
    if (fnUpper.includes("CADETE A") || fnUpper.includes("CADETE_A")) return "CADETE A";
    if (fnUpper.includes("CADETE B") || fnUpper.includes("CADETE_B")) return "CADETE B";
    if (fnUpper.includes("JUVENIL A") || fnUpper.includes("JUVENIL_A")) return "JUVENIL A";
    if (fnUpper.includes("JUVENIL B") || fnUpper.includes("JUVENIL_B")) return "JUVENIL B";
    if (fnUpper.includes("INFANTIL A") || fnUpper.includes("INFANTIL_A")) return "INFANTIL A";
    if (fnUpper.includes("INFANTIL B") || fnUpper.includes("INFANTIL_B")) return "INFANTIL B";
    if (fnUpper.includes("INFANTIL C") || fnUpper.includes("INFANTIL_C")) return "INFANTIL C";
  }

  const upperText = text.toUpperCase();

  // 1. Extraer la sección de Clubes del acta FFCV (primeros 500 caracteres)
  const clubesIdx = upperText.indexOf("CLUBES:");
  const headerChunk = clubesIdx !== -1 ? upperText.substring(clubesIdx, clubesIdx + 400) : upperText.substring(0, 500);

  // Comprobar Senior en cabecera o competición
  if (headerChunk.includes("1ª REGIONAL") || headerChunk.includes("2ª REGIONAL") || headerChunk.includes("TERCERA FEDERACION") || headerChunk.includes("SENIOR") || headerChunk.includes("SEGUNDA REGIONAL") || headerChunk.includes("PRIMERA REGIONAL")) {
    return "SENIOR";
  }

  // Coincidencias exactas de nombre del equipo en la cabecera
  if (headerChunk.includes("SPORTING SALADAR \"A\"") || headerChunk.includes("SPORTING SALADAR A")) {
    if (headerChunk.includes("CADETE")) return "CADETE A";
    if (headerChunk.includes("JUVENIL")) return "JUVENIL A";
    if (headerChunk.includes("INFANTIL")) return "INFANTIL A";
  }

  if (headerChunk.includes("SPORTING SALADAR \"B\"") || headerChunk.includes("SPORTING SALADAR B")) {
    if (headerChunk.includes("CADETE")) return "CADETE B";
    if (headerChunk.includes("JUVENIL")) return "JUVENIL B";
    if (headerChunk.includes("INFANTIL")) return "INFANTIL B";
  }

  if (headerChunk.includes("SPORTING SALADAR \"C\"") || headerChunk.includes("SPORTING SALADAR C")) {
    if (headerChunk.includes("INFANTIL")) return "INFANTIL C";
  }

  // Si en la cabecera figura "Sporting Saladar" sin letra "A", "B", "C" y no es Cadete/Juvenil/Infantil, es SENIOR
  if ((headerChunk.includes("SPORTING SALADAR") || headerChunk.includes("SALADAR")) &&
      !headerChunk.includes("CADETE") && !headerChunk.includes("JUVENIL") && !headerChunk.includes("INFANTIL")) {
    return "SENIOR";
  }

  // 2. Coincidencias por categoría general en cabecera
  if (headerChunk.includes("CADETE A") || headerChunk.includes("CADETE \"A\"")) return "CADETE A";
  if (headerChunk.includes("CADETE B") || headerChunk.includes("CADETE \"B\"")) return "CADETE B";
  if (headerChunk.includes("JUVENIL A") || headerChunk.includes("JUVENIL \"A\"")) return "JUVENIL A";
  if (headerChunk.includes("JUVENIL B") || headerChunk.includes("JUVENIL \"B\"")) return "JUVENIL B";
  if (headerChunk.includes("INFANTIL A") || headerChunk.includes("INFANTIL \"A\"")) return "INFANTIL A";
  if (headerChunk.includes("INFANTIL B") || headerChunk.includes("INFANTIL \"B\"")) return "INFANTIL B";
  if (headerChunk.includes("INFANTIL C") || headerChunk.includes("INFANTIL \"C\"")) return "INFANTIL C";

  // 3. Fallbacks en texto completo con palabras delimitadas
  if (/\bCADETE\s+A\b/.test(upperText) || /\bCADETE\s+"A"\b/.test(upperText)) return "CADETE A";
  if (/\bCADETE\s+B\b/.test(upperText) || /\bCADETE\s+"B"\b/.test(upperText)) return "CADETE B";
  if (/\bJUVENIL\s+A\b/.test(upperText) || /\bJUVENIL\s+"A"\b/.test(upperText)) return "JUVENIL A";
  if (/\bJUVENIL\s+B\b/.test(upperText) || /\bJUVENIL\s+"B"\b/.test(upperText)) return "JUVENIL B";
  if (/\bINFANTIL\s+A\b/.test(upperText) || /\bINFANTIL\s+"A"\b/.test(upperText)) return "INFANTIL A";
  if (/\bINFANTIL\s+B\b/.test(upperText) || /\bINFANTIL\s+"B"\b/.test(upperText)) return "INFANTIL B";
  if (/\bINFANTIL\s+C\b/.test(upperText) || /\bINFANTIL\s+"C"\b/.test(upperText)) return "INFANTIL C";
  if (/\bSENIOR\b/.test(upperText)) return "SENIOR";

  return null;
}

import { getAuthenticatedContext, STAFF_ROLES } from "@/lib/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    // 1. Validar autenticación y contexto de usuario
    const { context, error: authError, statusCode } = await getAuthenticatedContext();
    if (!context || authError) {
      return NextResponse.json({ error: authError || "No autenticado" }, { status: statusCode || 401 });
    }

    // 2. Validar rol autorizado
    if (!STAFF_ROLES.includes(context.profile.role)) {
      return NextResponse.json(
        { error: "No tienes permisos de cuerpo técnico o administración para clasificar actas." },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No se recibieron archivos" }, { status: 400 });
    }

    const classified: any[] = [];
    const pending: any[] = [];

    // 3. Obtener únicamente los equipos del club del usuario
    const { data: teams } = await supabase
      .from("teams")
      .select("id, name, category")
      .eq("club_id", context.profile.club_id);

    const teamIds = (teams || []).map((t: any) => t.id);

    // 4. Obtener únicamente los partidos de los equipos del club
    let allMatches: any[] = [];
    if (teamIds.length > 0) {
      const { data: matchesData } = await supabase
        .from("partidos")
        .select("id, fecha_hora, rival_nombre, equipo_id, lugar, equipo:teams(name)")
        .in("equipo_id", teamIds);
      allMatches = matchesData || [];
    }

    for (const file of files) {
      const fileName = file.name;
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let parsedText = "";
        try {
          const pdfData = await pdfParse(buffer);
          parsedText = pdfData.text || "";
        } catch (pdfErr: any) {
          console.warn(`[clasificar-actas] Error parsing PDF ${fileName}:`, pdfErr.message);
        }

        const datesFound = extractAllDatesFromText(parsedText);
        const extractedCategory = extractCategoryFromText(parsedText, fileName);

        if (!parsedText.trim()) {
          const pendingUuid = crypto.randomUUID();
          const pendingPath = `pending/${pendingUuid}_${fileName}`;
          
          await supabase.storage.from("actas-partidos").upload(pendingPath, buffer, {
            contentType: "application/pdf",
            upsert: true
          });

          pending.push({
            fileName,
            pendingPath,
            reason: "PDF escaneado o sin texto reconocible"
          });
          continue;
        }

        // Búsqueda inteligente de partido coincidente en la BD
        let bestMatch: any = null;

        const matchingTeam = teams?.find(t => 
          extractedCategory && (
            t.name.toUpperCase().includes(extractedCategory) ||
            extractedCategory.includes(t.name.toUpperCase())
          )
        );

        const ffcvHeader = parseFFCVActaText(parsedText);
        const normalizedPdfText = (parsedText || '')
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (allMatches && allMatches.length > 0) {
          // Filtrar candidatos que pertenezcan al equipo detectado
          const teamCandidates = allMatches.filter(m => !matchingTeam || m.equipo_id === matchingTeam.id);

          // ESTRATEGIA 1: Buscar coincidencia EXACTA del Rival en el texto del acta FFCV
          const rivalCandidates = teamCandidates.filter(c => {
            const normRival = (c.rival_nombre || '')
              .toLowerCase()
              .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]/g, " ")
              .replace(/\s+/g, " ")
              .trim();

            if (!normRival || normRival === 'descansa') return false;

            // Extraer palabras clave del rival (ej. "COX", "PETRELENSE", "DOLORES")
            const keywords = normRival.split(' ').filter((w: string) => w.length > 2 && !['c.d.', 'c.f.', 'u.d.', 'a.d.'].includes(w));
            if (keywords.length === 0) return false;

            // Comprobar si al menos la palabra principal del rival está en el texto del PDF (o cabecera)
            return keywords.some((kw: string) => normalizedPdfText.includes(kw));
          });

          if (rivalCandidates.length === 1) {
            // Si solo hay 1 partido contra ese rival en la BD para ese equipo, es coincidencia 100% segura
            bestMatch = rivalCandidates[0];
          } else if (rivalCandidates.length > 1) {
            // Si hay varios partidos contra el mismo rival (ej. ida y vuelta o varias fechas), usar la fecha exacta o más cercana
            if (datesFound.length > 0) {
              const pdfTime = datesFound[0].getTime();
              let minDiff = Infinity;
              
              for (const rc of rivalCandidates) {
                const matchTime = new Date(rc.fecha_hora).getTime();
                const diff = Math.abs(matchTime - pdfTime);
                if (diff < minDiff) {
                  minDiff = diff;
                  bestMatch = rc;
                }
              }
            } else {
              bestMatch = rivalCandidates[0];
            }
          }

          // ESTRATEGIA 2: Si no coincidió por rival, intentar por fecha cercana (máx 3 días de diferencia) + rival secundario
          if (!bestMatch && datesFound.length > 0) {
            const pdfTime = datesFound[0].getTime();
            const minMs = pdfTime - 3 * 24 * 60 * 60 * 1000;
            const maxMs = pdfTime + 3 * 24 * 60 * 60 * 1000;

            const dateCandidates = teamCandidates.filter(m => {
              const mTime = new Date(m.fecha_hora).getTime();
              return mTime >= minMs && mTime <= maxMs;
            });

            if (dateCandidates.length === 1) {
              bestMatch = dateCandidates[0];
            }
          }
        }

        if (bestMatch) {
          const assignedPath = `partidos/${bestMatch.id}/acta_oficial.pdf`;

          await supabase.storage.from("actas-partidos").upload(assignedPath, buffer, {
            contentType: "application/pdf",
            upsert: true
          });

          const isLocal = bestMatch.lugar === 'Local';
          const goals = extractGoalsFromActa(parsedText, isLocal);

          const updatePayload: any = {
            acta_oficial_url: assignedPath,
            estado: 'Finalizado'
          };

          if (goals.resultadoPropio !== null && goals.resultadoRival !== null) {
            updatePayload.resultado_propio = goals.resultadoPropio;
            updatePayload.resultado_rival = goals.resultadoRival;
          }

          await supabase
            .from("partidos")
            .update(updatePayload)
            .eq("id", bestMatch.id);

          // Extraer y conciliar eventos individuales de jugadores (Goles, Tarjetas, Minutos jugados)
          try {
            const { data: teamPlayers } = await supabase
              .from('players')
              .select('id, first_name, last_name, dorsal')
              .eq('team_id', bestMatch.equipo_id);

            const matchEventsToInsert: any[] = [];
            
            // Extraer Goles
            const resIdx = parsedText.indexOf("GOLES MARCADOS");
            if (resIdx !== -1) {
              const endIdx = parsedText.indexOf("TARJETAS", resIdx);
              const goalsChunk = parsedText.substring(resIdx, endIdx !== -1 ? endIdx : resIdx + 2000);
              const goalLines = goalsChunk.match(/\(\d+['\+\d]*\)\s*([^\n\(\)]+?)(Gol|Gol en propia|Penalty|penalty)/gi);
              goalLines?.forEach(gl => {
                const match = gl.match(/\((\d+)['\+\d]*\)\s*([^\n\(\)]+?)(Gol|Gol en propia|Penalty|penalty)/i);
                if (match) {
                  const minutoStr = match[1].replace(/['+]/g, '');
                  const minuto = parseInt(minutoStr, 10);
                  const nameRaw = match[2].trim();
                  const tipoStr = match[3].toLowerCase();
                  let tipo_evento = 'Gol';
                  if (tipoStr.includes('propia')) tipo_evento = 'Gol en propia puerta';

                  const matchedPlayer = teamPlayers ? matchPlayerInList(nameRaw, teamPlayers) : null;
                  matchEventsToInsert.push({
                    partido_id: bestMatch.id,
                    player_id: matchedPlayer ? matchedPlayer.id : null,
                    tipo_evento,
                    minuto: isNaN(minuto) ? 1 : minuto,
                    notas: matchedPlayer ? `Gol por ${matchedPlayer.first_name} ${matchedPlayer.last_name}` : `Gol por ${nameRaw}`
                  });
                }
              });
            }

            // Extraer Tarjetas
            const tarjIdx = parsedText.indexOf("TARJETAS");
            if (tarjIdx !== -1) {
              const endIdx = parsedText.indexOf("FIRMA DE LOS DELEGADOS", tarjIdx);
              const tarjChunk = parsedText.substring(tarjIdx, endIdx !== -1 ? endIdx : tarjIdx + 2000);
              const cardLines = tarjChunk.match(/\(\d+['\+\d]*\)\s*([^\n\(\)]+?)(Amarilla|Roja|Doble Amarilla)/gi);
              cardLines?.forEach(cl => {
                const match = cl.match(/\((\d+)['\+\d]*\)\s*([^\n\(\)]+?)(Amarilla|Roja|Doble Amarilla)/i);
                if (match) {
                  const minutoStr = match[1].replace(/['+]/g, '');
                  const minuto = parseInt(minutoStr, 10);
                  const nameRaw = match[2].trim();
                  const cardStr = match[3].toLowerCase();
                  const tipo_evento = cardStr.includes('roja') || cardStr.includes('doble') ? 'Tarjeta Roja' : 'Tarjeta Amarilla';
                  const matchedPlayer = teamPlayers ? matchPlayerInList(nameRaw, teamPlayers) : null;
                  if (matchedPlayer) {
                    matchEventsToInsert.push({
                      partido_id: bestMatch.id,
                      player_id: matchedPlayer.id,
                      tipo_evento,
                      minuto: isNaN(minuto) ? 1 : minuto,
                      notas: `${tipo_evento} a ${matchedPlayer.first_name} ${matchedPlayer.last_name}`
                    });
                  }
                }
              });
            }

            // Extraer Alineación, Suplentes y Sustituciones FFCV para cálculo de minutos exactos
            let calculatedMinutesMap = new Map<string, { minutes: number, isTitular: boolean }>();
            
            try {
              const ourTeamNameInPdf = bestMatch.lugar === 'Local' ? ffcvHeader.localTeam : ffcvHeader.awayTeam;
              if (ourTeamNameInPdf && teamPlayers) {
                const equipoIdx = parsedText.indexOf(ourTeamNameInPdf);
                if (equipoIdx !== -1) {
                  const chunk = parsedText.substring(equipoIdx, equipoIdx + 4000);
                  const suplentesIdx = chunk.indexOf("Jugadores/as Suplentes");
                  const titularesText = suplentesIdx !== -1 ? chunk.substring(0, suplentesIdx) : chunk;
                  const suplentesText = suplentesIdx !== -1 ? chunk.substring(suplentesIdx, chunk.indexOf("Cuerpo Técnico") !== -1 ? chunk.indexOf("Cuerpo Técnico") : chunk.length) : '';

                  const playerRegex = /(\d{1,2})\.\s*([A-ZÁÉÍÓÚÑ\s,]+?)(?=\s*\d{1,2}\.|\s*Jugadores|\s*Cuerpo|\s*$)/g;

                  const titulares: any[] = [];
                  let mMatch: RegExpExecArray | null;
                  while ((mMatch = playerRegex.exec(titularesText)) !== null) {
                    const name = mMatch[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                    const matchedP = matchPlayerInList(name, teamPlayers);
                    if (matchedP) titulares.push({ dorsal: parseInt(mMatch[1]), player: matchedP });
                  }

                  const suplentes: any[] = [];
                  while ((mMatch = playerRegex.exec(suplentesText)) !== null) {
                    const name = mMatch[2].replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
                    const matchedP = matchPlayerInList(name, teamPlayers);
                    if (matchedP) suplentes.push({ dorsal: parseInt(mMatch[1]), player: matchedP });
                  }

                  // Extraer Sustituciones
                  const sustIdx = parsedText.indexOf("SUSTITUCIONES EFECTUADAS");
                  const sustituciones: any[] = [];
                  if (sustIdx !== -1) {
                    const sustChunk = parsedText.substring(sustIdx);
                    const subRegex = /El\s+jugador\s*\(\s*(\d{1,2})\s*\)\s*([^\n]+?)\s*min\.\s*(\d{1,3})\s*sustituye\s+a\s*\(\s*(\d{1,2})\s*\)\s*([^\n]+)/gi;
                    let sMatch: RegExpExecArray | null;
                    while ((sMatch = subRegex.exec(sustChunk)) !== null) {
                      const minSub = parseInt(sMatch[3]);
                      const pEntra = matchPlayerInList(sMatch[2].trim(), teamPlayers);
                      const pSale = matchPlayerInList(sMatch[5].trim(), teamPlayers);
                      sustituciones.push({ minSub, pEntra, pSale });
                    }
                  }

                  // Calcular minutos exactos (90 mins total)
                  const matchTotalMinutes = 90;
                  titulares.forEach(t => {
                    calculatedMinutesMap.set(t.player.id, { minutes: matchTotalMinutes, isTitular: true });
                  });
                  suplentes.forEach(s => {
                    calculatedMinutesMap.set(s.player.id, { minutes: 0, isTitular: false });
                  });

                  sustituciones.forEach(sub => {
                    if (sub.pSale && calculatedMinutesMap.has(sub.pSale.id)) {
                      calculatedMinutesMap.set(sub.pSale.id, { ...calculatedMinutesMap.get(sub.pSale.id)!, minutes: sub.minSub });
                    }
                    if (sub.pEntra && calculatedMinutesMap.has(sub.pEntra.id)) {
                      calculatedMinutesMap.set(sub.pEntra.id, { ...calculatedMinutesMap.get(sub.pEntra.id)!, minutes: matchTotalMinutes - sub.minSub });
                    }
                  });
                }
              }
            } catch (minErr: any) {
              console.warn("[clasificar-actas] Error parsing exact minutes:", minErr.message);
            }

            await supabase.from('match_events').delete().eq('partido_id', bestMatch.id);
            if (matchEventsToInsert.length > 0) {
              await supabase.from('match_events').insert(matchEventsToInsert);
            }

            // Actualizar convocatorias y minutos jugados
            const { data: convocatorias } = await supabase.from('convocatorias').select('*').eq('partido_id', bestMatch.id);
            if (convocatorias && convocatorias.length > 0) {
              for (const conv of convocatorias) {
                const pEvents = matchEventsToInsert.filter(e => e.player_id === conv.player_id);
                const gCount = pEvents.filter(e => e.tipo_evento === 'Gol').length;
                const aCount = pEvents.filter(e => e.tipo_evento === 'Tarjeta Amarilla').length;
                const rCount = pEvents.filter(e => e.tipo_evento === 'Tarjeta Roja').length;

                const minutesInfo = calculatedMinutesMap.get(conv.player_id);
                const minutos = minutesInfo ? minutesInfo.minutes : (conv.status === 'convocado' || pEvents.length > 0 ? 90 : 0);

                await supabase.from('convocatorias').update({
                  minutes_played: minutos,
                  goals: gCount,
                  yellow_cards: aCount,
                  red_cards: rCount
                }).eq('id', conv.id);
              }
            }
          } catch (recErr: any) {
            console.warn("[clasificar-actas] Error al conciliar eventos de jugadores:", recErr.message);
          }

          classified.push({
            fileName,
            matchId: bestMatch.id,
            teamName: bestMatch.equipo?.name || extractedCategory || "Equipo",
            rivalName: bestMatch.rival_nombre,
            matchDate: bestMatch.fecha_hora,
            assignedPath,
            score: goals.resultadoPropio !== null ? `${goals.resultadoPropio} - ${goals.resultadoRival}` : null
          });
        } else {
          // Conflicto o sin coincidencia en BD -> Guardar en pending para selección manual por el Admin
          const pendingUuid = crypto.randomUUID();
          const pendingPath = `pending/${pendingUuid}_${fileName}`;

          await supabase.storage.from("actas-partidos").upload(pendingPath, buffer, {
            contentType: "application/pdf",
            upsert: true
          });

          const candidateMatches = allMatches ? (matchingTeam ? allMatches.filter(m => m.equipo_id === matchingTeam.id) : allMatches) : [];

          pending.push({
            fileName,
            pendingPath,
            detectedCategory: extractedCategory || "No detectada",
            detectedDate: datesFound[0] ? datesFound[0].toLocaleDateString('es-ES') : "No detectada",
            candidateMatches,
            reason: (!allMatches || allMatches.length === 0)
              ? "No existen partidos creados en el calendario del club"
              : candidateMatches.length > 1
                ? `Múltiples partidos posibles (${candidateMatches.length}). Elige manualmente.`
                : "Sin partidos coincidentes en la base de datos para la fecha extraída"
          });
        }
      } catch (fileErr: any) {
        console.error(`[clasificar-actas] Error procesando ${fileName}:`, fileErr);
        pending.push({
          fileName,
          reason: fileErr.message || "Error procesando el archivo"
        });
      }
    }

    return NextResponse.json({
      success: true,
      classified,
      pending
    });
  } catch (err: any) {
    console.error("[clasificar-actas] Error general:", err);
    return NextResponse.json({ error: err.message || "Error interno del servidor" }, { status: 500 });
  }
}
