import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedContext } from '@/lib/auth-helpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeStr(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchFfcvJson(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/javascript, */*; q=0.01'
      },
      cache: 'no-store'
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('[ffcv-player-info] Error fetching:', url, err);
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');

    if (!playerId) {
      return NextResponse.json({ error: 'Falta el parámetro playerId' }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: player, error: pErr } = await supabase
      .from('players')
      .select('id, first_name, last_name, dorsal, club_id, team_id, teams(id, name, ffcv_team_id, ffcv_competition_id, ffcv_group_id)')
      .eq('id', playerId)
      .single();

    if (pErr || !player) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });
    }

    if (player.club_id !== context.profile.club_id && context.profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado para ver este jugador' }, { status: 403 });
    }

    const teamRel = player.teams as any;
    let ffcvTeamId = teamRel?.ffcv_team_id;

    if (!ffcvTeamId) {
      const { data: hist } = await supabase
        .from('player_season_history')
        .select('teams(ffcv_team_id)')
        .eq('player_id', playerId)
        .not('teams.ffcv_team_id', 'is', null)
        .limit(1)
        .maybeSingle();

      if (hist && (hist as any).teams?.ffcv_team_id) {
        ffcvTeamId = (hist as any).teams.ffcv_team_id;
      }
    }

    if (!ffcvTeamId) {
      return NextResponse.json({ 
        error: 'El equipo de este jugador aún no tiene configurado su código federativo FFCV.',
        found: false 
      }, { status: 404 });
    }

    const plantillaUrl = 'https://ffcv.es/competiciones/api/equipos/plantilla_home.php?cod_equipo=' + ffcvTeamId;
    const plantillaData = await fetchFfcvJson(plantillaUrl);

    if (!plantillaData || !Array.isArray(plantillaData.jugadores_equipo)) {
      return NextResponse.json({ 
        error: 'No se pudo conectar con el servidor de la federación FFCV.',
        found: false 
      }, { status: 502 });
    }

    const normFirstName = normalizeStr(player.first_name);
    const normLastName = normalizeStr(player.last_name);
    const dorsalStr = player.dorsal ? String(player.dorsal) : '';

    let matchedFfcvPlayer = null;

    for (const j of plantillaData.jugadores_equipo) {
      const ffcvNormName = normalizeStr(j.nombre);
      const parts = normFirstName.split(' ').concat(normLastName.split(' ')).filter(Boolean);
      const matchCount = parts.filter(p => ffcvNormName.includes(p)).length;

      if (matchCount >= 2 || (parts.length === 1 && matchCount === 1)) {
        if (dorsalStr && j.dorsal === dorsalStr) {
          matchedFfcvPlayer = j;
          break;
        }
        if (!matchedFfcvPlayer) {
          matchedFfcvPlayer = j;
        }
      }
    }

    if (!matchedFfcvPlayer && dorsalStr) {
      for (const j of plantillaData.jugadores_equipo) {
        if (j.dorsal === dorsalStr) {
          const ffcvNorm = normalizeStr(j.nombre);
          const hasOneWord = normLastName.split(' ').some(w => w.length > 3 && ffcvNorm.includes(w));
          if (hasOneWord) {
            matchedFfcvPlayer = j;
            break;
          }
        }
      }
    }

    if (!matchedFfcvPlayer || !matchedFfcvPlayer.codjugador) {
      return NextResponse.json({
        found: false,
        message: 'El jugador no figura en la plantilla oficial publicada en la FFCV para este equipo (puede estar en trámite de validación).'
      });
    }

    const codJugador = matchedFfcvPlayer.codjugador;

    const playerApiUrl = 'https://ffcv.es/competiciones/api/jugadores/jugador_api.php?codigo=' + codJugador + '&cod_temporada=auto';
    const fullPlayerData = await fetchFfcvJson(playerApiUrl);

    if (!fullPlayerData) {
      return NextResponse.json({
        found: true,
        basicInfo: matchedFfcvPlayer,
        message: 'Se localizó la ficha pero no se pudieron cargar las estadísticas extendidas.'
      });
    }

    const listadoTemporadas = Array.isArray(fullPlayerData.listado_temporadas) ? fullPlayerData.listado_temporadas : [];
    const historialTemporadas = [];
    const temporadasToFetch = listadoTemporadas.slice(0, 7);

    const historyPromises = temporadasToFetch.map(async (temp) => {
      if (temp.codigo_temporada === fullPlayerData.codigo_temporada) {
        // En temporada actual, buscar competición de liga preferentemente
        const compList = fullPlayerData.competiciones_participa || [];
        const comp = compList.find((c: any) => !c.nombre_competicion?.toLowerCase().includes('copa')) || compList[0];

        const pj = fullPlayerData.partidos && fullPlayerData.partidos.find(x => x.nombre === 'Jugados')?.valor || '0';
        const goles = fullPlayerData.partidos && fullPlayerData.partidos.find(x => x.nombre === 'Total Goles')?.valor || '0';
        const tit = fullPlayerData.partidos && fullPlayerData.partidos.find(x => x.nombre === 'Titular')?.valor || '0';
        const sup = fullPlayerData.partidos && fullPlayerData.partidos.find(x => x.nombre === 'Suplente')?.valor || '0';

        const clubName = comp?.nombre_club || comp?.nombre_equipo || fullPlayerData.equipo || 'Sporting Saladar';
        const equipoName = comp?.nombre_equipo || fullPlayerData.equipo || clubName;

        return {
          temporada: temp.nombre_temporada,
          codigo_temporada: temp.codigo_temporada,
          club: clubName.trim(),
          equipo: equipoName.trim(),
          competicion: comp && comp.nombre_competicion ? comp.nombre_competicion.trim() : (fullPlayerData.categoria_equipo || 'Competición FFCV'),
          grupo: comp && comp.nombre_grupo ? comp.nombre_grupo.trim() : '',
          partidos_jugados: parseInt(pj, 10) || 0,
          titular: parseInt(tit, 10) || 0,
          suplente: parseInt(sup, 10) || 0,
          goles: parseInt(goles, 10) || 0,
          minutos: parseInt(fullPlayerData.minutos_totales_jugados, 10) || 0,
          posicion_equipo: comp && comp.posicion_equipo ? comp.posicion_equipo : '',
          puntos_equipo: comp && comp.puntos_equipo ? comp.puntos_equipo : ''
        };
      }

      const pastUrl = 'https://ffcv.es/competiciones/api/jugadores/jugador_api.php?codigo=' + codJugador + '&cod_temporada=' + temp.codigo_temporada;
      const pastData = await fetchFfcvJson(pastUrl);
      if (!pastData) return null;

      // Si tiene varias competiciones (ej. liga + copa), preferir la liga regular sobre copas
      const compList = pastData.competiciones_participa || [];
      const comp = compList.find((c: any) => !c.nombre_competicion?.toLowerCase().includes('copa')) || compList[0];

      const pj = pastData.partidos && pastData.partidos.find(x => x.nombre === 'Jugados')?.valor || '0';
      const goles = pastData.partidos && pastData.partidos.find(x => x.nombre === 'Total Goles')?.valor || '0';
      const tit = pastData.partidos && pastData.partidos.find(x => x.nombre === 'Titular')?.valor || '0';
      const sup = pastData.partidos && pastData.partidos.find(x => x.nombre === 'Suplente')?.valor || '0';

      const clubName = comp?.nombre_club 
        || comp?.nombre_equipo 
        || pastData.equipo 
        || fullPlayerData.equipo 
        || 'Sporting Saladar';

      const equipoName = comp?.nombre_equipo 
        || pastData.equipo 
        || clubName;

      return {
        temporada: temp.nombre_temporada,
        codigo_temporada: temp.codigo_temporada,
        club: clubName.trim(),
        equipo: equipoName.trim(),
        competicion: comp && comp.nombre_competicion ? comp.nombre_competicion.trim() : (pastData.categoria_equipo || 'Competición FFCV'),
        grupo: comp && comp.nombre_grupo ? comp.nombre_grupo.trim() : '',
        partidos_jugados: parseInt(pj, 10) || 0,
        titular: parseInt(tit, 10) || 0,
        suplente: parseInt(sup, 10) || 0,
        goles: parseInt(goles, 10) || 0,
        minutos: parseInt(pastData.minutos_totales_jugados, 10) || 0,
        posicion_equipo: comp && comp.posicion_equipo ? comp.posicion_equipo : '',
        puntos_equipo: comp && comp.puntos_equipo ? comp.puntos_equipo : ''
      };
    });

    const settledHistory = await Promise.all(historyPromises);
    settledHistory.forEach(h => {
      if (h) historialTemporadas.push(h);
    });

    // Formatear foto correctamente (detectar si ya viene con 'data:image' o si es base64 puro)
    const rawPhoto = fullPlayerData.foto || matchedFfcvPlayer.foto;
    let finalPhoto = null;
    if (rawPhoto && typeof rawPhoto === 'string' && rawPhoto.trim().length > 20) {
      const cleanPhoto = rawPhoto.trim();
      if (cleanPhoto.startsWith('data:image')) {
        finalPhoto = cleanPhoto;
      } else {
        finalPhoto = 'data:image/jpeg;base64,' + cleanPhoto;
      }
    }

    return NextResponse.json({
      found: true,
      player: {
        codjugador: codJugador,
        nombre: fullPlayerData.nombre_jugador || matchedFfcvPlayer.nombre,
        email: matchedFfcvPlayer.email || null,
        dorsal: fullPlayerData.dorsal_jugador || matchedFfcvPlayer.dorsal || null,
        posicion: fullPlayerData.posicion_jugador || matchedFfcvPlayer.posicion || null,
        categoria: fullPlayerData.categoria_equipo || null,
        temporada_actual: fullPlayerData.nombre_temporada || '2026-2027',
        minutos_totales: fullPlayerData.minutos_totales_jugados || 0,
        media_minutos: fullPlayerData.media_minutos_totales_jugados || '0',
        es_portero: fullPlayerData.es_portero === '1',
        foto_base64: finalPhoto,
        partidos: fullPlayerData.partidos || [],
        tarjetas: fullPlayerData.tarjetas || [],
        competiciones: fullPlayerData.competiciones_participa || [],
        historial_clubes: historialTemporadas
      }
    });

  } catch (err: any) {
    console.error('[ffcv-player-info] Global Exception:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
