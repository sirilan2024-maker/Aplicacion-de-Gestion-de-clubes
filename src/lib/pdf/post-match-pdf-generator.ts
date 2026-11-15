import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib';

export interface PostMatchPdfPlayerRow {
  dorsal?: string | number | null;
  name: string;
  titular?: boolean;
  status: string;
  minutes: number;
  rating: number | null;
  actitud: number | null;
  goals: number;
  yellows: number;
  reds: number;
  motive?: string;
}

export interface PostMatchPdfInput {
  teamName: string;
  rivalName: string;
  fechaHora?: string | null;
  lugar?: string | null;
  resultadoPropio?: number | null;
  resultadoRival?: number | null;
  coachRating?: string | number | null;
  coachSummary?: string;
  positiveAspects?: string;
  improvementAspects?: string;
  attitudeNotes?: string;
  rivalAnalysis?: {
    system?: string;
    goals_description?: string;
    key_players?: string;
    notable_data?: string;
  };
  players: PostMatchPdfPlayerRow[];
}

function sanitizePdfText(input: string | number | undefined | null): string {
  if (input === undefined || input === null) return '';
  return String(input)
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const clean = sanitizePdfText(text);
  if (!clean) return [];
  const paragraphs = clean.split(/\r?\n/);
  const lines: string[] = [];

  for (const para of paragraphs) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (let i = 1; i < words.length; i++) {
      const candidate = `${current} ${words[i]}`;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = words[i];
      }
    }
    lines.push(current);
  }
  return lines;
}

export async function generatePostMatchReportPdfBuffer(input: PostMatchPdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;

  const colorNavy = rgb(0.08, 0.16, 0.34);
  const colorBlue = rgb(0.15, 0.39, 0.92);
  const colorSlate = rgb(0.28, 0.34, 0.42);
  const colorLightBg = rgb(0.96, 0.97, 0.99);
  const colorBorder = rgb(0.86, 0.89, 0.93);
  const colorDark = rgb(0.09, 0.11, 0.15);

  let page: PDFPage = doc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < margin + 20) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  // Header Banner
  page.drawRectangle({
    x: margin,
    y: y - 72,
    width: contentWidth,
    height: 72,
    color: colorNavy
  });

  const isLocal = !/\b(fuera|visitante)\b/i.test(input.lugar || '');
  const homeName = sanitizePdfText(isLocal ? input.teamName : input.rivalName) || 'Sporting Saladar';
  const awayName = sanitizePdfText(isLocal ? input.rivalName : input.teamName) || 'Rival';
  const homeScore = isLocal ? input.resultadoPropio : input.resultadoRival;
  const awayScore = isLocal ? input.resultadoRival : input.resultadoPropio;
  const scoreText =
    homeScore !== null && homeScore !== undefined && awayScore !== null && awayScore !== undefined
      ? `${homeScore} - ${awayScore}`
      : 'vs';

  page.drawText('INFORME COMPLETO POST-PARTIDO', {
    x: margin + 16,
    y: y - 22,
    size: 10,
    font: fontBold,
    color: rgb(0.7, 0.82, 1)
  });

  const matchTitle = sanitizePdfText(`${homeName}  ${scoreText}  ${awayName}`);
  page.drawText(matchTitle.slice(0, 68), {
    x: margin + 16,
    y: y - 43,
    size: 15,
    font: fontBold,
    color: rgb(1, 1, 1)
  });

  const dateFormatted = input.fechaHora
    ? new Date(input.fechaHora).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'Fecha pendiente';
  const metaLine = sanitizePdfText(
    `Equipo: ${input.teamName}  |  Condicion: ${isLocal ? 'Local' : 'Visitante'}  |  Fecha: ${dateFormatted}`
  );
  page.drawText(metaLine, {
    x: margin + 16,
    y: y - 60,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.85, 0.9, 0.98)
  });

  y -= 88;

  // Helper to draw a text section
  const drawTextSection = (title: string, bodyText?: string, badge?: string) => {
    const cleanBody = sanitizePdfText(bodyText) || 'Sin observaciones registradas.';
    const lines = wrapText(cleanBody, fontRegular, 9.5, contentWidth - 20);
    const boxHeight = Math.max(38, 26 + lines.length * 13 + 8);
    ensureSpace(boxHeight + 10);

    page.drawRectangle({
      x: margin,
      y: y - boxHeight,
      width: contentWidth,
      height: boxHeight,
      color: colorLightBg,
      borderColor: colorBorder,
      borderWidth: 0.75
    });

    page.drawText(sanitizePdfText(title), {
      x: margin + 10,
      y: y - 16,
      size: 9.5,
      font: fontBold,
      color: colorBlue
    });

    if (badge) {
      const badgeText = sanitizePdfText(badge);
      const bw = fontBold.widthOfTextAtSize(badgeText, 8.5);
      page.drawText(badgeText, {
        x: margin + contentWidth - bw - 10,
        y: y - 16,
        size: 8.5,
        font: fontBold,
        color: colorNavy
      });
    }

    let lineY = y - 32;
    for (const line of lines) {
      page.drawText(line, {
        x: margin + 10,
        y: lineY,
        size: 9.5,
        font: fontRegular,
        color: colorDark
      });
      lineY -= 13;
    }

    y -= boxHeight + 10;
  };

  // Coach Rating + Tactical Report
  const ratingBadge = input.coachRating ? `Nota Global: ${input.coachRating}/10` : undefined;
  drawTextSection('VALORACION GENERAL DEL PARTIDO', input.coachSummary, ratingBadge);

  if (sanitizePdfText(input.positiveAspects)) {
    drawTextSection('ASPECTOS POSITIVOS', input.positiveAspects);
  }
  if (sanitizePdfText(input.improvementAspects)) {
    drawTextSection('ASPECTOS A MEJORAR', input.improvementAspects);
  }
  if (sanitizePdfText(input.attitudeNotes)) {
    drawTextSection('ACTITUD Y COMPROMISO DEL EQUIPO', input.attitudeNotes);
  }

  // Rival Analysis
  const ra = input.rivalAnalysis;
  const rivalLines: string[] = [];
  if (sanitizePdfText(ra?.system)) rivalLines.push(`Sistema tactico rival: ${sanitizePdfText(ra?.system)}`);
  if (sanitizePdfText(ra?.goals_description)) rivalLines.push(`Como nos marcaron / marcamos: ${sanitizePdfText(ra?.goals_description)}`);
  if (sanitizePdfText(ra?.key_players)) rivalLines.push(`Jugadores clave del rival: ${sanitizePdfText(ra?.key_players)}`);
  if (sanitizePdfText(ra?.notable_data)) rivalLines.push(`Otros datos destacables: ${sanitizePdfText(ra?.notable_data)}`);
  if (rivalLines.length > 0) {
    drawTextSection('ANALISIS DEL RIVAL', rivalLines.join('\n'));
  }

  // Individual Player Evaluations Table
  ensureSpace(60);
  page.drawText(`EVALUACION INDIVIDUAL DE JUGADORES (${input.players.length})`, {
    x: margin,
    y: y - 12,
    size: 10.5,
    font: fontBold,
    color: colorNavy
  });
  y -= 22;

  const cols = [
    { label: '#', x: margin + 6, w: 24 },
    { label: 'JUGADOR', x: margin + 32, w: 180 },
    { label: 'ASISTENCIA', x: margin + 214, w: 86 },
    { label: 'MIN', x: margin + 304, w: 34 },
    { label: 'NOTA', x: margin + 342, w: 38 },
    { label: 'ACT.', x: margin + 384, w: 38 },
    { label: 'G', x: margin + 426, w: 28 },
    { label: 'TA', x: margin + 458, w: 28 },
    { label: 'TR', x: margin + 490, w: 28 }
  ];

  const drawTableHeader = () => {
    page.drawRectangle({
      x: margin,
      y: y - 20,
      width: contentWidth,
      height: 20,
      color: colorNavy
    });
    for (const c of cols) {
      page.drawText(c.label, {
        x: c.x,
        y: y - 13,
        size: 7.5,
        font: fontBold,
        color: rgb(1, 1, 1)
      });
    }
    y -= 20;
  };

  drawTableHeader();

  const sortedPlayers = [...input.players].sort((a, b) => {
    const order = (p: PostMatchPdfPlayerRow) =>
      p.status === 'Presente' ? (p.titular ? 0 : 1) : p.status === 'Justificado' ? 2 : 3;
    return order(a) - order(b);
  });

  sortedPlayers.forEach((p, idx) => {
    if (y - 18 < margin + 20) {
      page = doc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
      drawTableHeader();
    }

    const rowBg = idx % 2 === 0 ? rgb(1, 1, 1) : colorLightBg;
    page.drawRectangle({
      x: margin,
      y: y - 18,
      width: contentWidth,
      height: 18,
      color: rowBg,
      borderColor: colorBorder,
      borderWidth: 0.4
    });

    const statusLabel =
      p.status === 'Presente'
        ? p.titular
          ? 'Asiste (Tit)'
          : 'Asiste (Sup)'
        : p.status === 'Justificado'
        ? 'Justificado'
        : p.status === 'Ausente'
        ? 'No Asiste'
        : 'Pendiente';

    const dorsalStr = p.dorsal !== undefined && p.dorsal !== null && String(p.dorsal).trim() !== '' ? String(p.dorsal) : '-';
    const nameStr = sanitizePdfText(p.name).slice(0, 32);

    const cells = [
      dorsalStr,
      nameStr,
      statusLabel,
      p.status === 'Presente' ? `${p.minutes || 0}'` : '-',
      p.status === 'Presente' && p.rating ? String(p.rating) : '-',
      p.status === 'Presente' && p.actitud ? String(p.actitud) : '-',
      p.status === 'Presente' && p.goals > 0 ? String(p.goals) : '-',
      p.status === 'Presente' && p.yellows > 0 ? String(p.yellows) : '-',
      p.status === 'Presente' && p.reds > 0 ? String(p.reds) : '-'
    ];

    cols.forEach((c, ci) => {
      page.drawText(cells[ci], {
        x: c.x,
        y: y - 12,
        size: 8,
        font: ci === 1 ? fontBold : fontRegular,
        color: colorDark
      });
    });

    y -= 18;
  });

  // Footer
  const pages = doc.getPages();
  const emissionDate = new Date().toLocaleDateString('es-ES');
  pages.forEach((pg, i) => {
    pg.drawText(
      `Gestion Integral Sporting Saladar - Emitido el ${emissionDate} (Pag. ${i + 1}/${pages.length})`,
      {
        x: margin,
        y: 16,
        size: 7.5,
        font: fontRegular,
        color: colorSlate
      }
    );
  });

  return await doc.save();
}
