import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import PDFParser from 'pdf2json';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, club_id')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo los administradores pueden importar calendarios' }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const equipoId = formData.get('equipo_id') as string;
    const pdfTeamName = formData.get('pdf_team_name') as string;

    if (!file || !equipoId || !pdfTeamName) {
      return NextResponse.json({ error: 'Archivo PDF, equipo destino y nombre en PDF son requeridos' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extraer texto del PDF con pdf2json
    const text = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser(null, true);
      pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError || errData));
      pdfParser.on("pdfParser_dataReady", () => {
        try {
          // pdf2json a menudo devuelve el texto con URL-encoding
          const rawText = pdfParser.getRawTextContent();
          resolve(decodeURIComponent(rawText));
        } catch (e) {
          resolve(pdfParser.getRawTextContent());
        }
      });
      pdfParser.parseBuffer(buffer);
    });

    // --- LÓGICA DE PARSEO SIMPLIFICADA FFCV ---
    // Un PDF real de FFCV tiene jornadas, equipos locales y visitantes, fechas.
    // Como la estructura exacta varía, extraemos el texto y buscamos patrones comunes.
    // Esto es un esqueleto básico que busca líneas con " vs " o " - " como separador de equipos.
    
    const normalizedText = text.replace(/[\r\n]+/g, ' ');
    
    // El texto de la FFCV viene todo seguido. Siempre terminan en "Fecha - Hora".
    // Vamos a extraer bloques (chunks) que terminan con una fecha/hora.
    const regex = /(.*?)\s*(\d{2}-\d{2}-\d{4}\s+-\s+\d{2}:\d{2})/g;
    let match;
    const partidosAInsertar = [];
    
    // En vez de usar el nombre de la DB, usamos el nombre exacto que el usuario introdujo
    const baseTeamName = pdfTeamName.toLowerCase().replace(/['"]/g, '').trim();

    let parsedTeamsDebug = [];

    while ((match = regex.exec(normalizedText)) !== null) {
      let chunk = match[1].trim();
      const fechaRaw = match[2];

      // El lugar (campo) está separado de los equipos por al menos 3 espacios
      const parts = chunk.split(/\s{3,}/);
      if (parts.length >= 2) {
        const lugarRaw = parts[parts.length - 1];
        let equiposYScores = parts.slice(0, parts.length - 1).join(' ');

        // Eliminar cabeceras basura de la FFCV
        equiposYScores = equiposYScores.replace(/.*(?:Fecha \/ Hora|Jornada \d+ \([^)]+\))\s*/i, '');

        // Extraer equipos y goles (si los hay)
        const teamsMatch = equiposYScores.match(/(.*?)(?:\s+(\d+))?\s*-\s*(?:(\d+)\s+)?(.*)/);
        
        if (teamsMatch) {
          const localRaw = teamsMatch[1].trim();
          const golLocal = teamsMatch[2] ? parseInt(teamsMatch[2], 10) : null;
          const golVisitante = teamsMatch[3] ? parseInt(teamsMatch[3], 10) : null;
          const visitanteRaw = teamsMatch[4].trim();
          
          const localClean = localRaw.toLowerCase().replace(/['"]/g, '');
          const visitanteClean = visitanteRaw.toLowerCase().replace(/['"]/g, '');
          
          parsedTeamsDebug.push(`L:${localClean} | V:${visitanteClean} (Res: ${golLocal}-${golVisitante})`);

          let rivalNombre = '';
          let lugar = '';
          let resultadoPropio = null;
          let resultadoRival = null;

          if (localClean.includes(baseTeamName)) {
            rivalNombre = visitanteRaw;
            lugar = 'Local';
            resultadoPropio = golLocal;
            resultadoRival = golVisitante;
          } else if (visitanteClean.includes(baseTeamName)) {
            rivalNombre = localRaw;
            lugar = 'Visitante';
            resultadoPropio = golVisitante;
            resultadoRival = golLocal;
          }

          if (rivalNombre) {
            // Parsear "25-10-2025 - 12:00"
            const [datePart, timePart] = fechaRaw.split(' - ');
            const [day, month, year] = datePart.split('-');
            const [hour, min] = timePart.split(':');
            const fechaHora = new Date(parseInt(year), parseInt(month)-1, parseInt(day), parseInt(hour), parseInt(min));
            
            // Determinar estado: si la fecha ya pasó o hay goles, es "Finalizado"
            const yaPaso = fechaHora < new Date();
            const tieneResultado = resultadoPropio !== null && resultadoRival !== null;
            const estado = (yaPaso || tieneResultado) ? 'Finalizado' : 'Programado';

            partidosAInsertar.push({
              club_id: profile.club_id,
              equipo_id: equipoId,
              rival_nombre: rivalNombre.substring(0, 50),
              fecha_hora: fechaHora.toISOString(),
              lugar: lugar,
              resultado_propio: resultadoPropio,
              resultado_rival: resultadoRival,
              estado: estado
            });
          }
        }
      }
    }

    if (partidosAInsertar.length === 0) {
      console.log("TEXTO EXTRAÍDO:", text.substring(0, 2000));
      return NextResponse.json({ 
        error: 'No se detectaron partidos para este equipo en el PDF.', 
        textLength: text.length,
        preview: text.substring(0, 1000),
        debugInfo: `Buscado: "${baseTeamName}". Encontrados: ${parsedTeamsDebug.join(', ')}`
      }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('partidos')
      .insert(partidosAInsertar)
      .select();

    if (insertError) throw insertError;

    return NextResponse.json({ 
      message: `¡Éxito! Se han importado ${partidosAInsertar.length} partidos.`,
      matches: inserted
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error parseando FFCV:', error);
    return NextResponse.json({ error: error.message || 'Error procesando el PDF' }, { status: 500 });
  }
}
