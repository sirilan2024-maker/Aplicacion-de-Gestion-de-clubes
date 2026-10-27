import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedContext } from '@/lib/auth-helpers';
import { normalizeImageUrl } from '@/lib/ffcv/parser';
import { getVerifiedHistoryForPlayer, getRegistryShield } from '@/lib/ffcv/player-history-registry';
import { fetchFfcvRawUrl } from '@/lib/ffcv/client';
import { isLigaBraveCompetition, getOfficialMatchDuration } from '@/lib/utils';
import { fetchApuntameloJson, getApuntameloConfigForTeam } from '@/lib/apuntamelo/sync';

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
  ffcvRoster: any[],
  email?: string | null
) {
  const normFirst = normalizeStr(firstName);
  const normLast = normalizeStr(lastName);
  const dorsalStr = dorsal ? String(dorsal).trim() : '';
  const cleanEmail = (email || '').trim().toLowerCase();

  const firstTokens = normFirst.split(' ').filter(Boolean);
  const lastTokens = normLast.split(' ').filter(Boolean);

  let bestCandidate = null;
  let bestScore = 0;

  for (const j of ffcvRoster) {
    const ffcvNorm = normalizeStr(j.nombre);
    const ffcvTokens = ffcvNorm.split(' ').filter(Boolean);
    const jEmail = (j.email || '').trim().toLowerCase();

    // 0. Email check (exact match with player or parent email registered in FFCV)
    let emailMatched = Boolean(cleanEmail && jEmail && cleanEmail === jEmail);

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

    const dorsalMatched = Boolean(dorsalStr && String(j.dorsal).trim() === dorsalStr);

    if (!surnameMatched && !firstNameMatched && !emailMatched && !dorsalMatched) continue;

    let score = 0;
    if (emailMatched) score += 10;
    if (surnameMatched) score += 4;
    if (firstNameMatched) score += 3;
    if (dorsalMatched) score += 4;

    for (const t of [...firstTokens, ...lastTokens]) {
      if (t.length > 2 && ffcvTokens.includes(t)) score += 1;
    }

    const isMatchValid = (surnameMatched && firstNameMatched) ||
      emailMatched ||
      (dorsalMatched && (firstNameMatched || surnameMatched)) ||
      (ffcvTokens.length === 1 && firstNameMatched && dorsalMatched);

    if (isMatchValid && score > bestScore) {
      bestScore = score;
      bestCandidate = j;
    }
  }

  // Fallback for players where official FFCV roster shortened to only First Name + Single Surname or single name with dorsal
  if (!bestCandidate) {
    for (const j of ffcvRoster) {
      const ffcvNorm = normalizeStr(j.nombre);
      const ffcvTokens = ffcvNorm.split(' ').filter(Boolean);
      const dorsalMatched = Boolean(dorsalStr && String(j.dorsal).trim() === dorsalStr);
      const jEmail = (j.email || '').trim().toLowerCase();

      if (cleanEmail && jEmail && cleanEmail === jEmail) {
        bestCandidate = j;
        break;
      }

      if (dorsalMatched && (firstTokens.some(ft => ffcvNorm.includes(ft)) || lastTokens.some(lt => ffcvNorm.includes(lt)))) {
        bestCandidate = j;
        break;
      }

      const allTokens = [...firstTokens, ...lastTokens].filter(t => t.length > 3);
      const matchCount = allTokens.filter(t => ffcvNorm.includes(t)).length;
      if (matchCount >= 2 || (ffcvTokens.length === 1 && matchCount >= 1 && dorsalMatched)) {
        bestCandidate = j;
        break;
      }
    }
  }

  return bestCandidate;
}

const ACTIVE_SEASON_ID = '663ed6ef-1dab-4350-9489-ed50f9e9ac15';

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
      .select('id, first_name, last_name, dorsal, email, parent1_email, club_id, team_id, avatar_url, license_number, num_licencia_fed, posicion, posicion_principal, teams(id, name, category, ffcv_team_id, ffcv_competition_id, ffcv_group_id, ffcv_url, season_id)')
      .eq('id', playerId)
      .single();

    if (pErr || !player) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 });
    }

    if (player.club_id !== context.profile.club_id && context.profile.role !== 'superadmin') {
      return NextResponse.json({ error: 'No autorizado para ver este jugador' }, { status: 403 });
    }

    const teamRel = player.teams as any;
    let teamName = teamRel?.name || '';
    let teamCategory = teamRel?.category || '';
    let ffcvTeamId = teamRel?.ffcv_team_id;

    // Si el equipo no es de la temporada activa o no tiene código FFCV, buscar en el historial de la temporada 26/27
    if (!ffcvTeamId || teamRel?.season_id !== ACTIVE_SEASON_ID) {
      const { data: activePsh } = await supabase
        .from('player_season_history')
        .select('team_id, teams(id, name, category, ffcv_team_id, ffcv_group_id, ffcv_url, season_id)')
        .eq('player_id', playerId)
        .eq('season_id', ACTIVE_SEASON_ID)
        .maybeSingle();

      if (activePsh && (activePsh as any).teams) {
        const activeTeam = (activePsh as any).teams;
        teamName = activeTeam.name || teamName;
        teamCategory = activeTeam.category || teamCategory;
        ffcvTeamId = activeTeam.ffcv_team_id || ffcvTeamId;
      }
    }

    const isLigaBrave = isLigaBraveCompetition({
      teamId: player.team_id || teamRel?.id,
      teamName,
      category: teamCategory,
      ffcvGroupId: teamRel?.ffcv_group_id,
      ffcvUrl: teamRel?.ffcv_url
    });

    if (isLigaBrave) {
      // 1. Obtener datos oficiales en tiempo real desde la API de Apúntamelo (Liga Brave)
      const config = getApuntameloConfigForTeam(teamRel);
      const teamApuntameloId = config?.teamApuntameloId || 
        (teamName.toUpperCase().includes('INFANTIL B') ? 33431 : 
         teamName.toUpperCase().includes('CADETE B') ? 33383 : null);

      let apuntameloPlayer: any = null;
      let apuntameloPichichi: any = null;
      let apuntameloAmon: any = null;
      let apuntameloPunt: any = null;
      let apuntameloValor: any = null;

      if (teamApuntameloId) {
        try {
          const infoArr = await fetchApuntameloJson<any[]>(
            `https://apuntamelo.com/obtenerInfoEquipo?equipo=${teamApuntameloId}`
          );
          if (Array.isArray(infoArr) && infoArr.length > 0) {
            const teamData = infoArr[0];
            const plantilla = JSON.parse(teamData.Json_plantilla || '[]');
            const pichichis = JSON.parse(teamData.Json_pichichi || '[]');
            const amonestaciones = JSON.parse(teamData.Json_amonestaciones || '[]');
            const puntuaciones = JSON.parse(teamData.Json_puntuacion || '[]');
            const valores = JSON.parse(teamData.Json_valor || '[]');

            const normFirst = normalizeStr(player.first_name);
            const normLast = normalizeStr(player.last_name);
            const playerDorsal = player.dorsal ? Number(player.dorsal) : null;
            const tokens = [...normFirst.split(' '), ...normLast.split(' ')].filter(t => t.length > 2);

            // 1ª prioridad: Dorsal exacto + coincidencia de nombre/apellido
            apuntameloPlayer = plantilla.find((p: any) => {
              const pDorsal = p.Dorsal ? Number(p.Dorsal) : null;
              const pNorm = normalizeStr(p.Nombre);
              if (playerDorsal && pDorsal === playerDorsal) {
                if (tokens.some(t => pNorm.includes(t))) return true;
              }
              return false;
            });

            // 2ª prioridad: Coincidencia por tokens de nombre (mínimo 2 tokens o apellido)
            if (!apuntameloPlayer) {
              apuntameloPlayer = plantilla.find((p: any) => {
                const pNorm = normalizeStr(p.Nombre);
                const matches = tokens.filter(t => pNorm.includes(t)).length;
                return matches >= 2;
              });
            }

            // 3ª prioridad: Por dorsal si no hubo coincidencia anterior
            if (!apuntameloPlayer && playerDorsal) {
              apuntameloPlayer = plantilla.find((p: any) => Number(p.Dorsal) === playerDorsal);
            }

            if (apuntameloPlayer) {
              const pId = apuntameloPlayer.Id;
              apuntameloPichichi = pichichis.find((x: any) => x.Id === pId || (playerDorsal && Number(x.Dorsal) === playerDorsal));
              apuntameloAmon = amonestaciones.find((x: any) => x.Id === pId || (playerDorsal && Number(x.Dorsal) === playerDorsal));
              apuntameloPunt = puntuaciones.find((x: any) => x.Id === pId || (playerDorsal && Number(x.Dorsal) === playerDorsal));
              apuntameloValor = valores.find((x: any) => x.Id === pId || (playerDorsal && Number(x.Dorsal) === playerDorsal));
            }
          }
        } catch (apErr: any) {
          console.warn('[ffcv-player-info] Non-blocking Apuntamelo fetch error:', apErr.message);
        }
      }

      // 2. Consultar convocatorias y partidos de la temporada activa para este jugador
      const { data: convs } = await supabase
        .from('convocatorias')
        .select(`
          partido_id,
          status,
          titular,
          yellow_cards,
          tarjetas_amarillas,
          red_cards,
          tarjetas_rojas,
          goals,
          goles,
          minutes_played,
          minutos_jugados,
          partidos(id, fecha_hora, rival, jornada, estado, season_id)
        `)
        .eq('player_id', playerId);

      // Regla de Oro: Filtrar exclusivamente por temporada activa 26/27 (excluir temporada 25/26)
      const activeConvs = (convs || []).filter((c: any) => {
        const p = c.partidos;
        if (!p) return false;
        if (p.season_id && p.season_id !== ACTIVE_SEASON_ID) return false;
        return true;
      });

      // Consultar también eventos de partido en vivo registrados en el club
      const { data: matchEvents } = await supabase
        .from('match_events')
        .select('tipo_evento, partido_id')
        .eq('jugador_id', playerId);

      const isLegitGoal = (e: any) => {
        const ev = (e.tipo_evento || '').toLowerCase();
        return ev.includes('gol') && !ev.includes('propia') && !ev.includes('pp');
      };

      const eventGoals = (matchEvents || []).filter(isLegitGoal).length;
      const eventYellows = (matchEvents || []).filter((e: any) => (e.tipo_evento || '').toLowerCase().includes('amarilla')).length;
      const eventReds = (matchEvents || []).filter((e: any) => (e.tipo_evento || '').toLowerCase().includes('roja')).length;

      // Partidos disputados
      const finalizedConvs = activeConvs.filter((c: any) => 
        c.partidos?.estado === 'Finalizado' || (c.minutes_played ?? c.minutos_jugados ?? 0) > 0
      );

      let dbPartidosJugados = 0;
      let dbTitulares = 0;
      let dbSuplentes = 0;
      let dbConvGoals = 0;
      let dbConvYellows = 0;
      let dbConvReds = 0;
      let dbMinutosTotales = 0;

      finalizedConvs.forEach((c: any) => {
        const rawM = c.minutes_played ?? c.minutos_jugados;
        const mins = (rawM !== null && rawM !== undefined) ? Number(rawM) : (c.titular ? 70 : 0);
        const isTitular = Boolean(c.titular);

        if (mins > 0 || isTitular) {
          dbPartidosJugados++;
        }
        if (isTitular) {
          dbTitulares++;
        } else if (mins > 0) {
          dbSuplentes++;
        }

        dbMinutosTotales += mins;
        dbConvGoals += Number(c.goals ?? c.goles ?? 0);
        dbConvYellows += Number(c.yellow_cards ?? c.tarjetas_amarillas ?? 0);
        dbConvReds += Number(c.red_cards ?? c.tarjetas_rojas ?? 0);
      });

      // Consolidar datos de Apúntamelo con BD interna
      const categoryMatchDuration = getOfficialMatchDuration(teamCategory || teamName, 'Liga Brave');
      const apPresencias = Number(apuntameloPlayer?.Presencias) || 0;
      const apGoles = Number(apuntameloPlayer?.Goles) || Number(apuntameloPichichi?.Total) || 0;
      const apAmarillas = Number(apuntameloAmon?.Total) || 0;

      const partidosJugados = Math.max(dbPartidosJugados, apPresencias);
      const totalGoles = Math.max(dbConvGoals, eventGoals, apGoles);
      const totalYellows = Math.max(dbConvYellows, eventYellows, apAmarillas);
      const totalReds = Math.max(dbConvReds, eventReds);
      const minutosTotales = Math.max(dbMinutosTotales, apPresencias * categoryMatchDuration);
      const titulares = Math.max(dbTitulares, partidosJugados);
      const suplentes = dbSuplentes;

      const fullName = apuntameloPlayer?.Nombre || `${player.first_name || ''} ${player.last_name || ''}`.trim();
      const verifiedHistory = getVerifiedHistoryForPlayer(fullName);

      const currentEntry = {
        temporada: '2026-2027',
        codigo_temporada: '22',
        club: 'Sporting Saladar',
        equipo: teamName || 'Sporting Saladar',
        escudo: getRegistryShield('sporting saladar'),
        competicion: 'Liga Brave',
        grupo: teamRel?.ffcv_group_id ? `Grupo ${teamRel.ffcv_group_id}` : 'Grupo Formativo',
        partidos_jugados: partidosJugados,
        titular: titulares,
        suplente: suplentes,
        goles: totalGoles,
        minutos: minutosTotales,
        posicion_equipo: '',
        puntos_equipo: ''
      };

      let historialClubes: any[] = [currentEntry];
      if (verifiedHistory && verifiedHistory.length > 0) {
        const pastVerified = verifiedHistory.filter(h => h.temporada !== '2026-2027');
        historialClubes = [currentEntry, ...pastVerified];
      }

      const codFicha = apuntameloPlayer?.Id 
        ? String(apuntameloPlayer.Id)
        : (player as any).license_number || (player as any).num_licencia_fed || (player.dorsal ? `LB-${player.dorsal}` : `LB-${player.id.slice(0, 5).toUpperCase()}`);

      const photoUrl = player.avatar_url || 
        (apuntameloPlayer?.Imagen ? (apuntameloPlayer.Imagen.startsWith('http') ? apuntameloPlayer.Imagen : `https://apuntamelo.com/${apuntameloPlayer.Imagen}`) : null) ||
        apuntameloPlayer?.Imagen_transparente || null;

      const ultimosResultados = apuntameloPlayer?.Ultimos 
        ? apuntameloPlayer.Ultimos.split('/').filter((x: string) => x && x !== 'null')
        : [];

      return NextResponse.json({
        found: true,
        is_liga_brave: true,
        player: {
          codjugador: codFicha,
          nombre: fullName,
          email: player.email || player.parent1_email || null,
          dorsal: apuntameloPlayer?.Dorsal || player.dorsal || null,
          posicion: (player as any).posicion_principal || (player as any).posicion || 'Jugador',
          categoria: teamCategory || teamName || 'Liga Brave',
          temporada_actual: '2026-2027',
          minutos_totales: minutosTotales,
          media_minutos: partidosJugados > 0 ? (minutosTotales / partidosJugados).toFixed(1) : '0',
          es_portero: ((player as any).posicion_principal || (player as any).posicion || '').toLowerCase().includes('portero'),
          foto_base64: photoUrl,
          partidos: [
            { nombre: 'Jugados', valor: String(partidosJugados) },
            { nombre: 'Titular', valor: String(titulares) },
            { nombre: 'Suplente', valor: String(suplentes) },
            { nombre: 'Total Goles', valor: String(totalGoles) }
          ],
          tarjetas: [
            { nombre: 'Amarillas', valor: String(totalYellows) },
            { nombre: 'Rojas', valor: String(totalReds) }
          ],
          competiciones: [
            {
              nombre_competicion: 'Liga Brave',
              nombre_equipo: teamName,
              nombre_club: 'Sporting Saladar'
            }
          ],
          historial_clubes: historialClubes,
          // Estadísticas específicas de la Liga Brave
          asistencias: Number(apuntameloPlayer?.Asistencias) || 0,
          puntos_totales: Number(apuntameloPlayer?.Puntuacion) || Number(apuntameloPunt?.Total) || null,
          puntos_media: apuntameloPlayer?.Media != null ? Number(apuntameloPlayer.Media).toFixed(1) : null,
          valor_mercado: apuntameloPlayer?.Valor_mercado 
            ? `${(Number(apuntameloPlayer.Valor_mercado) / 1000000).toFixed(1)}M€` 
            : null,
          ultimos_resultados: ultimosResultados
        }
      });
    }

    // Equipos no federados en FFCV (Cadete B, Infantil B, etc.)
    const nonFederatedTeams = ['CADETE B', 'INFANTIL B'];
    const isNonFederated = nonFederatedTeams.some(nft => teamName.toUpperCase().includes(nft));

    if (isNonFederated || !ffcvTeamId) {
      return NextResponse.json({ 
        found: false,
        message: isNonFederated
          ? `El equipo ${teamName || 'del jugador'} no participa en competiciones oficiales de la FFCV (equipo de fútbol formativo no federado).`
          : `El equipo ${teamName || 'del jugador'} no dispone de código federativo FFCV para esta temporada.`
      });
    }

    const plantillaUrl = 'https://ffcv.es/competiciones/api/equipos/plantilla_home.php?cod_equipo=' + ffcvTeamId;
    const plantillaData = await fetchFfcvRawUrl(plantillaUrl);

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
      plantillaData.jugadores_equipo,
      player.parent1_email || player.email
    );

    if (!matchedFfcvPlayer || !matchedFfcvPlayer.codjugador) {
      const rosterCount = plantillaData.jugadores_equipo.length;
      return NextResponse.json({
        found: false,
        message: rosterCount === 0
          ? `La FFCV aún no ha publicado la plantilla oficial validada para este equipo (${teamName}) en la federación (inicio de competición previsto para el 17 de octubre). Una vez validada el acta de la jornada 1 por la federación, la ficha estará visible automáticamente.`
          : `El jugador no figura en la plantilla oficial publicada en la FFCV para este equipo (${teamName}). Puede estar en trámite de validación federativa.`
      });
    }

    const codJugador = matchedFfcvPlayer.codjugador;

    const playerApiUrl = 'https://ffcv.es/competiciones/api/jugadores/jugador_api.php?codigo=' + codJugador + '&cod_temporada=auto';
    const fullPlayerData = await fetchFfcvRawUrl(playerApiUrl);

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
        seasonData = await fetchFfcvRawUrl(pastUrl);
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

    // Si el jugador no tiene avatar en BD pero FFCV dispone de foto, persistirla automáticamente
    if (finalPhoto && (!player.avatar_url || player.avatar_url.trim().length === 0)) {
      try {
        const rawBase64 = finalPhoto.replace(/^data:image\/[a-z]+;base64,/, '').trim();
        const buffer = Buffer.from(rawBase64, 'base64');
        const fileName = `${player.id}-${Date.now()}.jpg`;
        const filePath = `jugadores/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, buffer, {
            contentType: 'image/jpeg',
            upsert: true
          });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          await supabase
            .from('players')
            .update({ avatar_url: publicUrl })
            .eq('id', player.id);
        }
      } catch (uploadErr: any) {
        console.warn('[ffcv-player-info] Non-blocking avatar persistence error:', uploadErr?.message);
      }
    }

    return NextResponse.json({
      found: true,
      player: {
        codjugador: codJugador,
        nombre: (fullPlayerData.nombre_jugador && fullPlayerData.nombre_jugador.trim().split(/\s+/).length > 1)
          ? fullPlayerData.nombre_jugador
          : (fullName || matchedFfcvPlayer.nombre),
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
