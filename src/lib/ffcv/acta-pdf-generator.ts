import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';
import { FFCVRawMatchDetails } from './types';
import { isFfcvRawCardRed } from './discipline-rules';
import { FFCV_LOGO_JPG_BASE64 } from './ffcv-logo-data';

function sanitizePdfText(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  return String(input)
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    // Strip characters outside WinAnsi / Latin-1 range
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

function isTitularFlag(p: any): boolean {
  return String(p?.titular) === '1' || p?.titular === 1 || p?.titular === true;
}

function isPorteroFlag(p: any): boolean {
  return (
    String(p?.portero) === '1' ||
    p?.portero === 1 ||
    p?.portero === true ||
    String(p?.posicion_jugador_abreviatura || '').toUpperCase() === 'POR' ||
    String(p?.posicion || '').toLowerCase().includes('portero')
  );
}

function isCapitanFlag(p: any): boolean {
  return String(p?.capitan) === '1' || p?.capitan === 1 || p?.capitan === true;
}

const MESES_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function formatDateSpanishLong(fechaRaw: string | undefined): string {
  const clean = sanitizePdfText(fechaRaw);
  if (!clean) return '';
  // Supports DD-MM-YYYY or DD/MM/YYYY or YYYY-MM-DD
  const dmy = clean.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const day = parseInt(dmy[1], 10);
    const monthIdx = parseInt(dmy[2], 10) - 1;
    const year = dmy[3];
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} de ${MESES_ES[monthIdx]} de ${year}`;
    }
  }
  const ymd = clean.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (ymd) {
    const year = ymd[1];
    const monthIdx = parseInt(ymd[2], 10) - 1;
    const day = parseInt(ymd[3], 10);
    if (monthIdx >= 0 && monthIdx < 12) {
      return `${day} de ${MESES_ES[monthIdx]} de ${year}`;
    }
  }
  return clean;
}

const NUMEROS_TEXTO: Record<number, string> = {
  0: 'CERO',
  1: 'UNO',
  2: 'DOS',
  3: 'TRES',
  4: 'CUATRO',
  5: 'CINCO',
  6: 'SEIS',
  7: 'SIETE',
  8: 'OCHO',
  9: 'NUEVE',
  10: 'DIEZ',
  11: 'ONCE',
  12: 'DOCE',
  13: 'TRECE',
  14: 'CATORCE',
  15: 'QUINCE',
  16: 'DIECISEIS',
  17: 'DIECISIETE',
  18: 'DIECIOCHO',
  19: 'DIECINUEVE',
  20: 'VEINTE'
};

function numberToSpanishWord(n: number): string {
  if (Number.isNaN(n) || n < 0) return 'CERO';
  return NUMEROS_TEXTO[n] || String(n);
}

function inferLocalityFromTeamOrField(teamName: string, campo: string, isHome: boolean): string {
  const t = sanitizePdfText(teamName);
  if (/saladar|almorad/i.test(t)) return 'ALMORADÍ';
  if (/cox/i.test(t)) return 'COX';
  if (/dolores/i.test(t)) return 'DOLORES';
  if (/catral/i.test(t)) return 'CATRAL';
  if (/benferri/i.test(t)) return 'BENFERRI';
  if (/algorfa/i.test(t)) return 'ALGORFA';
  if (/guardamar/i.test(t)) return 'GUARDAMAR DEL SEGURA';
  if (/novelda/i.test(t)) return 'NOVELDA';
  if (/eldense/i.test(t)) return 'ELDA';
  if (/crevillent/i.test(t)) return 'CREVILLENT';
  if (/orihuela|rabaloche/i.test(t)) return 'ORIHUELA';
  if (/torrevieja/i.test(t)) return 'TORREVIEJA';
  if (/redov/i.test(t)) return 'REDOVÁN';
  if (/rocamora/i.test(t)) return 'GRANJA DE ROCAMORA';
  if (/albatera/i.test(t)) return 'ALBATERA';
  if (/formentera/i.test(t)) return 'FORMENTERA DEL SEGURA';
  if (/montesinos/i.test(t)) return 'LOS MONTESINOS';
  if (/daya nueva/i.test(t)) return 'DAYA NUEVA';
  if (/horadada/i.test(t)) return 'PILAR DE LA HORADADA';
  if (/callosa/i.test(t)) return 'CALLOSA DE SEGURA';
  if (/rafal/i.test(t)) return 'RAFAL';
  if (/bigastro/i.test(t)) return 'BIGASTRO';
  if (/jacarilla/i.test(t)) return 'JACARILLA';
  if (/san miguel/i.test(t)) return 'SAN MIGUEL DE SALINAS';
  if (/benej/i.test(t)) return 'BENEJÚZAR';

  if (isHome && campo) {
    const c = sanitizePdfText(campo);
    if (/almorad/i.test(c)) return 'ALMORADÍ';
  }
  return t.replace(/\s*C\.?F\.?|\s*C\.?D\.?|\s*U\.?D\.?|\s*F\.?B\.?|\s*AT\.?|\s*'[A-Z]'/gi, '').trim().toUpperCase();
}

function addMinutesToTime(horaStr: string | undefined, minutesToAdd: number): string {
  const clean = sanitizePdfText(horaStr);
  const m = clean.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return '';
  const hh = parseInt(m[1], 10);
  const mm = parseInt(m[2], 10);
  const total = hh * 60 + mm + minutesToAdd;
  const nh = Math.floor((total % 1440) / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

/**
 * Genera un documento PDF oficial de 3 páginas en el formato exacto del
 * COMITÉ TÉCNICO DE ÁRBITROS de la Federació de Fútbol Comunitat Valenciana (FFCV)
 * a partir de los datos oficiales del acta electrónica FFCV.
 */
export async function generateFfcvActaPdfBuffer(
  details: FFCVRawMatchDetails,
  codactaOverride?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  let logoImage: any = null;
  try {
    const logoBytes = Buffer.from(FFCV_LOGO_JPG_BASE64, 'base64');
    logoImage = await pdfDoc.embedJpg(logoBytes);
  } catch {
    logoImage = null;
  }

  // Exact PD4ML coordinate system used by FFCV / Novanet CTA PDFs:
  // A4 page [595, 842], transform: x_pdf = 20.0 + x * S, y_pdf = 832.0 - y * S, where S = 0.75168
  const S = 0.75168;
  const px = (x: number) => 20.0 + x * S;
  const py = (y: number) => 832.0 - y * S;
  const ps = (v: number) => v * S;

  const COLOR_BLACK = rgb(0, 0, 0);
  const COLOR_GRAY_LINE = rgb(0.8, 0.8, 0.8);

  const drawTextAt = (
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    font: PDFFont,
    size: number,
    color = COLOR_BLACK
  ) => {
    const clean = sanitizePdfText(text);
    if (!clean) return;
    page.drawText(clean, {
      x: px(x),
      y: py(y),
      size: ps(size),
      font,
      color
    });
  };

  const drawRectTopLeft = (
    page: PDFPage,
    x: number,
    y: number,
    w: number,
    h: number,
    color = COLOR_BLACK
  ) => {
    page.drawRectangle({
      x: px(x),
      y: py(y + h),
      width: ps(w),
      height: ps(h),
      color
    });
  };

  const drawCheckmark = (page: PDFPage, x: number, y: number) => {
    // Draws the small check icon in the 'P' (Portero) column
    const x1 = px(x);
    const y1 = py(y - 3);
    const x2 = px(x + 3);
    const y2 = py(y);
    const x3 = px(x + 8);
    const y3 = py(y - 7);
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 1.3, color: COLOR_BLACK });
    page.drawLine({ start: { x: x2, y: y2 }, end: { x: x3, y: y3 }, thickness: 1.3, color: COLOR_BLACK });
  };

  const wrapTextByWidth = (text: string, font: PDFFont, size: number, maxWidthUnits: number): string[] => {
    const clean = sanitizePdfText(text);
    if (!clean) return [''];
    const maxPdfW = ps(maxWidthUnits);
    const words = clean.split(/\s+/);
    const lines: string[] = [];
    let current = '';
    for (const w of words) {
      const candidate = current ? `${current} ${w}` : w;
      if (font.widthOfTextAtSize(candidate, ps(size)) <= maxPdfW) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = w;
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [clean];
  };

  const codacta = sanitizePdfText(codactaOverride || details.codacta || '');
  const comp = sanitizePdfText(details.nombre_competicion || 'Competición Oficial FFCV');
  const grupo = sanitizePdfText(details.nombre_grupo || '');
  const jornada = sanitizePdfText(details.jornada || '');
  const fechaRaw = sanitizePdfText(details.fecha || '');
  const fechaLong = formatDateSpanishLong(fechaRaw);
  const hora1 = sanitizePdfText(details.hora || '');
  const is8v8 = /alev|benjam|prebenjam/i.test(comp);
  const isInfantil = /infantil/i.test(comp);
  const halfDuration = is8v8 ? 30 : isInfantil ? 35 : 45;
  const hora2 = addMinutesToTime(hora1, halfDuration + 15);
  const fechaCierreHora = addMinutesToTime(hora1, halfDuration * 2 + 45);
  const fechaCierreStr = fechaRaw
    ? `${fechaRaw} ${fechaCierreHora ? `${fechaCierreHora}:00h.` : ''}`.trim()
    : '';

  const campo = sanitizePdfText(details.campo || 'Campo Federativo');
  const homeTeam = sanitizePdfText(details.equipo_local || 'Equipo Local');
  const awayTeam = sanitizePdfText(details.equipo_visitante || 'Equipo Visitante');
  const homeLocality = inferLocalityFromTeamOrField(homeTeam, campo, true);
  const awayLocality = inferLocalityFromTeamOrField(awayTeam, campo, false);
  const matchCity = homeLocality
    ? homeLocality.charAt(0).toUpperCase() + homeLocality.slice(1).toLowerCase()
    : 'Almoradí';

  const homeScore = Number(details.goles_local ?? 0);
  const awayScore = Number(details.goles_visitante ?? 0);

  const localGoalsList = Array.isArray(details.goles_equipo_local) ? details.goles_equipo_local : [];
  const awayGoalsList = Array.isArray(details.goles_equipo_visitante) ? details.goles_equipo_visitante : [];

  // Calculate 1st half goals (PRIMER TIEMPO)
  const localHalfScore = localGoalsList.filter(g => {
    const m = parseInt(String(g?.minuto || '0'), 10);
    return !Number.isNaN(m) && m > 0 && m <= halfDuration;
  }).length;
  const awayHalfScore = awayGoalsList.filter(g => {
    const m = parseInt(String(g?.minuto || '0'), 10);
    return !Number.isNaN(m) && m > 0 && m <= halfDuration;
  }).length;

  const finalHomeHalf = Math.min(localHalfScore, homeScore);
  const finalAwayHalf = Math.min(awayHalfScore, awayScore);

  const mainReferee = sanitizePdfText(details.arbitros_partido?.[0]?.nombre_arbitro || '');
  const allLocalPlayers = Array.isArray(details.jugadores_equipo_local) ? details.jugadores_equipo_local : [];
  const allAwayPlayers = Array.isArray(details.jugadores_equipo_visitante) ? details.jugadores_equipo_visitante : [];

  const localTitulares = allLocalPlayers.filter(isTitularFlag);
  const localSuplentes = allLocalPlayers.filter(p => !isTitularFlag(p));
  const awayTitulares = allAwayPlayers.filter(isTitularFlag);
  const awaySuplentes = allAwayPlayers.filter(p => !isTitularFlag(p));

  const localCapitan = allLocalPlayers.find(isCapitanFlag) || localTitulares[0] || null;
  const awayCapitan = allAwayPlayers.find(isCapitanFlag) || awayTitulares[0] || null;

  // Count goals per player for column 'G' on Page 1
  const countPlayerGoals = (player: any, goalsArr: any[]): number => {
    if (!player) return 0;
    const pCode = String(player.codjugador || '').trim();
    const pName = sanitizePdfText(player.nombre_jugador).toUpperCase();
    let count = 0;
    for (const g of goalsArr) {
      if (String(g?.tipo_gol) === '102') continue; // Exclude own goals from scorer column
      const gCode = String(g?.codjugador || '').trim();
      const gName = sanitizePdfText(g?.nombre_jugador).toUpperCase();
      if ((pCode && gCode && pCode === gCode) || (!gCode && pName && gName === pName)) {
        count++;
      }
    }
    return count;
  };

  // Find player dorsal by code or name
  const findPlayerDorsal = (code: string | undefined, name: string | undefined, playersArr: any[]): string => {
    const c = String(code || '').trim();
    const n = sanitizePdfText(name).toUpperCase();
    const found = playersArr.find(p => {
      const pc = String(p?.codjugador || '').trim();
      const pn = sanitizePdfText(p?.nombre_jugador).toUpperCase();
      return (c && pc && c === pc) || (n && pn && n === pn);
    });
    return sanitizePdfText(found?.dorsal || '');
  };

  const isPlayerInSquad = (code: string | undefined, name: string | undefined, playersArr: any[]): boolean => {
    const c = String(code || '').trim();
    const n = sanitizePdfText(name).toUpperCase();
    return playersArr.some(p => {
      const pc = String(p?.codjugador || '').trim();
      const pn = sanitizePdfText(p?.nombre_jugador).toUpperCase();
      return (c && pc && c === pc) || (n && pn && n === pn);
    });
  };

  const drawFooter = (page: PDFPage, pageNum: number, totalPages = 3) => {
    drawTextAt(page, 'Página:', 343, 1088, fontBold, 9);
    drawTextAt(page, `${pageNum}`, 379, 1088, fontRegular, 9);
    drawTextAt(page, 'de', 387, 1088, fontBold, 9);
    drawTextAt(page, `${totalPages}`, 401, 1088, fontRegular, 9);
    const rightFooter = fechaCierreStr
      ? `Fecha cierre: ${fechaCierreStr} -  Num. Partido: ${codacta}`
      : `Num. Partido: ${codacta}`;
    drawTextAt(page, rightFooter, 486, 1088, fontRegular, 9);
  };

  // =========================================================================
  // PÁGINA 1: ENCABEZADO, DATOS DEL ENCUENTRO, ALINEACIONES, RESULTADO Y FIRMAS
  // =========================================================================
  const page1 = pdfDoc.addPage([595, 842]);

  if (logoImage) {
    page1.drawImage(logoImage, {
      x: px(55),
      y: py(69),
      width: ps(56),
      height: ps(69)
    });
  }

  drawTextAt(page1, 'Federació de Fútbol Comunitat Valenciana', 119, 39, fontRegular, 18);
  drawTextAt(page1, 'COMITÉ TÉCNICO DE ÁRBITROS', 225, 84, fontRegular, 18);

  drawTextAt(page1, 'TEMPORADA:', 55, 110, fontRegular, 9);
  drawTextAt(page1, '2026-2027', 117, 110, fontRegular, 9);
  drawTextAt(page1, 'COMPETICIÓN:', 395, 110, fontRegular, 9);
  drawTextAt(page1, comp, 462, 110, fontRegular, 9);

  drawTextAt(page1, 'GRUPO:', 55, 120, fontRegular, 9);
  drawTextAt(page1, grupo, 117, 120, fontRegular, 9);
  drawTextAt(page1, 'JORNADA:', 395, 120, fontRegular, 9);
  drawTextAt(page1, jornada, 462, 120, fontRegular, 9);

  drawRectTopLeft(page1, 55, 123, 625, 1, COLOR_BLACK);

  // ACTA del partido celebrado el ...
  drawTextAt(page1, 'ACTA', 55, 135, fontBold, 14);
  drawTextAt(page1, 'del partido celebrado el', 107, 136, fontOblique, 12);
  drawTextAt(page1, fechaLong, 250, 136, fontRegular, 13);
  drawRectTopLeft(page1, 243, 140, 166, 1, COLOR_GRAY_LINE);
  drawTextAt(page1, ', en', 409, 136, fontOblique, 12);
  drawTextAt(page1, matchCity, 453, 136, fontRegular, 12);
  drawRectTopLeft(page1, 453, 140, 227, 1, COLOR_GRAY_LINE);

  // Clubes
  drawTextAt(page1, 'Clubes:', 57, 157, fontOblique, 12);
  drawTextAt(page1, homeTeam, 119, 157, fontRegular, 12);
  drawRectTopLeft(page1, 119, 163, 288, 1, COLOR_GRAY_LINE);
  drawTextAt(page1, ', de', 409, 157, fontOblique, 12);
  drawTextAt(page1, homeLocality, 456, 157, fontRegular, 12);
  drawRectTopLeft(page1, 456, 163, 222, 1, COLOR_GRAY_LINE);

  drawTextAt(page1, awayTeam, 119, 176, fontRegular, 12);
  drawRectTopLeft(page1, 119, 183, 288, 1, COLOR_GRAY_LINE);
  drawTextAt(page1, ', de', 409, 176, fontOblique, 12);
  drawTextAt(page1, awayLocality, 456, 176, fontRegular, 12);
  drawRectTopLeft(page1, 456, 183, 222, 1, COLOR_GRAY_LINE);

  // Campo
  drawTextAt(page1, 'Campo:', 57, 200, fontOblique, 12);
  drawTextAt(page1, campo, 119, 200, fontRegular, 12);
  drawRectTopLeft(page1, 119, 206, 559, 1, COLOR_GRAY_LINE);

  // Árbitro/a Principal
  drawTextAt(page1, 'Árbitro/a Principal :', 57, 221, fontOblique, 12);
  drawTextAt(page1, mainReferee ? `D. ${mainReferee}` : 'D.', 179, 220, fontRegular, 10);
  drawRectTopLeft(page1, 179, 227, 286, 1, COLOR_GRAY_LINE);
  drawRectTopLeft(page1, 467, 227, 207, 1, COLOR_GRAY_LINE);

  // Main Lineups Table Outer Box (x=55..680, y=243..696)
  drawRectTopLeft(page1, 55, 243, 625, 1, COLOR_BLACK);
  drawRectTopLeft(page1, 55, 243, 1, 453, COLOR_BLACK);
  drawRectTopLeft(page1, 679, 243, 1, 453, COLOR_BLACK);
  drawRectTopLeft(page1, 55, 696, 625, 1, COLOR_BLACK);

  // Equipo Headers inside Box
  drawTextAt(page1, 'Equipo', 82, 257, fontOblique, 10);
  drawTextAt(page1, homeTeam, 130, 257, fontRegular, 10);
  drawRectTopLeft(page1, 130, 261, 228, 1, COLOR_GRAY_LINE);

  drawTextAt(page1, 'Equipo', 370, 257, fontOblique, 10);
  drawTextAt(page1, awayTeam, 420, 257, fontRegular, 10);
  drawRectTopLeft(page1, 420, 261, 233, 1, COLOR_GRAY_LINE);

  // Column Headers (P | G | Jugador/a | dni/codigo || Jugador/a | dni/codigo | G | P)
  drawTextAt(page1, 'P', 64, 272, fontRegular, 10);
  drawTextAt(page1, 'G', 87, 272, fontRegular, 10);
  drawTextAt(page1, 'Jugador/a', 121, 272, fontRegular, 10);
  drawTextAt(page1, 'dni/codigo', 303, 272, fontRegular, 10);

  drawTextAt(page1, 'Jugador/a', 386, 272, fontRegular, 10);
  drawTextAt(page1, 'dni/codigo', 567, 272, fontRegular, 10);
  drawTextAt(page1, 'G', 639, 272, fontRegular, 10);
  drawTextAt(page1, 'P', 664, 272, fontRegular, 10);

  drawRectTopLeft(page1, 59, 278, 616, 1, COLOR_BLACK);

  // Titulares Grid (11 rows, y=279 to y=497, row height ~19.8)
  const titularRows = 11;
  const titStartY = 279;
  const titEndY = 497;
  const titRowH = (titEndY - titStartY) / titularRows;

  // Vertical column dividers for Titulares
  const titVColsGray = [59, 79, 103, 117, 299, 382, 563, 631, 651, 675];
  for (const cx of titVColsGray) {
    drawRectTopLeft(page1, cx, 262, 1, titEndY - 262, COLOR_GRAY_LINE);
  }
  // Center black divider between Local and Visitante
  drawRectTopLeft(page1, 368, 262, 1, titEndY - 262, COLOR_BLACK);

  for (let i = 0; i < titularRows; i++) {
    const rowTop = titStartY + i * titRowH;
    const rowBottom = rowTop + titRowH;
    const textY = rowTop + 13;

    // Horizontal gray dividers for Jugador/a and dni/codigo columns
    if (i < titularRows - 1) {
      drawRectTopLeft(page1, 103, rowBottom, 265, 1, COLOR_GRAY_LINE);
      drawRectTopLeft(page1, 369, rowBottom, 262, 1, COLOR_GRAY_LINE);
    }

    const lp = localTitulares[i];
    if (lp) {
      if (isPorteroFlag(lp) || i === 0) {
        drawCheckmark(page1, 64, rowTop + 12);
      }
      const lGoals = countPlayerGoals(lp, localGoalsList);
      if (lGoals > 0) {
        drawTextAt(page1, String(lGoals), 89, textY, fontRegular, 10);
      }
      const lDorsal = sanitizePdfText(lp.dorsal);
      if (lDorsal) {
        drawTextAt(page1, `${lDorsal}.`, lDorsal.length > 1 ? 105 : 109, textY, fontRegular, 9.5);
      }
      const lNameLines = wrapTextByWidth(lp.nombre_jugador, fontRegular, 9.5, 174);
      if (lNameLines.length === 1) {
        drawTextAt(page1, lNameLines[0], 121, textY, fontRegular, 9.5);
      } else {
        drawTextAt(page1, lNameLines[0], 121, rowTop + 8.5, fontRegular, 9);
        drawTextAt(page1, lNameLines[1], 121, rowTop + 17.5, fontRegular, 9);
      }
    }

    const ap = awayTitulares[i];
    if (ap) {
      if (isPorteroFlag(ap) || i === 0) {
        drawCheckmark(page1, 659, rowTop + 12);
      }
      const aGoals = countPlayerGoals(ap, awayGoalsList);
      if (aGoals > 0) {
        drawTextAt(page1, String(aGoals), 640, textY, fontRegular, 10);
      }
      const aDorsal = sanitizePdfText(ap.dorsal);
      if (aDorsal) {
        drawTextAt(page1, `${aDorsal}.`, aDorsal.length > 1 ? 370 : 374, textY, fontRegular, 9.5);
      }
      const aNameLines = wrapTextByWidth(ap.nombre_jugador, fontRegular, 9.5, 174);
      if (aNameLines.length === 1) {
        drawTextAt(page1, aNameLines[0], 385, textY, fontRegular, 9.5);
      } else {
        drawTextAt(page1, aNameLines[0], 385, rowTop + 8.5, fontRegular, 9);
        drawTextAt(page1, aNameLines[1], 385, rowTop + 17.5, fontRegular, 9);
      }
    }
  }

  // Jugadores/as Suplentes Subheader Banner (y=497 to y=513)
  drawRectTopLeft(page1, 59, 497, 616, 1, COLOR_BLACK);
  drawTextAt(page1, 'Jugadores/as Suplentes', 314, 509, fontOblique, 10);
  drawRectTopLeft(page1, 59, 513, 616, 1, COLOR_BLACK);

  // Suplentes Grid (7 rows, y=514 to y=642, row height ~18.2)
  const supRows = 7;
  const supStartY = 514;
  const supEndY = 642;
  const supRowH = (supEndY - supStartY) / supRows;

  for (const cx of titVColsGray) {
    drawRectTopLeft(page1, cx, supStartY, 1, supEndY - supStartY, COLOR_GRAY_LINE);
  }
  drawRectTopLeft(page1, 368, supStartY, 1, supEndY - supStartY, COLOR_BLACK);

  for (let i = 0; i < supRows; i++) {
    const rowTop = supStartY + i * supRowH;
    const rowBottom = rowTop + supRowH;
    const textY = rowTop + 12.5;

    if (i < supRows - 1) {
      drawRectTopLeft(page1, 103, rowBottom, 265, 1, COLOR_GRAY_LINE);
      drawRectTopLeft(page1, 369, rowBottom, 262, 1, COLOR_GRAY_LINE);
    }

    const ls = localSuplentes[i];
    if (ls) {
      if (isPorteroFlag(ls) || String(ls.dorsal) === '13' || String(ls.dorsal) === '25') {
        drawCheckmark(page1, 64, rowTop + 11.5);
      }
      const lGoals = countPlayerGoals(ls, localGoalsList);
      if (lGoals > 0) {
        drawTextAt(page1, String(lGoals), 89, textY, fontRegular, 10);
      }
      const lDorsal = sanitizePdfText(ls.dorsal);
      if (lDorsal) {
        drawTextAt(page1, `${lDorsal}.`, lDorsal.length > 1 ? 105 : 109, textY, fontRegular, 9.5);
      }
      const lNameLines = wrapTextByWidth(ls.nombre_jugador, fontRegular, 9.5, 174);
      drawTextAt(page1, lNameLines[0], 121, textY, fontRegular, 9.5);
    }

    const as = awaySuplentes[i];
    if (as) {
      if (isPorteroFlag(as) || String(as.dorsal) === '13' || String(as.dorsal) === '25') {
        drawCheckmark(page1, 659, rowTop + 11.5);
      }
      const aGoals = countPlayerGoals(as, awayGoalsList);
      if (aGoals > 0) {
        drawTextAt(page1, String(aGoals), 640, textY, fontRegular, 10);
      }
      const aDorsal = sanitizePdfText(as.dorsal);
      if (aDorsal) {
        drawTextAt(page1, `${aDorsal}.`, aDorsal.length > 1 ? 370 : 374, textY, fontRegular, 9.5);
      }
      const aNameLines = wrapTextByWidth(as.nombre_jugador, fontRegular, 9.5, 174);
      drawTextAt(page1, aNameLines[0], 385, textY, fontRegular, 9.5);
    }
  }

  // Bottom border of Suplentes table
  drawRectTopLeft(page1, 59, supEndY, 616, 1, COLOR_BLACK);

  // Entrenador/a & 2º Entrenador/a section (y=643 to y=696)
  const entLocal = sanitizePdfText(details.entrenador_local);
  const ent2Local = sanitizePdfText(details.entrenador2_local);
  const entVisit = sanitizePdfText(details.entrenador_visitante);
  const ent2Visit = sanitizePdfText(details.entrenador2_visitante);

  drawTextAt(page1, 'Entrenador/a', 58, 657, fontOblique, 10);
  drawTextAt(page1, 'D.', 58, 669, fontOblique, 10);
  if (entLocal) {
    const lines = wrapTextByWidth(entLocal, fontRegular, 9.5, 160);
    drawTextAt(page1, lines[0], 123, lines.length > 1 ? 657 : 665, fontRegular, 9.5);
    if (lines[1]) drawTextAt(page1, lines[1], 123, 669, fontRegular, 9.5);
  }
  drawTextAt(page1, 'Lic. nº', 289, 669, fontOblique, 10);
  drawRectTopLeft(page1, 123, 673, 166, 1, COLOR_GRAY_LINE);
  drawRectTopLeft(page1, 319, 673, 47, 1, COLOR_GRAY_LINE);

  drawTextAt(page1, 'Entrenador/a', 371, 657, fontOblique, 10);
  drawTextAt(page1, 'D.', 371, 669, fontOblique, 10);
  if (entVisit) {
    const lines = wrapTextByWidth(entVisit, fontRegular, 9.5, 158);
    drawTextAt(page1, lines[0], 436, lines.length > 1 ? 657 : 665, fontRegular, 9.5);
    if (lines[1]) drawTextAt(page1, lines[1], 436, 669, fontRegular, 9.5);
  }
  drawTextAt(page1, 'Lic. nº', 598, 669, fontOblique, 10);
  drawRectTopLeft(page1, 436, 673, 162, 1, COLOR_GRAY_LINE);
  drawRectTopLeft(page1, 628, 673, 47, 1, COLOR_GRAY_LINE);

  drawTextAt(page1, '2º Entren D.', 58, 690, fontOblique, 10);
  if (ent2Local) drawTextAt(page1, ent2Local, 123, 690, fontRegular, 9.5);
  drawTextAt(page1, 'Lic. nº', 289, 690, fontOblique, 10);
  drawRectTopLeft(page1, 123, 694, 166, 1, COLOR_GRAY_LINE);
  drawRectTopLeft(page1, 319, 694, 47, 1, COLOR_GRAY_LINE);

  drawTextAt(page1, '2º Entren D.', 371, 690, fontOblique, 10);
  if (ent2Visit) drawTextAt(page1, ent2Visit, 436, 690, fontRegular, 9.5);
  drawTextAt(page1, 'Lic. nº', 598, 690, fontOblique, 10);
  drawRectTopLeft(page1, 436, 694, 162, 1, COLOR_GRAY_LINE);
  drawRectTopLeft(page1, 628, 694, 47, 1, COLOR_GRAY_LINE);

  // PRIMER TIEMPO / FINAL Score Section (y=708..748)
  drawTextAt(page1, 'PRIMER TIEMPO', 291, 708, fontRegular, 10);
  drawTextAt(page1, 'FINAL', 401, 708, fontRegular, 10);
  drawTextAt(page1, 'Resultado', 55, 734, fontOblique, 10);

  // Home Score Row (y=727)
  drawTextAt(page1, homeTeam, 107, 727, fontRegular, 10);
  drawTextAt(page1, numberToSpanishWord(finalHomeHalf), 291, 727, fontBold, 10);
  drawTextAt(page1, '(', 354, 727, fontOblique, 10);
  drawTextAt(page1, String(finalHomeHalf), 363, 727, fontBold, 10);
  drawTextAt(page1, ')', 378, 727, fontOblique, 10);

  drawTextAt(page1, numberToSpanishWord(homeScore), 401, 727, fontBold, 10);
  drawTextAt(page1, '(', 460, 727, fontOblique, 10);
  drawTextAt(page1, String(homeScore), 469, 727, fontBold, 10);
  drawTextAt(page1, ')', 484, 727, fontOblique, 10);

  drawTextAt(page1, 'Hora de comienzo', 504, 724, fontOblique, 10);
  drawTextAt(page1, '1ª Parte', 592, 727, fontOblique, 10);
  drawTextAt(page1, hora1, 635, 727, fontBold, 10);
  drawRectTopLeft(page1, 107, 731, 382, 1, COLOR_GRAY_LINE);
  drawRectTopLeft(page1, 635, 731, 45, 1, COLOR_GRAY_LINE);

  // Away Score Row (y=743)
  drawTextAt(page1, awayTeam, 107, 743, fontRegular, 10);
  drawTextAt(page1, numberToSpanishWord(finalAwayHalf), 291, 743, fontBold, 10);
  drawTextAt(page1, '(', 354, 743, fontOblique, 10);
  drawTextAt(page1, String(finalAwayHalf), 363, 743, fontBold, 10);
  drawTextAt(page1, ')', 378, 743, fontOblique, 10);

  drawTextAt(page1, numberToSpanishWord(awayScore), 401, 743, fontBold, 10);
  drawTextAt(page1, '(', 460, 743, fontOblique, 10);
  drawTextAt(page1, String(awayScore), 469, 743, fontBold, 10);
  drawTextAt(page1, ')', 484, 743, fontOblique, 10);

  drawTextAt(page1, '2ª Parte', 592, 743, fontOblique, 10);
  drawTextAt(page1, hora2, 635, 743, fontBold, 10);
  drawRectTopLeft(page1, 107, 747, 382, 1, COLOR_GRAY_LINE);
  drawRectTopLeft(page1, 635, 747, 45, 1, COLOR_GRAY_LINE);

  // Capitán/a y Entrenador/a (y=765..825)
  drawTextAt(page1, 'Capitán/a y Entrenador/a', 55, 765, fontOblique, 10);
  drawTextAt(page1, 'Capitán/a y Entrenador/a', 369, 765, fontOblique, 10);

  drawTextAt(page1, homeTeam, 92, 781, fontRegular, 10);
  drawTextAt(page1, 'Nº', 329, 781, fontRegular, 10);
  drawTextAt(page1, sanitizePdfText(localCapitan?.dorsal || ''), 345, 781, fontBold, 10);
  drawRectTopLeft(page1, 92, 789, 277, 1, COLOR_GRAY_LINE);

  drawTextAt(page1, awayTeam, 406, 781, fontRegular, 10);
  drawTextAt(page1, 'Nº', 648, 781, fontRegular, 10);
  drawTextAt(page1, sanitizePdfText(awayCapitan?.dorsal || ''), 664, 781, fontBold, 10);
  drawRectTopLeft(page1, 406, 789, 274, 1, COLOR_GRAY_LINE);

  if (localCapitan?.nombre_jugador) {
    drawTextAt(page1, `(CAP.L) ${sanitizePdfText(localCapitan.nombre_jugador)}`, 104, 802, fontBold, 10);
  }
  if (awayCapitan?.nombre_jugador) {
    drawTextAt(page1, `(CAP.V) ${sanitizePdfText(awayCapitan.nombre_jugador)}`, 418, 802, fontBold, 10);
  }
  if (entLocal) {
    drawTextAt(page1, `(ENT.L) ${entLocal}`, 104, 822, fontBold, 10);
  }
  if (entVisit) {
    drawTextAt(page1, `(ENT.V) ${entVisit}`, 418, 822, fontBold, 10);
  }

  // Delegado/a de Campo
  drawTextAt(page1, 'Delegado/a de Campo', 55, 859, fontOblique, 10);
  const delCampo = sanitizePdfText(details.delegadocampo || details.delegadolocal || '');
  if (delCampo) {
    drawTextAt(page1, `(DEL.L) ${delCampo}`, 104, 875, fontBold, 10);
  }

  drawFooter(page1, 1, 3);

  // =========================================================================
  // PÁGINA 2: SUSTITUCIONES EFECTUADAS, GOLES MARCADOS, TARJETAS Y DELEGADOS
  // =========================================================================
  const page2 = pdfDoc.addPage([595, 842]);

  // 1. SUSTITUCIONES EFECTUADAS
  drawTextAt(page2, 'SUSTITUCIONES EFECTUADAS', 260, 22, fontBold, 14);
  drawRectTopLeft(page2, 260, 24.5, 213, 1, COLOR_BLACK);

  drawTextAt(page2, 'Equipo', 55, 50, fontBold, 12);
  drawTextAt(page2, homeTeam, 100, 50, fontRegular, 12);
  drawRectTopLeft(page2, 55, 54, 304, 1, COLOR_BLACK);

  drawTextAt(page2, 'Equipo', 376, 50, fontBold, 12);
  drawTextAt(page2, awayTeam, 421, 50, fontRegular, 12);
  drawRectTopLeft(page2, 376, 54, 304, 1, COLOR_BLACK);

  const localSubs = Array.isArray(details.sustituciones_equipo_local) ? details.sustituciones_equipo_local : [];
  const awaySubs = Array.isArray(details.sustituciones_equipo_visitante) ? details.sustituciones_equipo_visitante : [];
  const maxSubs = Math.max(localSubs.length, awaySubs.length, 1);

  let subCurY = 66;
  const renderSubColumn = (subsArr: any[], baseX: number) => {
    let y = 66;
    for (const s of subsArr) {
      const dEntra = sanitizePdfText(s.entradorsal || '');
      const nEntra = sanitizePdfText(s.nombre_jugador_entra || '');
      const min = sanitizePdfText(s.minuto || '');
      const dSale = sanitizePdfText(s.saledorsal || '');
      const nSale = sanitizePdfText(s.nombre_jugador_sale || '');

      drawTextAt(page2, 'El jugador', baseX, y, fontBold, 10);
      drawTextAt(page2, `(${dEntra.padEnd(2, ' ')})`, baseX + 57, y, fontRegular, 11);
      drawTextAt(page2, nEntra, baseX + 82, y, fontRegular, 10.5);
      drawTextAt(page2, 'min.', baseX + 260, y, fontBold, 10);
      drawTextAt(page2, min, baseX + 288, y, fontRegular, 11);
      drawRectTopLeft(page2, baseX + 57, y + 4, 203, 1, COLOR_GRAY_LINE);
      drawRectTopLeft(page2, baseX + 288, y + 4, 16, 1, COLOR_GRAY_LINE);

      y += 16;
      drawTextAt(page2, 'sustituye a', baseX, y, fontBold, 10);
      drawTextAt(page2, `(${dSale.padEnd(2, ' ')})`, baseX + 57, y, fontRegular, 11);
      drawTextAt(page2, nSale, baseX + 82, y, fontRegular, 10.5);
      drawRectTopLeft(page2, baseX + 57, y + 4, 247, 1, COLOR_GRAY_LINE);

      y += 18;
    }
    return y;
  };

  const endLocalSubsY = renderSubColumn(localSubs, 55);
  const endAwaySubsY = renderSubColumn(awaySubs, 376);
  subCurY = Math.max(endLocalSubsY, endAwaySubsY, 66 + maxSubs * 34);
  drawRectTopLeft(page2, 367, 40, 1, Math.max(subCurY - 40, 25), COLOR_GRAY_LINE);

  // 2. GOLES MARCADOS
  let goalsTitleY = Math.max(subCurY + 35, 298);
  drawTextAt(page2, 'GOLES MARCADOS', 300, goalsTitleY, fontBold, 14);
  drawRectTopLeft(page2, 300, goalsTitleY + 2.5, 134, 1, COLOR_BLACK);

  const goalsHeaderY = goalsTitleY + 28;
  drawTextAt(page2, 'Equipo', 55, goalsHeaderY, fontBold, 12);
  drawTextAt(page2, homeTeam, 100, goalsHeaderY, fontRegular, 12);
  drawRectTopLeft(page2, 55, goalsHeaderY + 4, 304, 1, COLOR_BLACK);

  drawTextAt(page2, 'Equipo', 376, goalsHeaderY, fontBold, 12);
  drawTextAt(page2, awayTeam, 421, goalsHeaderY, fontRegular, 12);
  drawRectTopLeft(page2, 376, goalsHeaderY + 4, 304, 1, COLOR_BLACK);

  const renderGoalsColumn = (goalsArr: any[], baseX: number, startY: number) => {
    let y = startY;
    for (const g of goalsArr) {
      const min = sanitizePdfText(g.minuto || '');
      const name = sanitizePdfText(g.nombre_jugador || '');
      const tipoLabel =
        String(g.tipo_gol) === '102'
          ? 'Propia Puerta'
          : String(g.tipo_gol) === '101'
          ? 'Penalti'
          : 'Gol';

      drawTextAt(page2, `(${min}')`, baseX + 2, y, fontRegular, 11.5);
      drawTextAt(page2, name, baseX + 40, y, fontRegular, 11);
      drawTextAt(page2, tipoLabel, baseX + 265, y, fontRegular, 11.5);
      drawRectTopLeft(page2, baseX, y + 4, 304, 1, COLOR_GRAY_LINE);
      y += 22;
    }
    return y;
  };

  const endLocalGoalsY = renderGoalsColumn(localGoalsList, 55, goalsHeaderY + 21);
  const endAwayGoalsY = renderGoalsColumn(awayGoalsList, 376, goalsHeaderY + 21);
  const goalsEndY = Math.max(endLocalGoalsY, endAwayGoalsY, goalsHeaderY + 30);
  drawRectTopLeft(page2, 367, goalsHeaderY - 10, 1, Math.max(goalsEndY - (goalsHeaderY - 10), 25), COLOR_GRAY_LINE);

  // 3. TARJETAS
  const cardsTitleY = Math.max(goalsEndY + 35, 534);
  drawTextAt(page2, 'TARJETAS', 330, cardsTitleY, fontBold, 14);
  drawRectTopLeft(page2, 330, cardsTitleY + 2.5, 74, 1, COLOR_BLACK);

  const cardsHeaderY = cardsTitleY + 28;
  drawTextAt(page2, 'Equipo', 55, cardsHeaderY, fontBold, 12);
  drawTextAt(page2, homeTeam, 100, cardsHeaderY, fontRegular, 12);
  drawRectTopLeft(page2, 55, cardsHeaderY + 4, 304, 1, COLOR_BLACK);

  drawTextAt(page2, 'Equipo', 376, cardsHeaderY, fontBold, 12);
  drawTextAt(page2, awayTeam, 421, cardsHeaderY, fontRegular, 12);
  drawRectTopLeft(page2, 376, cardsHeaderY + 4, 304, 1, COLOR_BLACK);

  const localCardsList = Array.isArray(details.tarjetas_equipo_local) ? details.tarjetas_equipo_local : [];
  const awayCardsList = Array.isArray(details.tarjetas_equipo_visitante) ? details.tarjetas_equipo_visitante : [];

  const renderCardsColumn = (cardsArr: any[], baseX: number, startY: number) => {
    let y = startY;
    for (const c of cardsArr) {
      const min = sanitizePdfText(c.minuto || '');
      const name = sanitizePdfText(c.nombre_jugador || '');
      const isSecondYellow = String(c.segunda_amarilla ?? '').trim() === '1';
      const isRed = isFfcvRawCardRed(c);
      const cardLabel = isSecondYellow ? 'Doble Amarilla' : isRed ? 'Roja' : 'Amarilla';

      drawTextAt(page2, `(${min}')`, baseX + 2, y, fontRegular, 11.5);
      drawTextAt(page2, name, baseX + 38, y, fontRegular, 10.5);
      drawTextAt(page2, cardLabel, baseX + (isSecondYellow ? 225 : 258), y, isRed ? fontBold : fontRegular, 11);
      drawRectTopLeft(page2, baseX, y + 4, 304, 1, COLOR_GRAY_LINE);
      y += 21;
    }
    return y;
  };

  const endLocalCardsY = renderCardsColumn(localCardsList, 55, cardsHeaderY + 21);
  const endAwayCardsY = renderCardsColumn(awayCardsList, 376, cardsHeaderY + 21);
  const cardsEndY = Math.max(endLocalCardsY, endAwayCardsY, cardsHeaderY + 30);
  drawRectTopLeft(page2, 367, cardsHeaderY - 10, 1, Math.max(cardsEndY - (cardsHeaderY - 10), 25), COLOR_GRAY_LINE);

  // 4. FIRMA DE LOS DELEGADOS DE LOS CLUBES
  const delSignTitleY = Math.max(cardsEndY + 45, 755);
  drawTextAt(page2, 'FIRMA DE LOS DELEGADOS DE LOS CLUBES', 212, delSignTitleY, fontBold, 14);
  drawRectTopLeft(page2, 212, delSignTitleY + 2.5, 310, 1, COLOR_BLACK);

  const delSignRowY = delSignTitleY + 34;
  const delLocalName = sanitizePdfText(details.delegadolocal || '');
  const delVisitName = sanitizePdfText(details.delegado_visitante || '');

  drawTextAt(page2, 'Equipo Local: D.', 55, delSignRowY, fontBold, 12);
  drawTextAt(page2, delLocalName, 159, delSignRowY, fontRegular, 12);
  drawRectTopLeft(page2, 159, delSignRowY + 4, 189, 1, COLOR_GRAY_LINE);

  drawTextAt(page2, 'Equipo Visitante: D.', 355, delSignRowY, fontBold, 12);
  drawTextAt(page2, delVisitName, 475, delSignRowY, fontRegular, 12);
  drawRectTopLeft(page2, 475, delSignRowY + 4, 205, 1, COLOR_GRAY_LINE);

  drawFooter(page2, 2, 3);

  // =========================================================================
  // PÁGINA 3: INCIDENCIAS (JUGADORES, TÉCNICOS, PÚBLICO, OBSERVACIONES Y FIRMA ÁRBITRO)
  // =========================================================================
  const page3 = pdfDoc.addPage([595, 842]);

  drawTextAt(page3, 'INCIDENCIAS', 322, 22, fontBold, 14);
  drawRectTopLeft(page3, 322, 24.5, 90, 1, COLOR_BLACK);

  // Classify cards into Players vs Staff (Dirigentes y Técnicos), and Amonestaciones vs Expulsiones
  interface ClassifiedCard {
    teamName: string;
    dorsal: string;
    playerName: string;
    minuto: string;
    isRed: boolean;
    isSecondYellow: boolean;
    isStaff: boolean;
    motivo?: string;
  }

  const allClassifiedCards: ClassifiedCard[] = [];
  for (const c of localCardsList) {
    const dorsal = findPlayerDorsal(c.codjugador, c.nombre_jugador, allLocalPlayers);
    const inSquad = isPlayerInSquad(c.codjugador, c.nombre_jugador, allLocalPlayers);
    allClassifiedCards.push({
      teamName: homeTeam,
      dorsal,
      playerName: sanitizePdfText(c.nombre_jugador),
      minuto: sanitizePdfText(c.minuto),
      isRed: isFfcvRawCardRed(c),
      isSecondYellow: String(c.segunda_amarilla ?? '').trim() === '1',
      isStaff: !inSquad,
      motivo: sanitizePdfText((c as any).motivo || (c as any).observaciones || '')
    });
  }
  for (const c of awayCardsList) {
    const dorsal = findPlayerDorsal(c.codjugador, c.nombre_jugador, allAwayPlayers);
    const inSquad = isPlayerInSquad(c.codjugador, c.nombre_jugador, allAwayPlayers);
    allClassifiedCards.push({
      teamName: awayTeam,
      dorsal,
      playerName: sanitizePdfText(c.nombre_jugador),
      minuto: sanitizePdfText(c.minuto),
      isRed: isFfcvRawCardRed(c),
      isSecondYellow: String(c.segunda_amarilla ?? '').trim() === '1',
      isStaff: !inSquad,
      motivo: sanitizePdfText((c as any).motivo || (c as any).observaciones || '')
    });
  }

  const playerYellows = allClassifiedCards.filter(c => !c.isStaff && !c.isRed);
  const playerReds = allClassifiedCards.filter(c => !c.isStaff && c.isRed);
  const staffYellows = allClassifiedCards.filter(c => c.isStaff && !c.isRed);
  const staffReds = allClassifiedCards.filter(c => c.isStaff && c.isRed);

  let p3Y = 51;

  // 1.- JUGADORES
  drawTextAt(page3, '1.- JUGADORES', 55, p3Y, fontBold, 13);
  drawRectTopLeft(page3, 55, p3Y + 4, 625, 1, COLOR_BLACK);
  p3Y += 18;

  // A.- AMONESTACIONES (Jugadores)
  drawTextAt(page3, 'A.- AMONESTACIONES', 67, p3Y, fontRegular, 13);
  drawRectTopLeft(page3, 67, p3Y + 4, 613, 1, COLOR_GRAY_LINE);
  p3Y += 18;

  if (playerYellows.length === 0) {
    drawTextAt(page3, 'Ninguna', 77, p3Y, fontRegular, 11);
    p3Y += 18;
  } else {
    for (const item of playerYellows) {
      const dorsalStr = item.dorsal ? `(${item.dorsal}) ` : '';
      const prefix = `- ${item.teamName} : `;
      const rest = `En el minuto ${item.minuto} el jugador ${dorsalStr}${item.playerName} fue amonestado${item.motivo ? ` por el siguiente motivo: ${item.motivo}` : '.'}`;
      drawTextAt(page3, prefix, 77, p3Y, fontBold, 11.5);
      const prefixW = fontBold.widthOfTextAtSize(sanitizePdfText(prefix), ps(11.5)) / S;
      const lines = wrapTextByWidth(rest, fontRegular, 11.5, 595 - prefixW);
      drawTextAt(page3, lines[0], 77 + prefixW + 3, p3Y, fontRegular, 11.5);
      for (let li = 1; li < lines.length; li++) {
        p3Y += 14;
        drawTextAt(page3, lines[li], 77, p3Y, fontRegular, 11.5);
      }
      p3Y += 18;
    }
  }

  p3Y += 6;
  // B.- EXPULSIONES (Jugadores)
  drawTextAt(page3, 'B.- EXPULSIONES', 67, p3Y, fontRegular, 13);
  drawRectTopLeft(page3, 67, p3Y + 4, 613, 1, COLOR_GRAY_LINE);
  p3Y += 18;

  if (playerReds.length === 0) {
    drawTextAt(page3, 'Ninguna', 77, p3Y, fontRegular, 11);
    p3Y += 18;
  } else {
    for (const item of playerReds) {
      const dorsalStr = item.dorsal ? `(${item.dorsal}) ` : '';
      const tipoExp = item.isSecondYellow ? 'por doble amonestación (segunda amarilla)' : 'con tarjeta roja directa';
      const prefix = `- ${item.teamName} : `;
      const rest = `En el minuto ${item.minuto} el jugador ${dorsalStr}${item.playerName} fue expulsado ${tipoExp}${item.motivo ? ` por el siguiente motivo: ${item.motivo}` : '.'}`;
      drawTextAt(page3, prefix, 77, p3Y, fontBold, 11.5);
      const prefixW = fontBold.widthOfTextAtSize(sanitizePdfText(prefix), ps(11.5)) / S;
      const lines = wrapTextByWidth(rest, fontRegular, 11.5, 595 - prefixW);
      drawTextAt(page3, lines[0], 77 + prefixW + 3, p3Y, fontRegular, 11.5);
      for (let li = 1; li < lines.length; li++) {
        p3Y += 14;
        drawTextAt(page3, lines[li], 77, p3Y, fontRegular, 11.5);
      }
      p3Y += 18;
    }
  }

  p3Y += 6;
  // C.- OTRAS INCIDENCIAS (Jugadores)
  drawTextAt(page3, 'C.- OTRAS INCIDENCIAS', 67, p3Y, fontRegular, 13);
  drawRectTopLeft(page3, 67, p3Y + 4, 613, 1, COLOR_GRAY_LINE);
  p3Y += 24;

  // 2.- DIRIGENTES y TÉCNICOS
  drawTextAt(page3, '2.- DIRIGENTES y TÉCNICOS', 55, p3Y, fontBold, 13);
  drawRectTopLeft(page3, 55, p3Y + 4, 625, 1, COLOR_BLACK);
  p3Y += 18;

  drawTextAt(page3, 'A.- AMONESTACIONES', 67, p3Y, fontRegular, 13);
  drawRectTopLeft(page3, 67, p3Y + 4, 613, 1, COLOR_GRAY_LINE);
  p3Y += 18;

  if (staffYellows.length > 0) {
    for (const item of staffYellows) {
      const prefix = `- ${item.teamName} : `;
      const rest = `En el minuto ${item.minuto} el técnico/delegado ${item.playerName} fue amonestado.`;
      drawTextAt(page3, prefix, 77, p3Y, fontBold, 11.5);
      const prefixW = fontBold.widthOfTextAtSize(sanitizePdfText(prefix), ps(11.5)) / S;
      drawTextAt(page3, rest, 77 + prefixW + 3, p3Y, fontRegular, 11.5);
      p3Y += 18;
    }
  } else {
    p3Y += 10;
  }

  drawTextAt(page3, 'B.- EXPULSIONES', 67, p3Y, fontRegular, 13);
  drawRectTopLeft(page3, 67, p3Y + 4, 613, 1, COLOR_GRAY_LINE);
  p3Y += 18;

  if (staffReds.length > 0) {
    for (const item of staffReds) {
      const prefix = `- ${item.teamName} : `;
      const rest = `En el minuto ${item.minuto} el técnico/delegado ${item.playerName} fue expulsado.`;
      drawTextAt(page3, prefix, 77, p3Y, fontBold, 11.5);
      const prefixW = fontBold.widthOfTextAtSize(sanitizePdfText(prefix), ps(11.5)) / S;
      drawTextAt(page3, rest, 77 + prefixW + 3, p3Y, fontRegular, 11.5);
      p3Y += 18;
    }
  } else {
    p3Y += 10;
  }

  drawTextAt(page3, 'C.- OTRAS INCIDENCIAS', 67, p3Y, fontRegular, 13);
  drawRectTopLeft(page3, 67, p3Y + 4, 613, 1, COLOR_GRAY_LINE);
  p3Y += 18;

  const otrosLocal = Array.isArray((details as any).otros_tecnicos_local) ? (details as any).otros_tecnicos_local : [];
  const otrosVisit = Array.isArray((details as any).otros_tecnicos_visitante) ? (details as any).otros_tecnicos_visitante : [];

  if (otrosLocal.length > 0) {
    drawTextAt(page3, 'Otras licencias del equipo local:', 77, p3Y, fontRegular, 11.5);
    p3Y += 14;
    for (const ot of otrosLocal) {
      const label = sanitizePdfText(ot.tipo || ot.cargo || 'Técnico');
      const val = sanitizePdfText(ot.nombre || ot.nombre_tecnico || JSON.stringify(ot));
      drawTextAt(page3, ` - ${label}: ${val}`, 77, p3Y, fontRegular, 11.5);
      p3Y += 14;
    }
    p3Y += 6;
  }
  if (otrosVisit.length > 0) {
    drawTextAt(page3, 'Otras licencias del equipo visitante:', 77, p3Y, fontRegular, 11.5);
    p3Y += 14;
    for (const ot of otrosVisit) {
      const label = sanitizePdfText(ot.tipo || ot.cargo || 'Técnico');
      const val = sanitizePdfText(ot.nombre || ot.nombre_tecnico || JSON.stringify(ot));
      drawTextAt(page3, ` - ${label}: ${val}`, 77, p3Y, fontRegular, 11.5);
      p3Y += 14;
    }
    p3Y += 6;
  }
  if (otrosLocal.length === 0 && otrosVisit.length === 0) {
    p3Y += 10;
  }

  // 4.- TARJETA VERDE
  drawTextAt(page3, '4.- TARJETA VERDE', 55, p3Y, fontBold, 13);
  drawRectTopLeft(page3, 55, p3Y + 4, 625, 1, COLOR_BLACK);
  p3Y += 29;

  // 3.- PÚBLICO
  drawTextAt(page3, '3.- PÚBLICO', 55, p3Y, fontBold, 13);
  drawRectTopLeft(page3, 55, p3Y + 4, 625, 1, COLOR_BLACK);
  p3Y += 16;
  drawTextAt(page3, 'Normal', 67, p3Y, fontRegular, 12);
  p3Y += 28;

  // 4.- DEFICIENCIAS OBSERVADAS EN EL TERRENO DE JUEGO E INSTALACIONES
  drawTextAt(page3, '4.- DEFICIENCIAS OBSERVADAS EN EL TERRENO DE JUEGO E INSTALACIONES', 55, p3Y, fontBold, 13);
  drawRectTopLeft(page3, 55, p3Y + 4, 625, 1, COLOR_BLACK);
  p3Y += 29;

  // 5.- OTRAS OBSERVACIONES O AMPLIACIONES A LAS ANTERIORES
  drawTextAt(page3, '5.- OTRAS OBSERVACIONES O AMPLIACIONES A LAS ANTERIORES', 55, p3Y, fontBold, 13);
  drawRectTopLeft(page3, 55, p3Y + 4, 625, 1, COLOR_BLACK);
  p3Y += 16;
  drawTextAt(page3, 'Acta leída y presentada delante de los delegados de ambos equipos.', 67, p3Y, fontRegular, 12);
  p3Y += 40;

  // Referee Signature Block
  drawTextAt(page3, `${matchCity}, ${fechaLong}`, 151, p3Y, fontBold, 12);
  p3Y += 15;
  drawTextAt(page3, 'El Árbitro', 226, p3Y, fontBold, 12);
  p3Y += 15;
  if (mainReferee) {
    const arbTipo = sanitizePdfText(details.arbitros_partido?.[0]?.tipo_arbitro || 'ÁRBITRO PRINCIPAL').toUpperCase();
    drawTextAt(page3, `(${arbTipo}) ${mainReferee}`, 126, p3Y, fontBold, 12);
  }

  drawFooter(page3, 3, 3);

  return pdfDoc.save();
}
