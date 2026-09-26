import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedContext } from '@/lib/auth-helpers';
import { normalizeImageUrl } from '@/lib/ffcv/parser';
import { getVerifiedHistoryForPlayer, getRegistryShield } from '@/lib/ffcv/player-history-registry';

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

const NICKNAMES_MAP: Record<string, string[]> = {
  francisco: ['fran', 'paco', 'curro'],
  fran: ['francisco'],
  paco: ['francisco'],
  jose: ['pepe', 'pep'],
  pepe: ['jose'],
  antonio: ['toni', 'tono'],
  toni: ['antonio'],
  manuel: ['manu', 'manolo'],
  manu: ['manuel'],
  alejandro: ['alex', 'ale'],
  alex: ['alejandro'],
  javier: ['javi'],
  javi: ['javier'],
  ignacio: ['nacho'],
  nacho: ['ignacio'],
  roberto: ['rober'],
  rober: ['roberto'],
  mohamed: ['mohammed', 'mohamd', 'moha', 'med'],
  mohammed: ['mohamed', 'mohamd', 'moha', 'med'],
  mohamd: ['mohamed', 'mohammed', 'moha', 'med'],
  atouzani: ['touzani'],
  touzani: ['atouzani'],
  khayefallah: ['khaef', 'allah', 'daghmani'],
  khaefallah: ['khayefallah', 'khaef', 'allah'],
  serna: ['ballesta'],
  ballestaaa: ['ballesta', 'ballestas']
};

function matchFfcvPlayerInRoster(
  firstName: string,
  lastName: string,
  dorsal: string | number | null | undefined,
  ffcvRoster: any[]
) {
  const normFirst = normalizeStr(firstName);
  const normLast = normalizeStr(lastName);
  const dorsalStr = dorsal ? String(dorsal).trim() : '';

  const firstTokens = normFirst.split(' ').filter(Boolean);
  const lastTokens = normLast.split(' ').filter(Boolean);

  let bestCandidate = null;
  let bestScore = 0;

  for (const j of ffcvRoster) {
    const ffcvNorm = normalizeStr(j.nombre);
    const ffcvTokens = ffcvNorm.split(' ').filter(Boolean);

    // 1. Check surname matching (exact token, alias, or root similarity)
    let surnameMatched = false;
    for (const lt of lastTokens) {
      if (lt.length <= 2) continue;
      if (ffcvTokens.includes(lt) || ffcvNorm.includes(lt)) {
        surnameMatched = true;
        break;
      }
      const aliases = NICKNAMES_MAP[lt] || [];
      if (aliases.some(a => ffcvTokens.includes(a) || ffcvNorm.includes(a))) {
        surnameMatched = true;
        break;
      }
      if (ffcvTokens.some(ft => ft.length > 4 && (lt.startsWith(ft.slice(0, 5)) || ft.startsWith(lt.slice(0, 5))))) {
        surnameMatched = true;
        break;
      }
    }

    // 2. Check first name matching (exact token, alias, or root similarity)
    let firstNameMatched = false;
    for (const ft of firstTokens) {
      if (ft.length <= 2) continue;
      if (ffcvTokens.includes(ft) || ffcvNorm.includes(ft)) {
        firstNameMatched = true;
        break;
      }
      const aliases = NICKNAMES_MAP[ft] || [];
      if (aliases.some(a => ffcvTokens.includes(a) || ffcvNorm.includes(a))) {
        firstNameMatched = true;
        break;
      }
      if (ffcvTokens.some(f => f.length > 4 && (ft.startsWith(f.slice(0, 4)) || f.startsWith(ft.slice(0, 4))))) {
        firstNameMatched = true;
        break;
      }
    }

    if (!surnameMatched && !firstNameMatched) continue;

    let score = 0;
    if (surnameMatched) score += 4;
    if (firstNameMatched) score += 3;

    for (const t of [...firstTokens, ...lastTokens]) {
      if (t.length > 2 && ffcvTokens.includes(t)) score += 1;
    }

    if (dorsalStr && String(j.dorsal).trim() === dorsalStr) {
      score += 4;
    }

    if (surnameMatched && firstNameMatched && score > bestScore) {
      bestScore = score;
      bestCandidate = j;
    }
  }

  // Fallback for players where official FFCV roster shortened to only First Name + Single Surname
  if (!bestCandidate) {
    for (const j of ffcvRoster) {
      const ffcvNorm = normalizeStr(j.nombre);
      const allTokens = [...firstTokens, ...lastTokens].filter(t => t.length > 3);
      const matchCount = allTokens.filter(t => ffcvNorm.includes(t)).length;
      if (matchCount >= 2) {
        bestCandidate = j;
        break;
      }
    }
  }

  return bestCandidate;
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

    const matchedFfcvPlayer = matchFfcvPlayerInRoster(
      player.first_name,
      player.last_name,
      player.dorsal,
      plantillaData.jugadores_equipo
    );

    if (!matchedFfcvPlayer || !matchedFfcvPlayer.codjugador) {
      const rosterCount = plantillaData.jugadores_equipo.length;
      return NextResponse.json({
        found: false,
        message: rosterCount === 0
          ? 'La FFCV aún no ha publicado la plantilla oficial validada para este equipo en la federación.'
          : 'El jugador no figura en la plantilla oficial publicada en la FFCV para este equipo (puede estar en trámite de validación).'
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

    // Check if player has verified official FFCV career trajectory
    const fullName = `${player.first_name || ''} ${player.last_name || ''}`.trim();
    const verifiedHistory = getVerifiedHistoryForPlayer(fullName);

    const listadoTemporadas = Array.isArray(fullPlayerData.listado_temporadas) ? [...fullPlayerData.listado_temporadas] : [];

    // Extract live history from FFCV API for current and recent seasons
    const seasonFetchPromises = listadoTemporadas.slice(0, 10).map(async (temp: any) => {
      const isCurrentSeason = String(temp.codigo_temporada) === String(fullPlayerData.codigo_temporada);
      let seasonData = isCurrentSeason ? fullPlayerData : null;

      if (!seasonData) {
        const pastUrl = `https://ffcv.es/competiciones/api/jugadores/jugador_api.php?codigo=${codJugador}&cod_temporada=${temp.codigo_temporada}`;
        seasonData = await fetchFfcvJson(pastUrl);
      }

      if (!seasonData) return [];

      const compList = Array.isArray(seasonData.competiciones_participa) ? seasonData.competiciones_participa : [];
      const pjNum = parseInt(seasonData.partidos && seasonData.partidos.find((x: any) => x.nombre === 'Jugados')?.valor || '0', 10) || 0;
      const titNum = parseInt(seasonData.partidos && seasonData.partidos.find((x: any) => x.nombre === 'Titular')?.valor || '0', 10) || 0;
      const supNum = parseInt(seasonData.partidos && seasonData.partidos.find((x: any) => x.nombre === 'Suplente')?.valor || '0', 10) || 0;
      const golesNum = parseInt(seasonData.partidos && seasonData.partidos.find((x: any) => x.nombre === 'Total Goles')?.valor || '0', 10) || 0;
      const minNum = parseInt(seasonData.minutos_totales_jugados, 10) || 0;

      const entries: any[] = [];

      if (compList.length > 0) {
        // Group by distinct club to prevent duplicate league+cup rows for the SAME club,
        // while preserving DIFFERENT clubs within the same season (e.g. Almoradí + Sporting Saladar)
        const clubMap = new Map<string, any>();
        for (const comp of compList) {
          const clubKey = (comp.nombre_club || comp.nombre_equipo || '').trim().toLowerCase();
          if (!clubKey) continue;
          if (!clubMap.has(clubKey)) {
            clubMap.set(clubKey, comp);
          } else {
            const existing = clubMap.get(clubKey);
            if (existing.nombre_competicion?.toLowerCase().includes('copa') && !comp.nombre_competicion?.toLowerCase().includes('copa')) {
              clubMap.set(clubKey, comp);
            }
          }
        }

        for (const [_, comp] of clubMap) {
          const clubName = comp.nombre_club?.trim() || comp.nombre_equipo?.trim() || seasonData.equipo?.trim() || '';
          const equipoName = comp.nombre_equipo?.trim() || clubName;
          const shieldUrl = comp.escudo_equipo || getRegistryShield(clubName) || (isCurrentSeason ? fullPlayerData.escudo_equipo : null);
          const escudo = normalizeImageUrl(shieldUrl) || getRegistryShield(clubName);

          entries.push({
            temporada: temp.nombre_temporada || seasonData.nombre_temporada,
            codigo_temporada: String(temp.codigo_temporada),
            club: clubName,
            equipo: equipoName,
            escudo: escudo || null,
            competicion: comp.nombre_competicion?.trim() || seasonData.categoria_equipo || 'Competición FFCV',
            grupo: comp.nombre_grupo?.trim() || '',
            partidos_jugados: pjNum,
            titular: titNum,
            suplente: supNum,
            goles: golesNum,
            minutos: minNum,
            posicion_equipo: comp.posicion_equipo || '',
            puntos_equipo: comp.puntos_equipo || ''
          });
        }
      } else if (pjNum > 0 || minNum > 0 || isCurrentSeason) {
        // Only if player actually had activity or is current active season
        const clubName = seasonData.equipo?.trim() || fullPlayerData.equipo?.trim() || '';
        if (clubName) {
          const rawShield = seasonData.escudo_equipo || (isCurrentSeason ? fullPlayerData.escudo_equipo : null);
          const escudo = normalizeImageUrl(rawShield) || getRegistryShield(clubName);

          entries.push({
            temporada: temp.nombre_temporada || seasonData.nombre_temporada,
            codigo_temporada: String(temp.codigo_temporada),
            club: clubName,
            equipo: clubName,
            escudo: escudo || null,
            competicion: seasonData.categoria_equipo || 'Competición FFCV',
            grupo: '',
            partidos_jugados: pjNum,
            titular: titNum,
            suplente: supNum,
            goles: golesNum,
            minutos: minNum,
            posicion_equipo: '',
            puntos_equipo: ''
          });
        }
      }
      return entries;
    });

    const nestedLiveEntries = await Promise.all(seasonFetchPromises);
    const liveHistoryEntries = nestedLiveEntries.flat();

    let historialTemporadas: any[] = [];

    if (verifiedHistory && verifiedHistory.length > 0) {
      // Merge live statistical data (matches, minutes, goals) into the verified trajectory
      historialTemporadas = verifiedHistory.map((v) => {
        const liveMatch = liveHistoryEntries.find((l) => {
          const sameTemp = l.temporada === v.temporada;
          const lClub = (l.club || '').toLowerCase();
          const vClub = (v.club || '').toLowerCase();
          return sameTemp && (lClub.includes(vClub) || vClub.includes(lClub));
        });

        if (liveMatch) {
          return {
            ...v,
            escudo: v.escudo || liveMatch.escudo || getRegistryShield(v.club),
            competicion: liveMatch.competicion || v.competicion,
            grupo: liveMatch.grupo || v.grupo || '',
            partidos_jugados: liveMatch.partidos_jugados,
            titular: liveMatch.titular,
            suplente: liveMatch.suplente,
            goles: liveMatch.goles,
            minutos: liveMatch.minutos,
            posicion_equipo: liveMatch.posicion_equipo || '',
            puntos_equipo: liveMatch.puntos_equipo || ''
          };
        }

        return {
          ...v,
          escudo: v.escudo || getRegistryShield(v.club),
          competicion: v.competicion || v.categoria,
          grupo: v.grupo || '',
          partidos_jugados: v.partidos_jugados || 0,
          titular: v.titular || 0,
          suplente: v.suplente || 0,
          goles: v.goles || 0,
          minutos: v.minutos || 0,
          posicion_equipo: '',
          puntos_equipo: ''
        };
      });
    } else {
      historialTemporadas = liveHistoryEntries;
    }

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
