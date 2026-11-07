import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';

/**
 * Sanitiza texto para fuentes estándar de pdf-lib (WinAnsiEncoding).
 * Elimina emojis y caracteres que no pertenezcan al juego de caracteres Windows-1252.
 */
function sanitizePdfText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    // Reemplazar saltos de línea y tabulaciones con espacios para líneas de tabla
    .replace(/[\r\n\t]+/g, ' ')
    // Filtrar caracteres fuera del rango WinAnsi / Latin-1 común (incluye á, é, í, ó, ú, ñ, Ñ, ¿, ¡, etc.)
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

export interface AttendanceEventItem {
  id: string;
  date: string;
  eventType: string; // 'Entrenamiento' | 'Partido' | 'Otro'
  title: string;
  status: string; // 'present' | 'absent' | 'excused' | 'retraso' | etc.
  notes?: string | null;
}

export interface PlayerAttendanceSummaryItem {
  playerId: string;
  firstName: string;
  lastName: string;
  dorsal: number | null;
  trainingsPresent: number;
  trainingsTotal: number;
  matchesPresent: number;
  matchesTotal: number;
  absences: number; // Injustificadas
  excused: number;  // Justificadas
  late: number;     // Retrasos
  percentage: number;
}

export interface TeamAttendancePdfData {
  clubName?: string;
  teamName: string;
  category?: string;
  seasonName: string;
  generatedDate: string;
  filterApplied: string; // 'Todos' | 'Solo Entrenamientos' | 'Solo Partidos'
  totalSessions: number;
  totalTrainings: number;
  totalMatches: number;
  averageAttendancePct: number;
  players: PlayerAttendanceSummaryItem[];
}

export interface PlayerAttendancePdfData {
  clubName?: string;
  teamName: string;
  category?: string;
  seasonName: string;
  generatedDate: string;
  filterApplied: string;
  player: {
    id: string;
    firstName: string;
    lastName: string;
    dorsal: number | null;
  };
  summary: {
    totalEvents: number;
    trainingsAttended: number;
    trainingsTotal: number;
    matchesAttended: number;
    matchesTotal: number;
    absences: number;
    excused: number;
    late: number;
    percentage: number;
  };
  events: AttendanceEventItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERADOR PDF INFORME DE EQUIPO
// ─────────────────────────────────────────────────────────────────────────────

export async function generateTeamAttendancePdf(data: TeamAttendancePdfData): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Paleta oficial Sporting Saladar
  const primaryColor = rgb(0.01, 0.52, 0.78); // #0284c7 Sporting Saladar Blue
  const darkNavy = rgb(0.06, 0.09, 0.16);     // #101828
  const textMuted = rgb(0.40, 0.45, 0.53);    // Slate 500
  const borderLight = rgb(0.88, 0.90, 0.93);  // Slate 200
  const bgCard = rgb(0.96, 0.98, 1.0);        // Slate 50 / Ice Blue
  const textSuccess = rgb(0.06, 0.60, 0.35);  // Emerald 600
  const textDanger = rgb(0.88, 0.20, 0.20);   // Red 600
  const textWarning = rgb(0.85, 0.50, 0.05);  // Amber 600

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawHeader = (currentPage: PDFPage, pageIndex: number, totalPagesPlaceholder: string) => {
    // Barra superior decorativa
    currentPage.drawRectangle({
      x: margin,
      y: pageHeight - margin - 4,
      width: contentWidth,
      height: 4,
      color: primaryColor,
    });

    // Título institucional
    currentPage.drawText(sanitizePdfText(data.clubName || 'SPORTING SALADAR'), {
      x: margin,
      y: pageHeight - margin - 22,
      size: 14,
      font: boldFont,
      color: darkNavy,
    });

    currentPage.drawText('INFORME CONSOLIDADO DE ASISTENCIA', {
      x: margin,
      y: pageHeight - margin - 35,
      size: 10,
      font: boldFont,
      color: primaryColor,
    });

    // Info derecha: Fecha y temporada
    const dateText = `Fecha: ${sanitizePdfText(data.generatedDate)}`;
    const seasonText = `${sanitizePdfText(data.seasonName)}`;
    currentPage.drawText(seasonText, {
      x: pageWidth - margin - boldFont.widthOfTextAtSize(seasonText, 9),
      y: pageHeight - margin - 22,
      size: 9,
      font: boldFont,
      color: darkNavy,
    });
    currentPage.drawText(dateText, {
      x: pageWidth - margin - font.widthOfTextAtSize(dateText, 8),
      y: pageHeight - margin - 34,
      size: 8,
      font: font,
      color: textMuted,
    });
  };

  const drawFooter = (currentPage: PDFPage, pageNum: number) => {
    const footerText = 'Sporting Saladar - Sistema de Gestion Integral Oficial';
    const pageStr = `Pagina ${pageNum}`;
    currentPage.drawLine({
      start: { x: margin, y: margin + 14 },
      end: { x: pageWidth - margin, y: margin + 14 },
      thickness: 0.5,
      color: borderLight,
    });
    currentPage.drawText(footerText, {
      x: margin,
      y: margin + 4,
      size: 7.5,
      font: font,
      color: textMuted,
    });
    currentPage.drawText(pageStr, {
      x: pageWidth - margin - font.widthOfTextAtSize(pageStr, 7.5),
      y: margin + 4,
      size: 7.5,
      font: font,
      color: textMuted,
    });
  };

  let pageNum = 1;
  drawHeader(page, pageNum, '');
  y = pageHeight - margin - 50;

  // Caja de datos del equipo
  page.drawRectangle({
    x: margin,
    y: y - 38,
    width: contentWidth,
    height: 38,
    color: bgCard,
    borderColor: borderLight,
    borderWidth: 1,
  });

  const teamDisplay = `Equipo: ${sanitizePdfText(data.teamName)} ${data.category ? `(${sanitizePdfText(data.category)})` : ''}`;
  const filterDisplay = `Filtro: ${sanitizePdfText(data.filterApplied)} | Total Sesiones: ${data.totalSessions} (${data.totalTrainings} Entrenamientos, ${data.totalMatches} Partidos)`;

  page.drawText(teamDisplay, {
    x: margin + 12,
    y: y - 17,
    size: 11,
    font: boldFont,
    color: darkNavy,
  });

  page.drawText(filterDisplay, {
    x: margin + 12,
    y: y - 30,
    size: 8.5,
    font: font,
    color: textMuted,
  });

  y -= 48;

  // Tarjetas resumen KPIs (4 tarjetas horizontales)
  const kpiWidth = (contentWidth - 18) / 4;
  const kpiHeight = 38;

  const kpis = [
    { label: '% ASISTENCIA MEDIA', value: `${data.averageAttendancePct}%`, color: primaryColor },
    { label: 'TOTAL JUGADORES', value: `${data.players.length}`, color: darkNavy },
    { label: 'FALTAS JUSTIFICADAS', value: `${data.players.reduce((acc, p) => acc + p.excused, 0)}`, color: textWarning },
    { label: 'FALTAS INJUSTIFICADAS', value: `${data.players.reduce((acc, p) => acc + p.absences, 0)}`, color: textDanger },
  ];

  kpis.forEach((kpi, idx) => {
    const kx = margin + idx * (kpiWidth + 6);
    page.drawRectangle({
      x: kx,
      y: y - kpiHeight,
      width: kpiWidth,
      height: kpiHeight,
      color: rgb(1, 1, 1),
      borderColor: borderLight,
      borderWidth: 1,
    });

    page.drawText(kpi.label, {
      x: kx + 8,
      y: y - 14,
      size: 6.5,
      font: boldFont,
      color: textMuted,
    });

    page.drawText(kpi.value, {
      x: kx + 8,
      y: y - 31,
      size: 14,
      font: boldFont,
      color: kpi.color,
    });
  });

  y -= (kpiHeight + 14);

  // Cabecera de la tabla de jugadores
  const tableHeaders = [
    { label: '#', width: 25, align: 'center' },
    { label: 'JUGADOR', width: 175, align: 'left' },
    { label: 'ENTRENAMIENTOS', width: 85, align: 'center' },
    { label: 'PARTIDOS', width: 70, align: 'center' },
    { label: 'JUSTIF.', width: 50, align: 'center' },
    { label: 'FALTAS', width: 50, align: 'center' },
    { label: '% ASIST.', width: 68, align: 'center' },
  ];

  const drawTableHeader = (targetPage: PDFPage, currentY: number) => {
    targetPage.drawRectangle({
      x: margin,
      y: currentY - 20,
      width: contentWidth,
      height: 20,
      color: darkNavy,
    });

    let curX = margin;
    tableHeaders.forEach((th) => {
      const textX = th.align === 'center'
        ? curX + (th.width / 2) - (boldFont.widthOfTextAtSize(th.label, 7) / 2)
        : curX + 6;

      targetPage.drawText(th.label, {
        x: textX,
        y: currentY - 14,
        size: 7,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
      curX += th.width;
    });
  };

  drawTableHeader(page, y);
  y -= 20;

  const rowHeight = 20;

  data.players.forEach((player, pIdx) => {
    // Si la siguiente fila sobrepasa el margen inferior, crear nueva página
    if (y - rowHeight < margin + 28) {
      drawFooter(page, pageNum);
      pageNum++;
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      drawHeader(page, pageNum, '');
      y = pageHeight - margin - 50;
      drawTableHeader(page, y);
      y -= 20;
    }

    const rowBg = pIdx % 2 === 0 ? rgb(0.99, 0.99, 1.0) : rgb(1, 1, 1);
    page.drawRectangle({
      x: margin,
      y: y - rowHeight,
      width: contentWidth,
      height: rowHeight,
      color: rowBg,
      borderColor: borderLight,
      borderWidth: 0.5,
    });

    let curX = margin;

    // 1. Dorsal
    const dorsalStr = player.dorsal ? `#${player.dorsal}` : '-';
    page.drawText(dorsalStr, {
      x: curX + (25 / 2) - (boldFont.widthOfTextAtSize(dorsalStr, 7.5) / 2),
      y: y - 13.5,
      size: 7.5,
      font: boldFont,
      color: textMuted,
    });
    curX += 25;

    // 2. Nombre del jugador
    const fullName = sanitizePdfText(`${player.lastName}, ${player.firstName}`);
    page.drawText(fullName.length > 30 ? `${fullName.slice(0, 28)}...` : fullName, {
      x: curX + 6,
      y: y - 13.5,
      size: 8,
      font: boldFont,
      color: darkNavy,
    });
    curX += 175;

    // 3. Entrenamientos
    const trStr = `${player.trainingsPresent}/${player.trainingsTotal}`;
    page.drawText(trStr, {
      x: curX + (85 / 2) - (font.widthOfTextAtSize(trStr, 8) / 2),
      y: y - 13.5,
      size: 8,
      font: font,
      color: darkNavy,
    });
    curX += 85;

    // 4. Partidos
    const matchStr = `${player.matchesPresent}/${player.matchesTotal}`;
    page.drawText(matchStr, {
      x: curX + (70 / 2) - (font.widthOfTextAtSize(matchStr, 8) / 2),
      y: y - 13.5,
      size: 8,
      font: font,
      color: darkNavy,
    });
    curX += 70;

    // 5. Justificadas
    const justStr = player.excused > 0 ? `${player.excused}` : '-';
    page.drawText(justStr, {
      x: curX + (50 / 2) - (boldFont.widthOfTextAtSize(justStr, 8) / 2),
      y: y - 13.5,
      size: 8,
      font: boldFont,
      color: player.excused > 0 ? textWarning : textMuted,
    });
    curX += 50;

    // 6. Faltas
    const absStr = player.absences > 0 ? `${player.absences}` : '-';
    page.drawText(absStr, {
      x: curX + (50 / 2) - (boldFont.widthOfTextAtSize(absStr, 8) / 2),
      y: y - 13.5,
      size: 8,
      font: boldFont,
      color: player.absences > 0 ? textDanger : textMuted,
    });
    curX += 50;

    // 7. % Asistencia
    const pctStr = `${player.percentage}%`;
    const pctColor = player.percentage >= 85 ? textSuccess : player.percentage >= 70 ? textWarning : textDanger;
    page.drawText(pctStr, {
      x: curX + (68 / 2) - (boldFont.widthOfTextAtSize(pctStr, 8.5) / 2),
      y: y - 13.5,
      size: 8.5,
      font: boldFont,
      color: pctColor,
    });

    y -= rowHeight;
  });

  drawFooter(page, pageNum);

  const pdfBytes = await pdfDoc.save();
  // Retornar en Base64 para que el cliente lo descargue limpiamente
  let binary = '';
  const len = pdfBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(pdfBytes[i]);
  }
  return btoa(binary);
}

// ─────────────────────────────────────────────────────────────────────────────
// GENERADOR PDF INFORME INDIVIDUAL POR JUGADOR
// ─────────────────────────────────────────────────────────────────────────────

export async function generatePlayerAttendancePdf(data: PlayerAttendancePdfData): Promise<string> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const primaryColor = rgb(0.01, 0.52, 0.78); // Sporting Saladar Blue
  const darkNavy = rgb(0.06, 0.09, 0.16);
  const textMuted = rgb(0.40, 0.45, 0.53);
  const borderLight = rgb(0.88, 0.90, 0.93);
  const bgCard = rgb(0.96, 0.98, 1.0);
  const textSuccess = rgb(0.06, 0.60, 0.35);
  const textDanger = rgb(0.88, 0.20, 0.20);
  const textWarning = rgb(0.85, 0.50, 0.05);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const contentWidth = pageWidth - (margin * 2);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawHeader = (currentPage: PDFPage, pageIndex: number) => {
    currentPage.drawRectangle({
      x: margin,
      y: pageHeight - margin - 4,
      width: contentWidth,
      height: 4,
      color: primaryColor,
    });

    currentPage.drawText(sanitizePdfText(data.clubName || 'SPORTING SALADAR'), {
      x: margin,
      y: pageHeight - margin - 22,
      size: 14,
      font: boldFont,
      color: darkNavy,
    });

    currentPage.drawText('INFORME INDIVIDUAL DE ASISTENCIA Y CONVOCATORIAS', {
      x: margin,
      y: pageHeight - margin - 35,
      size: 10,
      font: boldFont,
      color: primaryColor,
    });

    const dateText = `Fecha: ${sanitizePdfText(data.generatedDate)}`;
    const seasonText = `${sanitizePdfText(data.seasonName)}`;
    currentPage.drawText(seasonText, {
      x: pageWidth - margin - boldFont.widthOfTextAtSize(seasonText, 9),
      y: pageHeight - margin - 22,
      size: 9,
      font: boldFont,
      color: darkNavy,
    });
    currentPage.drawText(dateText, {
      x: pageWidth - margin - font.widthOfTextAtSize(dateText, 8),
      y: pageHeight - margin - 34,
      size: 8,
      font: font,
      color: textMuted,
    });
  };

  const drawFooter = (currentPage: PDFPage, pageNum: number) => {
    const footerText = 'Sporting Saladar - Ficha Oficial de Asistencia del Jugador';
    const pageStr = `Pagina ${pageNum}`;
    currentPage.drawLine({
      start: { x: margin, y: margin + 14 },
      end: { x: pageWidth - margin, y: margin + 14 },
      thickness: 0.5,
      color: borderLight,
    });
    currentPage.drawText(footerText, {
      x: margin,
      y: margin + 4,
      size: 7.5,
      font: font,
      color: textMuted,
    });
    currentPage.drawText(pageStr, {
      x: pageWidth - margin - font.widthOfTextAtSize(pageStr, 7.5),
      y: margin + 4,
      size: 7.5,
      font: font,
      color: textMuted,
    });
  };

  let pageNum = 1;
  drawHeader(page, pageNum);
  y = pageHeight - margin - 50;

  // Ficha de información del jugador
  page.drawRectangle({
    x: margin,
    y: y - 48,
    width: contentWidth,
    height: 48,
    color: bgCard,
    borderColor: borderLight,
    borderWidth: 1,
  });

  const playerTitle = `${sanitizePdfText(data.player.firstName)} ${sanitizePdfText(data.player.lastName)} ${data.player.dorsal ? `(#${data.player.dorsal})` : ''}`;
  const teamSubtitle = `Equipo: ${sanitizePdfText(data.teamName)} ${data.category ? `(${sanitizePdfText(data.category)})` : ''} | Filtro: ${sanitizePdfText(data.filterApplied)}`;

  page.drawText(playerTitle, {
    x: margin + 14,
    y: y - 20,
    size: 13,
    font: boldFont,
    color: darkNavy,
  });

  page.drawText(teamSubtitle, {
    x: margin + 14,
    y: y - 36,
    size: 9,
    font: font,
    color: textMuted,
  });

  y -= 58;

  // Tarjetas KPIs del Jugador (5 tarjetas)
  const kpiWidth = (contentWidth - 20) / 5;
  const kpiHeight = 40;

  const playerKpis = [
    { label: '% ASISTENCIA', value: `${data.summary.percentage}%`, color: data.summary.percentage >= 85 ? textSuccess : primaryColor },
    { label: 'ENTRENAMIENTOS', value: `${data.summary.trainingsAttended}/${data.summary.trainingsTotal}`, color: darkNavy },
    { label: 'PARTIDOS', value: `${data.summary.matchesAttended}/${data.summary.matchesTotal}`, color: darkNavy },
    { label: 'JUSTIFICADAS', value: `${data.summary.excused}`, color: textWarning },
    { label: 'INJUSTIFICADAS', value: `${data.summary.absences}`, color: textDanger },
  ];

  playerKpis.forEach((kpi, idx) => {
    const kx = margin + idx * (kpiWidth + 5);
    page.drawRectangle({
      x: kx,
      y: y - kpiHeight,
      width: kpiWidth,
      height: kpiHeight,
      color: rgb(1, 1, 1),
      borderColor: borderLight,
      borderWidth: 1,
    });

    page.drawText(kpi.label, {
      x: kx + 6,
      y: y - 14,
      size: 6,
      font: boldFont,
      color: textMuted,
    });

    page.drawText(kpi.value, {
      x: kx + 6,
      y: y - 32,
      size: 13,
      font: boldFont,
      color: kpi.color,
    });
  });

  y -= (kpiHeight + 16);

  // Tabla detallada con el historial de sesiones del jugador
  const historyHeaders = [
    { label: 'FECHA', width: 65, align: 'left' },
    { label: 'TIPO', width: 85, align: 'left' },
    { label: 'EVENTO / RIVAL', width: 180, align: 'left' },
    { label: 'ESTADO', width: 85, align: 'center' },
    { label: 'MOTIVO / OBSERVACION', width: 108, align: 'left' },
  ];

  const drawHistoryHeader = (targetPage: PDFPage, currentY: number) => {
    targetPage.drawRectangle({
      x: margin,
      y: currentY - 20,
      width: contentWidth,
      height: 20,
      color: darkNavy,
    });

    let curX = margin;
    historyHeaders.forEach((th) => {
      const textX = th.align === 'center'
        ? curX + (th.width / 2) - (boldFont.widthOfTextAtSize(th.label, 7) / 2)
        : curX + 6;

      targetPage.drawText(th.label, {
        x: textX,
        y: currentY - 14,
        size: 7,
        font: boldFont,
        color: rgb(1, 1, 1),
      });
      curX += th.width;
    });
  };

  drawHistoryHeader(page, y);
  y -= 20;

  const rowHeight = 20;

  if (data.events.length === 0) {
    page.drawRectangle({
      x: margin,
      y: y - 28,
      width: contentWidth,
      height: 28,
      color: rgb(0.99, 0.99, 1.0),
      borderColor: borderLight,
      borderWidth: 0.5,
    });

    const noEventsMsg = 'No hay eventos registrados en este periodo para el jugador.';
    page.drawText(noEventsMsg, {
      x: margin + 14,
      y: y - 18,
      size: 8.5,
      font: italicFont,
      color: textMuted,
    });
    y -= 28;
  } else {
    data.events.forEach((ev, idx) => {
      if (y - rowHeight < margin + 28) {
        drawFooter(page, pageNum);
        pageNum++;
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        drawHeader(page, pageNum);
        y = pageHeight - margin - 50;
        drawHistoryHeader(page, y);
        y -= 20;
      }

      const rowBg = idx % 2 === 0 ? rgb(0.99, 0.99, 1.0) : rgb(1, 1, 1);
      page.drawRectangle({
        x: margin,
        y: y - rowHeight,
        width: contentWidth,
        height: rowHeight,
        color: rowBg,
        borderColor: borderLight,
        borderWidth: 0.5,
      });

      let curX = margin;

      // 1. Fecha (DD/MM/YYYY)
      let dateFormatted = ev.date;
      if (ev.date && ev.date.includes('-')) {
        const parts = ev.date.split('-');
        if (parts.length === 3) dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      page.drawText(dateFormatted, {
        x: curX + 6,
        y: y - 13.5,
        size: 8,
        font: font,
        color: darkNavy,
      });
      curX += 65;

      // 2. Tipo
      page.drawText(sanitizePdfText(ev.eventType), {
        x: curX + 6,
        y: y - 13.5,
        size: 7.5,
        font: boldFont,
        color: ev.eventType === 'Partido' ? primaryColor : darkNavy,
      });
      curX += 85;

      // 3. Título / Rival
      const titleClean = sanitizePdfText(ev.title);
      page.drawText(titleClean.length > 34 ? `${titleClean.slice(0, 32)}...` : titleClean, {
        x: curX + 6,
        y: y - 13.5,
        size: 8,
        font: font,
        color: darkNavy,
      });
      curX += 180;

      // 4. Estado normalizado
      const normStatus = (ev.status || '').toLowerCase();
      let statusLabel = 'Presente';
      let statusColor = textSuccess;

      if (normStatus === 'absent' || normStatus === 'ausente') {
        statusLabel = 'Ausente (Falta)';
        statusColor = textDanger;
      } else if (['excused', 'justificado', 'justificada', 'lesionado'].includes(normStatus)) {
        statusLabel = 'Justificada';
        statusColor = textWarning;
      } else if (normStatus === 'retraso' || normStatus === 'late') {
        statusLabel = 'Retraso';
        statusColor = textWarning;
      } else if (normStatus === 'not_called' || normStatus === 'no_convocado') {
        statusLabel = 'No Convocado';
        statusColor = textMuted;
      } else if (!ev.status) {
        statusLabel = 'Sin registrar';
        statusColor = textMuted;
      }

      page.drawText(statusLabel, {
        x: curX + (85 / 2) - (boldFont.widthOfTextAtSize(statusLabel, 7.5) / 2),
        y: y - 13.5,
        size: 7.5,
        font: boldFont,
        color: statusColor,
      });
      curX += 85;

      // 5. Motivo / Observaciones
      const notesClean = sanitizePdfText(ev.notes || '-');
      page.drawText(notesClean.length > 22 ? `${notesClean.slice(0, 20)}...` : notesClean, {
        x: curX + 6,
        y: y - 13.5,
        size: 7.5,
        font: italicFont,
        color: textMuted,
      });

      y -= rowHeight;
    });
  }

  drawFooter(page, pageNum);

  const pdfBytes = await pdfDoc.save();
  let binary = '';
  const len = pdfBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(pdfBytes[i]);
  }
  return btoa(binary);
}
