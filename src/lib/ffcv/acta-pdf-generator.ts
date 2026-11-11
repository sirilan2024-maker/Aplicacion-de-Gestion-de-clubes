import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { FFCVRawMatchDetails } from './types';
import { isFfcvRawCardRed } from './discipline-rules';

/**
 * Limpia caracteres fuera de Latin-1 (WinAnsi) para evitar errores de codificación en fuentes estándar PDF.
 */
function safePdfText(input: any): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, '')
    .trim();
}

function isTitularPlayer(p: any): boolean {
  return String(p?.titular) === '1' || p?.titular === 1 || p?.titular === true;
}

/**
 * Genera un documento PDF oficial a partir de los datos del acta electrónica de la FFCV (Novanet).
 * Compatible con el visor PDF integrado (iframe) y con el clasificador de actas del club.
 */
export async function generateFfcvActaPdfBuffer(
  details: FFCVRawMatchDetails,
  codacta?: string
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28; // A4 width
  const pageHeight = 841.89; // A4 height
  const margin = 36;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const ensureSpace = (neededHeight: number) => {
    if (y - neededHeight < margin + 25) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      y = pageHeight - margin;
    }
  };

  const actaId = safePdfText(codacta || details.codacta || '');
  const compName = safePdfText(details.nombre_competicion || 'COMPETICIÓN OFICIAL FFCV');
  const groupName = safePdfText(details.nombre_grupo || '');
  const jornada = safePdfText(details.jornada || '');
  const fecha = safePdfText(details.fecha || '');
  const hora = safePdfText(details.hora || '');
  const campo = safePdfText(details.campo || 'Campo no especificado');
  const localTeam = safePdfText(details.equipo_local || 'Equipo Local');
  const awayTeam = safePdfText(details.equipo_visitante || 'Equipo Visitante');
  const golesLocal = safePdfText(details.goles_local ?? '-');
  const golesVisitante = safePdfText(details.goles_visitante ?? '-');
  const isClosed = String(details.acta_cerrada) === '1';

  // --- CABECERA OFICIAL FFCV ---
  page.drawRectangle({
    x: margin,
    y: y - 56,
    width: pageWidth - margin * 2,
    height: 56,
    color: rgb(0.06, 0.09, 0.16),
  });

  page.drawText('FEDERACIÓN DE FÚTBOL DE LA COMUNIDAD VALENCIANA', {
    x: margin + 14,
    y: y - 20,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText(
    safePdfText(
      `ACTA OFICIAL DEL PARTIDO ${actaId ? `#${actaId}` : ''} - TEMPORADA 2026/2027`
    ),
    {
      x: margin + 14,
      y: y - 35,
      size: 8.5,
      font: fontBold,
      color: rgb(0.58, 0.77, 0.99),
    }
  );

  page.drawText(
    safePdfText(
      `${compName}${groupName ? ` - ${groupName}` : ''}${jornada ? ` (Jornada ${jornada})` : ''}`
    ),
    {
      x: margin + 14,
      y: y - 48,
      size: 8,
      font: fontRegular,
      color: rgb(0.82, 0.86, 0.92),
    }
  );

  const badgeText = isClosed ? 'ACTA CERRADA' : 'ACTA ABIERTA';
  page.drawText(badgeText, {
    x: pageWidth - margin - 88,
    y: y - 24,
    size: 8,
    font: fontBold,
    color: isClosed ? rgb(0.3, 0.9, 0.55) : rgb(0.98, 0.75, 0.2),
  });

  y -= 66;

  // --- MARCADOR Y DATOS DEL ENCUENTRO ---
  page.drawRectangle({
    x: margin,
    y: y - 54,
    width: pageWidth - margin * 2,
    height: 54,
    color: rgb(0.96, 0.97, 0.99),
    borderColor: rgb(0.85, 0.88, 0.92),
    borderWidth: 1,
  });

  const scoreLine = `${localTeam}   ${golesLocal}  -  ${golesVisitante}   ${awayTeam}`;
  page.drawText(safePdfText(scoreLine).slice(0, 85), {
    x: margin + 14,
    y: y - 22,
    size: 11.5,
    font: fontBold,
    color: rgb(0.08, 0.1, 0.15),
  });

  const metaLine = `Fecha: ${fecha || '-'}   |   Hora: ${hora || '-'}   |   Instalación: ${campo}`;
  page.drawText(safePdfText(metaLine).slice(0, 105), {
    x: margin + 14,
    y: y - 41,
    size: 8,
    font: fontRegular,
    color: rgb(0.35, 0.4, 0.48),
  });

  y -= 68;

  // --- ALINEACIONES (2 COLUMNAS: LOCAL Y VISITANTE) ---
  const colWidth = (pageWidth - margin * 2 - 16) / 2;
  const leftX = margin;
  const rightX = margin + colWidth + 16;

  const localTitulares = (details.jugadores_equipo_local || []).filter(isTitularPlayer);
  const localSuplentes = (details.jugadores_equipo_local || []).filter((p: any) => !isTitularPlayer(p));
  const awayTitulares = (details.jugadores_equipo_visitante || []).filter(isTitularPlayer);
  const awaySuplentes = (details.jugadores_equipo_visitante || []).filter((p: any) => !isTitularPlayer(p));

  // Encabezado de columnas de equipos
  page.drawRectangle({
    x: leftX,
    y: y - 18,
    width: colWidth,
    height: 18,
    color: rgb(0.12, 0.25, 0.68),
  });
  page.drawText(safePdfText(`LOCAL: ${localTeam}`).slice(0, 48), {
    x: leftX + 8,
    y: y - 13,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawRectangle({
    x: rightX,
    y: y - 18,
    width: colWidth,
    height: 18,
    color: rgb(0.15, 0.2, 0.3),
  });
  page.drawText(safePdfText(`VISITANTE: ${awayTeam}`).slice(0, 48), {
    x: rightX + 8,
    y: y - 13,
    size: 8.5,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  y -= 28;

  // Titulares
  page.drawText('Jugadores/as Titulares', {
    x: leftX,
    y,
    size: 8.5,
    font: fontBold,
    color: rgb(0.12, 0.25, 0.68),
  });
  page.drawText('Jugadores/as Titulares', {
    x: rightX,
    y,
    size: 8.5,
    font: fontBold,
    color: rgb(0.15, 0.2, 0.3),
  });

  y -= 13;

  const maxTitulares = Math.max(localTitulares.length, awayTitulares.length, 1);
  for (let i = 0; i < maxTitulares; i++) {
    ensureSpace(14);
    const lp = localTitulares[i];
    const ap = awayTitulares[i];

    if (lp) {
      const dorsal = lp.dorsal ? `${lp.dorsal}. ` : '';
      const name = safePdfText(lp.nombre_jugador || lp.nombre || lp.jugador || '');
      const cap = String(lp.capitan) === '1' ? ' (C)' : '';
      const port = String(lp.portero) === '1' ? ' (P)' : '';
      page.drawText(`${dorsal}${name}${cap}${port}`.slice(0, 52), {
        x: leftX + 4,
        y,
        size: 7.8,
        font: fontRegular,
        color: rgb(0.12, 0.15, 0.2),
      });
    }

    if (ap) {
      const dorsal = ap.dorsal ? `${ap.dorsal}. ` : '';
      const name = safePdfText(ap.nombre_jugador || ap.nombre || ap.jugador || '');
      const cap = String(ap.capitan) === '1' ? ' (C)' : '';
      const port = String(ap.portero) === '1' ? ' (P)' : '';
      page.drawText(`${dorsal}${name}${cap}${port}`.slice(0, 52), {
        x: rightX + 4,
        y,
        size: 7.8,
        font: fontRegular,
        color: rgb(0.12, 0.15, 0.2),
      });
    }

    y -= 11.5;
  }

  y -= 6;

  // Suplentes
  ensureSpace(24);
  page.drawText('Jugadores/as Suplentes', {
    x: leftX,
    y,
    size: 8.5,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.45),
  });
  page.drawText('Jugadores/as Suplentes', {
    x: rightX,
    y,
    size: 8.5,
    font: fontBold,
    color: rgb(0.3, 0.35, 0.45),
  });

  y -= 13;

  const maxSuplentes = Math.max(localSuplentes.length, awaySuplentes.length, 1);
  for (let i = 0; i < maxSuplentes; i++) {
    ensureSpace(14);
    const lp = localSuplentes[i];
    const ap = awaySuplentes[i];

    if (lp) {
      const dorsal = lp.dorsal ? `${lp.dorsal}. ` : '';
      const name = safePdfText(lp.nombre_jugador || lp.nombre || lp.jugador || '');
      page.drawText(`${dorsal}${name}`.slice(0, 52), {
        x: leftX + 4,
        y,
        size: 7.8,
        font: fontRegular,
        color: rgb(0.25, 0.3, 0.38),
      });
    } else if (i === 0 && localSuplentes.length === 0) {
      page.drawText('Sin suplentes', {
        x: leftX + 4,
        y,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.55, 0.6, 0.65),
      });
    }

    if (ap) {
      const dorsal = ap.dorsal ? `${ap.dorsal}. ` : '';
      const name = safePdfText(ap.nombre_jugador || ap.nombre || ap.jugador || '');
      page.drawText(`${dorsal}${name}`.slice(0, 52), {
        x: rightX + 4,
        y,
        size: 7.8,
        font: fontRegular,
        color: rgb(0.25, 0.3, 0.38),
      });
    } else if (i === 0 && awaySuplentes.length === 0) {
      page.drawText('Sin suplentes', {
        x: rightX + 4,
        y,
        size: 7.5,
        font: fontRegular,
        color: rgb(0.55, 0.6, 0.65),
      });
    }

    y -= 11.5;
  }

  y -= 10;

  // --- GOLES ---
  const localGoals = details.goles_equipo_local || [];
  const awayGoals = details.goles_equipo_visitante || [];
  ensureSpace(35);

  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: pageWidth - margin * 2,
    height: 16,
    color: rgb(0.92, 0.96, 0.94),
  });
  page.drawText('GOLES', {
    x: margin + 8,
    y: y - 11.5,
    size: 8.5,
    font: fontBold,
    color: rgb(0.05, 0.42, 0.24),
  });

  y -= 28;

  const maxGoals = Math.max(localGoals.length, awayGoals.length, 1);
  for (let i = 0; i < maxGoals; i++) {
    ensureSpace(14);
    const lg = localGoals[i];
    const ag = awayGoals[i];

    if (lg) {
      const min = safePdfText(lg.minuto || '1');
      const name = safePdfText(lg.nombre_jugador || lg.jugador || lg.nombre || 'Jugador');
      const isPP = String(lg.tipo_gol) === '102' ? ' (PP)' : String(lg.tipo_gol) === '101' ? ' (Pen.)' : '';
      page.drawText(`(${min}') ${name}${isPP}`.slice(0, 52), {
        x: leftX + 4,
        y,
        size: 7.8,
        font: fontRegular,
        color: rgb(0.1, 0.35, 0.2),
      });
    } else if (i === 0 && localGoals.length === 0) {
      page.drawText('Sin goles', { x: leftX + 4, y, size: 7.5, font: fontRegular, color: rgb(0.55, 0.6, 0.65) });
    }

    if (ag) {
      const min = safePdfText(ag.minuto || '1');
      const name = safePdfText(ag.nombre_jugador || ag.jugador || ag.nombre || 'Jugador');
      const isPP = String(ag.tipo_gol) === '102' ? ' (PP)' : String(ag.tipo_gol) === '101' ? ' (Pen.)' : '';
      page.drawText(`(${min}') ${name}${isPP}`.slice(0, 52), {
        x: rightX + 4,
        y,
        size: 7.8,
        font: fontRegular,
        color: rgb(0.1, 0.35, 0.2),
      });
    } else if (i === 0 && awayGoals.length === 0) {
      page.drawText('Sin goles', { x: rightX + 4, y, size: 7.5, font: fontRegular, color: rgb(0.55, 0.6, 0.65) });
    }

    y -= 11.5;
  }

  y -= 10;

  // --- TARJETAS Y AMONESTACIONES ---
  const localCards = details.tarjetas_equipo_local || [];
  const awayCards = details.tarjetas_equipo_visitante || [];
  ensureSpace(35);

  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: pageWidth - margin * 2,
    height: 16,
    color: rgb(0.99, 0.95, 0.88),
  });
  page.drawText('TARJETAS Y AMONESTACIONES', {
    x: margin + 8,
    y: y - 11.5,
    size: 8.5,
    font: fontBold,
    color: rgb(0.65, 0.35, 0.05),
  });

  y -= 28;

  const formatCardLine = (c: any): { text: string; isRed: boolean } => {
    const min = safePdfText(c.minuto || '1');
    const name = safePdfText(c.nombre_jugador || c.jugador || c.nombre || 'Amonestado');
    const isSecondYellow = String(c.segunda_amarilla) === '1';
    const isRed = isFfcvRawCardRed(c);
    const label = isSecondYellow ? 'Doble Amarilla' : isRed ? 'Roja' : 'Amarilla';
    return {
      text: `(${min}') ${name} ${label}`,
      isRed,
    };
  };

  const maxCards = Math.max(localCards.length, awayCards.length, 1);
  for (let i = 0; i < maxCards; i++) {
    ensureSpace(14);
    const lc = localCards[i];
    const ac = awayCards[i];

    if (lc) {
      const formatted = formatCardLine(lc);
      page.drawText(formatted.text.slice(0, 54), {
        x: leftX + 4,
        y,
        size: 7.8,
        font: formatted.isRed ? fontBold : fontRegular,
        color: formatted.isRed ? rgb(0.75, 0.1, 0.1) : rgb(0.45, 0.3, 0.05),
      });
    } else if (i === 0 && localCards.length === 0) {
      page.drawText('Sin tarjetas', { x: leftX + 4, y, size: 7.5, font: fontRegular, color: rgb(0.55, 0.6, 0.65) });
    }

    if (ac) {
      const formatted = formatCardLine(ac);
      page.drawText(formatted.text.slice(0, 54), {
        x: rightX + 4,
        y,
        size: 7.8,
        font: formatted.isRed ? fontBold : fontRegular,
        color: formatted.isRed ? rgb(0.75, 0.1, 0.1) : rgb(0.45, 0.3, 0.05),
      });
    } else if (i === 0 && awayCards.length === 0) {
      page.drawText('Sin tarjetas', { x: rightX + 4, y, size: 7.5, font: fontRegular, color: rgb(0.55, 0.6, 0.65) });
    }

    y -= 11.5;
  }

  y -= 10;

  // --- SUSTITUCIONES EFECTUADAS ---
  const localSubs = details.sustituciones_equipo_local || [];
  const awaySubs = details.sustituciones_equipo_visitante || [];
  ensureSpace(35);

  page.drawRectangle({
    x: margin,
    y: y - 16,
    width: pageWidth - margin * 2,
    height: 16,
    color: rgb(0.93, 0.95, 0.99),
  });
  page.drawText('SUSTITUCIONES EFECTUADAS', {
    x: margin + 8,
    y: y - 11.5,
    size: 8.5,
    font: fontBold,
    color: rgb(0.15, 0.3, 0.65),
  });

  y -= 28;

  const maxSubs = Math.max(localSubs.length, awaySubs.length, 1);
  for (let i = 0; i < maxSubs; i++) {
    ensureSpace(14);
    const ls = localSubs[i];
    const as = awaySubs[i];

    if (ls) {
      const min = safePdfText(ls.minuto || '45');
      const entra = safePdfText(ls.jugador_entra || ls.nombre_entra || 'Entra');
      const sale = safePdfText(ls.jugador_sale || ls.nombre_sale || 'Sale');
      page.drawText(`(${min}') Entra: ${entra} / Sale: ${sale}`.slice(0, 54), {
        x: leftX + 4,
        y,
        size: 7.2,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.35),
      });
    } else if (i === 0 && localSubs.length === 0) {
      page.drawText('Sin sustituciones registradas', { x: leftX + 4, y, size: 7.5, font: fontRegular, color: rgb(0.55, 0.6, 0.65) });
    }

    if (as) {
      const min = safePdfText(as.minuto || '45');
      const entra = safePdfText(as.jugador_entra || as.nombre_entra || 'Entra');
      const sale = safePdfText(as.jugador_sale || as.nombre_sale || 'Sale');
      page.drawText(`(${min}') Entra: ${entra} / Sale: ${sale}`.slice(0, 54), {
        x: rightX + 4,
        y,
        size: 7.2,
        font: fontRegular,
        color: rgb(0.2, 0.25, 0.35),
      });
    } else if (i === 0 && awaySubs.length === 0) {
      page.drawText('Sin sustituciones registradas', { x: rightX + 4, y, size: 7.5, font: fontRegular, color: rgb(0.55, 0.6, 0.65) });
    }

    y -= 11.5;
  }

  y -= 10;

  // --- EQUIPO ARBITRAL ---
  const arbitros = details.arbitros_partido || [];
  if (arbitros.length > 0) {
    ensureSpace(35);
    page.drawRectangle({
      x: margin,
      y: y - 16,
      width: pageWidth - margin * 2,
      height: 16,
      color: rgb(0.95, 0.95, 0.96),
    });
    page.drawText('EQUIPO ARBITRAL DESIGNADO', {
      x: margin + 8,
      y: y - 11.5,
      size: 8.5,
      font: fontBold,
      color: rgb(0.25, 0.28, 0.35),
    });

    y -= 26;
    for (const arb of arbitros) {
      ensureSpace(13);
      const name = safePdfText(arb.nombre_arbitro || arb.arbitro || arb.nombre || 'Árbitro');
      const role = safePdfText(arb.tipo_arbitro || 'Árbitro Principal');
      page.drawText(`${role}: ${name}`, {
        x: margin + 6,
        y,
        size: 7.8,
        font: fontRegular,
        color: rgb(0.2, 0.22, 0.28),
      });
      y -= 11.5;
    }
  }

  // Pie de página oficial
  page.drawText(
    safePdfText(
      `FIRMA DE LOS DELEGADOS Y ÁRBITRO - Documento PDF generado desde Acta Electrónica Oficial FFCV ${actaId ? `(CodPartido: ${actaId})` : ''}`
    ),
    {
      x: margin,
      y: 18,
      size: 7,
      font: fontRegular,
      color: rgb(0.45, 0.5, 0.58),
    }
  );

  return await pdfDoc.save();
}
