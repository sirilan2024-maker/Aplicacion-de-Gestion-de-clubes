import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch FFCV page: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const standings: any[] = [];
    
    // First attempt: Specific FFCV structure provided by the user
    const specificRows = $('span#CL_Resumen table.table-striped tbody tr, span#CL_Resumen table.table-striped tr');
    
    if (specificRows.length > 0) {
      specificRows.each((index, element) => {
        const columnas = $(element).find('td');
        
        // Saltamos las cabeceras o filas vacías
        if (columnas.length >= 10) {
          const posicion = $(columnas[1]).text().trim();
          const nombreEquipo = $(columnas[2]).find('span').text().trim() || $(columnas[2]).text().trim();
          const puntos = $(columnas[3]).text().trim();
          const jugados = $(columnas[4]).text().trim();
          const ganados = $(columnas[5]).text().trim();
          const empatados = $(columnas[6]).text().trim();
          const perdidos = $(columnas[7]).text().trim();
          const golesFavor = $(columnas[8]).text().trim();
          const golesContra = $(columnas[9]).text().trim();

          // Extraer logo si existe
          let logoSrc = null;
          const img = $(columnas[2]).find('img');
          if (img.length > 0) {
            logoSrc = img.attr('src');
            if (logoSrc && logoSrc.startsWith('/')) {
                const urlObj = new URL(url);
                logoSrc = urlObj.origin + logoSrc;
            }
          }

          const nombreLimpio = nombreEquipo.replace(/\s+/g, ' ').trim();

          if (posicion && nombreLimpio && !isNaN(parseInt(posicion))) {
            standings.push({
              position: parseInt(posicion, 10),
              team: nombreLimpio,
              logo: logoSrc,
              points: parseInt(puntos, 10),
              played: parseInt(jugados, 10),
              won: parseInt(ganados, 10),
              drawn: parseInt(empatados, 10),
              lost: parseInt(perdidos, 10),
              gf: parseInt(golesFavor, 10),
              gc: parseInt(golesContra, 10),
            });
          }
        }
      });
      
      if (standings.length > 0) {
        return NextResponse.json({ data: standings, rawHeaders: ['Pos', 'Equipo', 'Ptos', 'J', 'G', 'E', 'P', 'GF', 'GC'] });
      }
    }

    // Fallback attempt: Generic table search
    let targetTable = null;

    $('table').each((i, table) => {
      const headerText = $(table).text().toLowerCase();
      if (headerText.includes('ptos') || headerText.includes('puntos') || headerText.includes('equipo')) {
        targetTable = table;
        return false;
      }
    });

    if (!targetTable) {
      return NextResponse.json({ error: 'No se encontró la tabla de clasificación en esta URL.' }, { status: 404 });
    }

    const genericStandings: any[] = [];
    const headers: string[] = [];

    // Extract headers
    const firstRow = $(targetTable).find('tr').first();
    firstRow.find('th, td').each((i, cell) => {
      headers.push($(cell).text().trim().toLowerCase());
    });

    // Extract rows
    $(targetTable).find('tr').each((i, tr) => {
      if (i === 0) return; // Skip header row
      
      const rowData: any = {};
      const cells = $(tr).find('td');
      
      cells.each((j, td) => {
         const rawVal = $(td).text().trim();
         rowData[`col_${j}`] = rawVal;
         
         const headerName = headers[j] || '';
         if (headerName === 'pos' || headerName.includes('posi') || j === 0) {
            rowData.position = rawVal;
         } else if (headerName.includes('equipo') || j === 1 || j === 2) {
            if (!rowData.team || rawVal.length > rowData.team.length) {
              rowData.team = rawVal;
            }
         } else if (headerName.includes('pto') || headerName.includes('pts') || headerName === 'pt') {
            rowData.points = rawVal;
         } else if (headerName === 'j' || headerName === 'pj') {
            rowData.played = rawVal;
         } else if (headerName === 'g' || headerName === 'pg') {
            rowData.won = rawVal;
         } else if (headerName === 'e' || headerName === 'pe') {
            rowData.drawn = rawVal;
         } else if (headerName === 'p' || headerName === 'pp') {
            rowData.lost = rawVal;
         } else if (headerName === 'gf') {
            rowData.gf = rawVal;
         } else if (headerName === 'gc') {
            rowData.gc = rawVal;
         }
      });

      const img = $(tr).find('td img').first();
      if (img.length > 0) {
        let src = img.attr('src');
        if (src && src.startsWith('/')) {
            const urlObj = new URL(url);
            src = urlObj.origin + src;
        }
        rowData.logo = src;
      }

      if (rowData.team && rowData.team !== '') {
        genericStandings.push(rowData);
      }
    });

    return NextResponse.json({ data: genericStandings, rawHeaders: headers });

  } catch (err: any) {
    console.error('Error in ffcv-scraper:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
