import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import PDFParser from 'pdf2json';

export const runtime = 'nodejs';
export const maxDuration = 60;

function normalizeTeamName(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/['"“”]/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeParseDateTime(fechaHoraRaw: string, defaultDateStr?: string): Date | null {
  let targetStr = fechaHoraRaw || defaultDateStr || "";
  if (!targetStr) return null;

  const match = targetStr.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})\s*(?:-\s*|\s+)?(\d{1,2})?:?(\d{2})?/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    let year = parseInt(match[3], 10);
    if (year < 100) year += 2000;
    const hour = match[4] ? parseInt(match[4], 10) : 12;
    const min = match[5] ? parseInt(match[5], 10) : 0;

    if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2020 && year <= 2035) {
      const d = new Date(year, month, day, hour, min);
      if (!isNaN(d.getTime())) return d;
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, club_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.club_id) {
      return NextResponse.json({ error: 'No se pudo obtener el club del usuario.' }, { status: 400 });
    }

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Solo los administradores pueden importar calendarios' }, { status: 403 });
    }
    
    // Obtener la temporada activa del club
    const { data: activeSeason, error: seasonError } = await supabase
      .from('seasons')
      .select('id')
      .eq('club_id', profile.club_id)
      .eq('is_active', true)
      .single();

    if (seasonError || !activeSeason) {
      return NextResponse.json({ error: 'No se encontró una temporada activa para el club. No se pueden importar partidos.' }, { status: 400 });
    }

    // Obtener todos los equipos para mapear IDs
    const { data: allTeams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('club_id', profile.club_id);

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
    const rawPdfText = await new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser(null, true);
      pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError || errData));
      pdfParser.on("pdfParser_dataReady", () => {
        try {
          const rawText = pdfParser.getRawTextContent();
          resolve(decodeURIComponent(rawText));
        } catch (e) {
          resolve(pdfParser.getRawTextContent());
        }
      });
      pdfParser.parseBuffer(buffer);
    });

    const lines = rawPdfText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const partidosAInsertar: any[] = [];
    const restDaysLogged: string[] = [];

    const normPdfTargetName = normalizeTeamName(pdfTeamName);
    const targetTeamObj = allTeams?.find(t => t.id === equipoId);
    const normDbTargetName = targetTeamObj ? normalizeTeamName(targetTeamObj.name) : '';

    let currentJornadaDate = "";

    for (const line of lines) {
      let cleanLine = line.trim();
      if (!cleanLine || cleanLine.includes("Jornada") || cleanLine.includes("Fecha / Hora")) {
        // Detectar si la línea es un encabezado de Jornada (ej. "Jornada 1 (19-10-2025)")
        const jornadaMatch = cleanLine.match(/Jornada\s+\d+\s*\(([^)]+)\)/i);
        if (jornadaMatch) {
          currentJornadaDate = jornadaMatch[1].trim();
        }
        continue;
      }

      // 1. Extraer fecha/hora al final de la línea si existe
      let fechaHoraRaw = "";
      const dateMatch = cleanLine.match(/\d{2}[-/]\d{2}[-/]\d{4}\s*(?:-\s*|\s+)?\d{2}:\d{2}/);
      if (dateMatch) {
        fechaHoraRaw = dateMatch[0];
        cleanLine = cleanLine.substring(0, dateMatch.index).trim();
      }

      // 2. Extraer y remover cualquier información de campo/estadio (Campo..., Polideportivo..., Polidep...) o sufijos (HA)/(HN)
      const campoMatch = cleanLine.match(/\s+(Campo|Polideportivo|Polidep\.)\s+.*$/i);
      if (campoMatch) {
        cleanLine = cleanLine.substring(0, campoMatch.index).trim();
      } else {
        cleanLine = cleanLine.replace(/\s*\((?:HA|HN|H\.A\.|H\.N\.)\)\s*$/i, '').trim();
      }

      // 3. Normalizar espacios entre equipos y limpiar números de orden iniciales (ej. "11. ", "3. ")
      cleanLine = cleanLine.replace(/\t+/g, ' ').replace(/\s+/g, ' ').trim();

      let equipoLocal = "";
      let equipoVisitante = "";
      let golLocal: number | null = null;
      let golVisitante: number | null = null;

      const dashMatch = cleanLine.match(/^(.*?)(?:\s+(\d+))?\s*-\s*(?:(\d+)\s+)?(.*)$/);
      if (dashMatch) {
        equipoLocal = dashMatch[1].replace(/^\d+[\.\s\-]+/, '').trim();
        golLocal = dashMatch[2] ? parseInt(dashMatch[2], 10) : null;
        golVisitante = dashMatch[3] ? parseInt(dashMatch[3], 10) : null;
        equipoVisitante = dashMatch[4].replace(/^\d+[\.\s\-]+/, '').trim();
      }

      if (!equipoLocal || !equipoVisitante || /^\d+$/.test(equipoLocal) || /^\d+$/.test(equipoVisitante)) continue;

      // 4. Filtro de Descansos ("Descansa")
      const isLocalDescansa = equipoLocal.toLowerCase().includes('descansa');
      const isVisitanteDescansa = equipoVisitante.toLowerCase().includes('descansa');

      if (isLocalDescansa || isVisitanteDescansa) {
        const rivalDescanso = isLocalDescansa ? equipoVisitante : equipoLocal;
        restDaysLogged.push(`Jornada de descanso para ${rivalDescanso}`);
        continue;
      }

      // 5. Normalización de Nombres de Equipos y Clasificación Estricta Local vs Visitante
      const normLocal = normalizeTeamName(equipoLocal);
      const normVisit = normalizeTeamName(equipoVisitante);

      function isOurClub(str: string) {
        return str.includes("saladar") || str.includes("sporting");
      }

      const localIsUs = isOurClub(normLocal);
      const visitIsUs = isOurClub(normVisit);

      if (!localIsUs && !visitIsUs) {
        // Ignorar partidos entre otros equipos de la liga donde no juega nuestro club
        continue;
      }

      let lugar: 'Local' | 'Visitante';
      let rivalNombre = "";

      if (localIsUs && !visitIsUs) {
        lugar = 'Local';
        rivalNombre = equipoVisitante;
      } else if (visitIsUs && !localIsUs) {
        lugar = 'Visitante';
        rivalNombre = equipoLocal;
      } else {
        // Si ambos lados contienen "saladar" (ej. "Sporting Saladar A" vs "Sporting Saladar B"), comparar por letra A/B o palabras de pdfTeamName
        const targetKeywords = [...normPdfTargetName.split(' '), ...normDbTargetName.split(' ')].filter(w => w.length >= 1);
        const localMatchCount = targetKeywords.filter(kw => normLocal.includes(kw)).length;
        const visitMatchCount = targetKeywords.filter(kw => normVisit.includes(kw)).length;

        if (localMatchCount >= visitMatchCount) {
          lugar = 'Local';
          rivalNombre = equipoVisitante;
        } else {
          lugar = 'Visitante';
          rivalNombre = equipoLocal;
        }
      }

      const resultadoPropio = lugar === 'Local' ? golLocal : golVisitante;
      const resultadoRival = lugar === 'Local' ? golVisitante : golLocal;

      const fechaHora = safeParseDateTime(fechaHoraRaw, currentJornadaDate);
      if (!fechaHora) {
        console.warn(`[FFCV Parser] No se pudo parsear la fecha para ${equipoLocal} vs ${equipoVisitante}. Omitiendo.`);
        continue;
      }

      const yaPaso = fechaHora < new Date();
      const tieneResultado = resultadoPropio !== null && resultadoRival !== null;
      const estado = (yaPaso || tieneResultado) ? 'Finalizado' : 'Programado';

      partidosAInsertar.push({
        club_id: profile.club_id,
        equipo_id: equipoId,
        rival_nombre: rivalNombre.substring(0, 80),
        lugar: lugar,
        fecha_hora: fechaHora.toISOString(),
        resultado_propio: resultadoPropio,
        resultado_rival: resultadoRival,
        estado: estado,
        season_id: activeSeason.id
      });
    }

    if (partidosAInsertar.length === 0) {
      return NextResponse.json({ 
        error: 'No se detectaron partidos para este equipo en el PDF cargado.', 
        linesTotal: lines.length,
        restDaysLogged
      }, { status: 400 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('partidos')
      .insert(partidosAInsertar)
      .select();

    if (insertError) throw insertError;

    // Generar automáticamente eventos de calendario (team_events) para los partidos
    if (inserted && inserted.length > 0) {
      try {
        const eventsToInsert = inserted.map((m: any) => {
          const dStr = m.fecha_hora.split('T')[0];
          const timeStr = m.fecha_hora.includes('T') ? m.fecha_hora.split('T')[1].substring(0, 8) : '12:00:00';
          return {
            team_id: m.equipo_id,
            season_id: m.season_id || activeSeason.id,
            title: `Partido vs ${m.rival_nombre}`,
            notes: `Jornada FFCV (${m.lugar})`,
            event_type: 'Partido',
            date: dStr,
            start_time: timeStr,
            end_time: '14:00:00',
            location: m.lugar === 'Local' ? 'Polideportivo Municipal' : `Campo de ${m.rival_nombre}`
          };
        });
        await supabase.from('team_events').insert(eventsToInsert);
      } catch (evErr: any) {
        console.warn("[parse-ffcv] Error creando team_events para partidos:", evErr.message);
      }
    }

    return NextResponse.json({ 
      message: `¡Éxito! Se han importado ${partidosAInsertar.length} partidos y generado sus eventos de calendario.`,
      matches: inserted,
      restDaysLogged
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error parseando FFCV:', error);
    return NextResponse.json({ error: error.message || 'Error procesando el PDF de calendario FFCV' }, { status: 500 });
  }
}
