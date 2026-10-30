import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAuthenticatedContext } from '@/lib/auth-helpers';
import { normalizeImageUrl } from '@/lib/ffcv/parser';
import { getVerifiedHistoryForPlayer, getRegistryShield } from '@/lib/ffcv/player-history-registry';
import { fetchFfcvRawUrl } from '@/lib/ffcv/client';
import { isLigaBraveCompetition, getOfficialMatchDuration } from '@/lib/utils';
import { fetchApuntameloJson, getApuntameloConfigForTeam, safeJsonParse } from '@/lib/apuntamelo/sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const ACTIVE_SEASON_ID = '663ed6ef-1dab-4350-9489-ed50f9e9ac15';
const CLOSED_SEASON_ID = '584f508a-fc1a-4339-b5b2-4296ffde2f4c';

const PLAYER_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos
const CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=300, stale-while-revalidate=600'
};

interface PlayerInfoCacheEntry {
  payload: any;
  expiresAt: number;
}

const playerInfoCache = new Map<string, PlayerInfoCacheEntry>();
const playerInfoInFlight = new Map<string, Promise<any>>();

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

export async function GET(req: Request) {
  try {
    const { context, error: authError } = await getAuthenticatedContext();
    if (!context || authError) {
      return NextResponse.json({ error: authError || 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const playerId = searchParams.get('playerId');
    const onlyAvatar = searchParams.get('onlyAvatar') === '1' || searchParams.get('onlyAvatar') === 'true';

    if (!playerId) {
      return NextResponse.json({ error: 'Falta el parámetro playerId' }, { status: 400 });
    }

    const now = Date.now();
    const fullCacheKey = `${playerId}:full`;
    const modeCacheKey = `${playerId}:${onlyAvatar ? 'avatar' : 'full'}`;

    // Si existe caché completa vigente, sirve tanto para petición completa como para onlyAvatar
    const cachedFull = playerInfoCache.get(fullCacheKey);
    if (cachedFull && now < cachedFull.expiresAt) {
      return NextResponse.json(cachedFull.payload, { headers: CACHE_HEADERS });
    }

    if (onlyAvatar) {
      const cachedAvatar = playerInfoCache.get(modeCacheKey);
      if (cachedAvatar && now < cachedAvatar.expiresAt) {
        return NextResponse.json(cachedAvatar.payload, { headers: CACHE_HEADERS });
      }
    }

    // Deduplicación de peticiones en vuelo para el mismo jugador
    const existingInFlight = playerInfoInFlight.get(modeCacheKey) || (onlyAvatar ? playerInfoInFlight.get(fullCacheKey) : undefined);
    if (existingInFlight) {
      const payload = await existingInFlight;
      return NextResponse.json(payload, { headers: CACHE_HEADERS });
    }

    const computePromise = (async () => {
      const supabase = createAdminClient();

      const { data: player, error: pErr } = await supabase
        .from('players')
        .select('id, first_name, last_name, dorsal, email, parent1_email, club_id, team_id, avatar_url, license_number, num_licencia_fed, posicion, posicion_principal, teams(id, name, category, ffcv_team_id, ffcv_competition_id, ffcv_group_id, ffcv_url, season_id)')
        .eq('id', playerId)
        .single();

      if (pErr || !player) {
        return { __status: 404, body: { error: 'Jugador no encontrado' } };
      }

      if (player.club_id !== context.profile.club_id && context.profile.role !== 'superadmin') {
        return { __status: 403, body: { error: 'No autorizado para ver este jugador' } };
      }

      // Fast-path si solo se pide avatar y el jugador ya tiene avatar_url en la base de datos
      if (onlyAvatar && player.avatar_url && player.avatar_url.trim().length > 0) {
        const fastAvatarBody = {
          found: true,
          player: {
            codjugador: (player as any).license_number || (player as any).num_licencia_fed || player.id,
            nombre: `${player.first_name || ''} ${player.last_name || ''}`.trim(),
            foto_base64: player.avatar_url
          }
        };
        playerInfoCache.set(modeCacheKey, { payload: fastAvatarBody, expiresAt: Date.now() + PLAYER_CACHE_TTL_MS });
        return { __status: 200, body: fastAvatarBody };
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
        // 1. Obtener datos oficiales desde la API de Apúntamelo (con caché de 10 min y protección HTML)
        const config = getApuntameloConfigForTeam(teamRel);
        const teamApuntameloId = config?.teamApuntameloId || 
          (teamName.toUpperCase().includes('INFANTIL B') ? 33431 : 
           teamName.toUpperCase().includes('CADETE B') ? 33383 : null);
        const grupoId = config?.grupoId || 
          (teamName.toUpperCase().includes('INFANTIL B') ? 4624 : 
           teamName.toUpperCase().includes('CADETE B') ? 4623 : null);
        const orgId = config?.orgId || 29;

        let apuntameloPlayer: any = null;
        let apuntameloPichichi: any = null;
        let apuntameloAmon: any = null;
        let apuntameloPunt: any = null;
        let apuntameloValor: any = null;
        let rawMatches: any[] = [];
        let mvpJornadas: any[] = [];
        let logrosObj: any = null;
        let teamData: any = null;

        if (teamApuntameloId) {
          try {
            const [infoArr, matchesData] = await Promise.all([
              fetchApuntameloJson<any[]>(
                `https://apuntamelo.com/obtenerInfoEquipo?equipo=${teamApuntameloId}`,
                { timeoutMs: 6000 }
              ),
              (!onlyAvatar && grupoId)
                ? fetchApuntameloJson<any[]>(
                    `https://apuntamelo.com/obtenerPartidosPorJornada?organizacion=${orgId}&grupo=${grupoId}`,
                    { timeoutMs: 6000 }
                  )
                : Promise.resolve(null)
            ]);

            if (Array.isArray(matchesData)) {
              rawMatches = matchesData;
            }

            if (Array.isArray(infoArr) && infoArr.length > 0) {
              teamData = infoArr[0];
              // Actualizar en segundo plano la caché en Supabase para tener siempre respaldo
              supabase
                .from('ffcv_standings')
                .update({
                  raw_data: {
                    teamData,
                    rawMatches: rawMatches.length > 0 ? rawMatches : undefined,
                    updated_at: new Date().toISOString()
                  }
                })
                .eq('team_ffcv_id', String(teamApuntameloId))
                .eq('ffcv_season_id', '22')
                .then(() => {}, (e) => console.warn('[ffcv-player-info] Fallo al actualizar raw_data en BD:', e.message));
            }
          } catch (apErr: any) {
            console.warn('[ffcv-player-info] Non-blocking Apuntamelo fetch error:', apErr.message);
          }
        }

        // FALLBACK EN BASE DE DATOS: Si la petición externa a Apúntamelo falló, agotó el tiempo o fue bloqueada
        // por Cloudflare en el entorno de producción (Vercel), cargar los datos federativos oficiales desde Supabase
        if (!teamData && teamApuntameloId) {
          try {
            const { data: stRow } = await supabase
              .from('ffcv_standings')
              .select('raw_data')
              .eq('team_ffcv_id', String(teamApuntameloId))
              .eq('ffcv_season_id', '22')
              .neq('ffcv_season_id', '21')
              .maybeSingle();

            if (stRow?.raw_data) {
              const rd = stRow.raw_data;
              if (rd.teamData) {
                teamData = rd.teamData;
              } else if (rd.Json_plantilla || rd.plantilla) {
                teamData = rd;
              }
              if (rawMatches.length === 0 && Array.isArray(rd.rawMatches) && rd.rawMatches.length > 0) {
                rawMatches = rd.rawMatches;
              }
            }
          } catch (dbErr: any) {
            console.warn('[ffcv-player-info] Error recuperando fallback de ffcv_standings:', dbErr.message);
          }
        }

        // Extraer plantilla y estadísticas oficiales de Apúntamelo si se dispone de teamData (en vivo o BD)
        if (teamData) {
          const plantilla = safeJsonParse<any[]>(teamData.Json_plantilla, []);
          const pichichis = safeJsonParse<any[]>(teamData.Json_pichichi, []);
          const amonestaciones = safeJsonParse<any[]>(teamData.Json_amonestaciones, []);
          const puntuaciones = safeJsonParse<any[]>(teamData.Json_puntuacion, []);
          const valores = safeJsonParse<any[]>(teamData.Json_valor, []);
          mvpJornadas = safeJsonParse<any[]>(teamData.Json_mvpjornada, []);
          logrosObj = safeJsonParse<any>(teamData.Json_logros, {});

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

        const photoUrl = player.avatar_url || 
          (apuntameloPlayer?.Imagen ? (apuntameloPlayer.Imagen.startsWith('http') ? apuntameloPlayer.Imagen : `https://apuntamelo.com/${apuntameloPlayer.Imagen}`) : null) ||
          apuntameloPlayer?.Imagen_transparente || null;

        const codFicha = apuntameloPlayer?.Id 
          ? String(apuntameloPlayer.Id)
          : (player as any).license_number || (player as any).num_licencia_fed || (player.dorsal ? `LB-${player.dorsal}` : `LB-${player.id.slice(0, 5).toUpperCase()}`);

        const fullName = apuntameloPlayer?.Nombre || `${player.first_name || ''} ${player.last_name || ''}`.trim();

        // Si solo se pidió avatar, responder sin hacer consultas pesadas de partidos/convocatorias
        if (onlyAvatar) {
          const avatarOnlyBody = {
            found: true,
            is_liga_brave: true,
            player: {
              is_liga_brave: true,
              codjugador: codFicha,
              nombre: fullName,
              foto_base64: photoUrl
            }
          };
          playerInfoCache.set(modeCacheKey, { payload: avatarOnlyBody, expiresAt: Date.now() + PLAYER_CACHE_TTL_MS });
          return { __status: 200, body: avatarOnlyBody };
        }

        // Fallback en Supabase si obtenerPartidosPorJornada falló o devolvió HTML en Apúntamelo
        if (rawMatches.length === 0 && grupoId && teamApuntameloId) {
          const { data: fallbackDbMatches } = await supabase
            .from('ffcv_matches')
            .select('ffcv_match_id, matchday, match_date, home_team_id, home_team_name, away_team_id, away_team_name, home_score, away_score, status')
            .eq('ffcv_group_id', String(grupoId))
            .eq('ffcv_season_id', '22')
            .neq('ffcv_season_id', '21')
            .order('matchday', { ascending: true });

          if (fallbackDbMatches && fallbackDbMatches.length > 0) {
            rawMatches = fallbackDbMatches.map((fm: any) => ({
              Id: fm.ffcv_match_id,
              Jornada: fm.matchday,
              Fecha: fm.match_date || '',
              FK_EquipoLiga_A: Number(fm.home_team_id) || 0,
              Nombre_A: fm.home_team_name,
              FK_EquipoLiga_B: Number(fm.away_team_id) || 0,
              Nombre_B: fm.away_team_name,
              Goles_A: fm.home_score,
              Goles_B: fm.away_score
            }));
          }
        }

        // 2. Consultar convocatorias y eventos de partido en paralelo para este jugador
        const [{ data: convs }, { data: matchEvents }] = await Promise.all([
          supabase
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
              partidos(id, fecha_hora, estado, season_id, resultado_propio, resultado_rival)
            `)
            .eq('player_id', playerId),
          supabase
            .from('match_events')
            .select('tipo_evento, partido_id')
            .eq('jugador_id', playerId)
        ]);

        // Regla de Oro: Filtrar exclusivamente por temporada activa 26/27 (excluir temporada 25/26)
        const activeConvs = (convs || []).filter((c: any) => {
          const p = c.partidos;
          if (!p) return false;
          if (p.season_id === CLOSED_SEASON_ID) return false;
          if (p.season_id && p.season_id !== ACTIVE_SEASON_ID) return false;
          return true;
        });

        const isLegitGoal = (e: any) => {
          const ev = (e.tipo_evento || '').toLowerCase();
          return ev.includes('gol') && !ev.includes('propia') && !ev.includes('pp');
        };

        const eventGoals = (matchEvents || []).filter(isLegitGoal).length;
        const eventYellows = (matchEvents || []).filter((e: any) => (e.tipo_evento || '').toLowerCase().includes('amarilla')).length;
        const eventReds = (matchEvents || []).filter((e: any) => (e.tipo_evento || '').toLowerCase().includes('roja')).length;

        // Partidos disputados
        const finalizedConvs = activeConvs.filter((c: any) => 
          c.status === 'convocado' &&
          (c.partidos?.estado === 'Finalizado' || (c.minutes_played ?? c.minutos_jugados ?? 0) > 0)
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

        const ultimosResultados = apuntameloPlayer?.Ultimos 
          ? apuntameloPlayer.Ultimos.split('/').filter((x: string) => x && x !== 'null')
          : [];

        // Construir partidos puntuados y distinciones Fantasy Liga Brave
        const rawScores = apuntameloPlayer?.Ultimos 
          ? apuntameloPlayer.Ultimos.split('/').map((s: string) => s.trim())
          : [];

        const clubMatches = rawMatches.filter((m: any) => 
          Number(m.FK_EquipoLiga_A) === teamApuntameloId || 
          Number(m.FK_EquipoLiga_B) === teamApuntameloId
        ).sort((a: any, b: any) => Number(a.Jornada || 0) - Number(b.Jornada || 0));

        const pId = apuntameloPlayer?.Id;
        const playerDorsalNumber = player.dorsal ? Number(player.dorsal) : (apuntameloPlayer?.Dorsal ? Number(apuntameloPlayer.Dorsal) : null);

        const partidosPuntuados: any[] = [];
        let playedMatchIndex = 0;

        for (const m of clubMatches) {
          const isHome = Number(m.FK_EquipoLiga_A) === teamApuntameloId;
          const rivalName = isHome ? m.Nombre_B : m.Nombre_A;
          const isPlayed = (m.Goles_A !== null && m.Goles_B !== null && m.Goles_A !== undefined);

          if (isPlayed) {
            const rawScoreStr = rawScores[playedMatchIndex];
            const hasScore = rawScoreStr && rawScoreStr !== 'null';
            const scoreNum = hasScore ? Number(rawScoreStr) : null;
            playedMatchIndex++;

            const jNum = Number(m.Jornada);
            const isMvpJornada = mvpJornadas.some((mvp: any) => 
              Number(mvp.Jornada) === jNum && 
              (mvp.Id === pId || (playerDorsalNumber && Number(mvp.Dorsal) === playerDorsalNumber))
            );

            if (scoreNum !== null) {
              const isOnceIdeal = isMvpJornada || scoreNum >= 7;
              partidosPuntuados.push({
                jornada: jNum,
                rival: rivalName || `Rival J${jNum}`,
                fecha: m.Fecha ? m.Fecha.split(' ')[0] : '',
                puntos: scoreNum,
                resultado: isHome ? `${m.Goles_A} - ${m.Goles_B}` : `${m.Goles_B} - ${m.Goles_A}`,
                es_mvp: isMvpJornada,
                once_ideal: isOnceIdeal,
                calificacion: scoreNum >= 7 ? 'top' : scoreNum >= 5 ? 'bueno' : 'regular'
              });
            }
          }
        }

        // Galardones y distinciones de honor
        const logros: any[] = [];

        // 1. Once Ideal
        const hasOnceIdeal = partidosPuntuados.some(p => p.once_ideal);
        const topScore = partidosPuntuados.length > 0 ? Math.max(...partidosPuntuados.map(p => p.puntos)) : 0;
        if (hasOnceIdeal || topScore >= 7) {
          logros.push({
            id: 'once_ideal',
            titulo: 'Once Ideal Liga Brave',
            subtitulo: `Rendimiento top en la jornada (${topScore} pts)`,
            icono: 'star',
            color: 'amber'
          });
        }

        // 2. MVP de la Jornada
        const vecesMvp = Number(apuntameloPlayer?.Veces_mvp) || partidosPuntuados.filter(p => p.es_mvp).length;
        if (vecesMvp > 0) {
          logros.push({
            id: 'mvp',
            titulo: 'Jugador MVP',
            subtitulo: `${vecesMvp} ${vecesMvp === 1 ? 'premio MVP oficial' : 'premios MVP oficiales'} de partido`,
            icono: 'crown',
            color: 'purple'
          });
        }

        // 3. Asistente Clave
        const totalAsistencias = Number(apuntameloPlayer?.Asistencias) || 0;
        if (totalAsistencias > 0) {
          logros.push({
            id: 'asistente',
            titulo: 'Asistente Destacado',
            subtitulo: `${totalAsistencias} ${totalAsistencias === 1 ? 'asistencia oficial' : 'asistencias oficiales'}`,
            icono: 'crosshair',
            color: 'blue'
          });
        }

        // 4. Goleador Oficial
        if (totalGoles > 0) {
          logros.push({
            id: 'goleador',
            titulo: 'Goleador Oficial',
            subtitulo: `${totalGoles} ${totalGoles === 1 ? 'gol anotado' : 'goles anotados'}`,
            icono: 'trophy',
            color: 'emerald'
          });
        }

        // 5. Récords oficiales desde Json_logros
        if (pId && logrosObj?.por_partido) {
          const porPartido = logrosObj.por_partido;
          for (const mId of Object.keys(porPartido)) {
            const porJugador = porPartido[mId]?.por_jugador || {};
            const jLogros = porJugador[String(pId)] || [];
            for (const jl of jLogros) {
              logros.push({
                id: `rec_${jl.Id || Math.random()}`,
                titulo: 'Récord Oficial Liga Brave',
                subtitulo: jl.Descripcion2 || jl.Descripcion || 'Marca oficial destacada',
                icono: 'medal',
                color: 'cyan'
              });
            }
          }
        }

        const valorMercadoRaw = apuntameloPlayer?.Valor_mercado 
          ? Number(apuntameloPlayer.Valor_mercado) 
          : (apuntameloValor?.Valor ? Number(apuntameloValor.Valor) : 0);

        const valorMercadoFormatted = valorMercadoRaw > 0
          ? `${(valorMercadoRaw / 1000000).toFixed(1)}M€` 
          : null;

        const puntosTotales = Number(apuntameloPlayer?.Puntuacion) || Number(apuntameloPunt?.Total) || null;
        const puntosMedia = apuntameloPlayer?.Media != null 
          ? Number(apuntameloPlayer.Media).toFixed(1) 
          : (apuntameloPunt?.Media != null ? Number(apuntameloPunt.Media).toFixed(1) : null);

        const ligaBravePayload = {
          found: true,
          is_liga_brave: true,
          player: {
            is_liga_brave: true,
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
            asistencias: totalAsistencias,
            puntos_totales: puntosTotales,
            puntos_media: puntosMedia,
            valor_mercado: valorMercadoFormatted,
            ultimos_resultados: ultimosResultados,
            partidos_puntuados: partidosPuntuados,
            logros: logros,
            brave_fantasy: {
              valor_mercado: valorMercadoFormatted,
              valor_mercado_raw: valorMercadoRaw,
              puntos_totales: puntosTotales || 0,
              puntos_media: puntosMedia || '0.0',
              presencias: apPresencias,
              goles: totalGoles,
              asistencias: totalAsistencias,
              veces_mvp: vecesMvp,
              partidos_puntuados: partidosPuntuados,
              logros: logros,
              escudo_transparente: apuntameloPlayer?.Escudo_transparente || null,
              imagen_transparente: apuntameloPlayer?.Imagen_transparente || null
            }
          }
        };

        playerInfoCache.set(fullCacheKey, { payload: ligaBravePayload, expiresAt: Date.now() + PLAYER_CACHE_TTL_MS });
        return { __status: 200, body: ligaBravePayload };
      }

      // Equipos no federados en FFCV (Cadete B, Infantil B, etc.)
      const nonFederatedTeams = ['CADETE B', 'INFANTIL B'];
      const isNonFederated = nonFederatedTeams.some(nft => teamName.toUpperCase().includes(nft));

      if (isNonFederated || !ffcvTeamId) {
        const notFedPayload = { 
          found: false,
          message: isNonFederated
            ? `El equipo ${teamName || 'del jugador'} no participa en competiciones oficiales de la FFCV (equipo de fútbol formativo no federado).`
            : `El equipo ${teamName || 'del jugador'} no dispone de código federativo FFCV para esta temporada.`
        };
        playerInfoCache.set(modeCacheKey, { payload: notFedPayload, expiresAt: Date.now() + PLAYER_CACHE_TTL_MS });
        return { __status: 200, body: notFedPayload };
      }

      const plantillaUrl = 'https://ffcv.es/competiciones/api/equipos/plantilla_home.php?cod_equipo=' + ffcvTeamId;
      const plantillaData = await fetchFfcvRawUrl(plantillaUrl);

      if (!plantillaData || !Array.isArray(plantillaData.jugadores_equipo)) {
        // Devolver 200 con found:false en lugar de 502 para evitar errores en consola o reintentos en bucle
        return {
          __status: 200,
          body: {
            found: false,
            message: 'El servidor de la federación FFCV no se encuentra disponible temporalmente. Inténtalo de nuevo en unos minutos.'
          }
        };
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
        const missingInRosterPayload = {
          found: false,
          message: rosterCount === 0
            ? `La FFCV aún no ha publicado la plantilla oficial validada para este equipo (${teamName}) en la federación (inicio de competición previsto para el 17 de octubre). Una vez validada el acta de la jornada 1 por la federación, la ficha estará visible automáticamente.`
            : `El jugador no figura en la plantilla oficial publicada en la FFCV para este equipo (${teamName}). Puede estar en trámite de validación federativa.`
        };
        playerInfoCache.set(modeCacheKey, { payload: missingInRosterPayload, expiresAt: Date.now() + PLAYER_CACHE_TTL_MS });
        return { __status: 200, body: missingInRosterPayload };
      }

      const codJugador = matchedFfcvPlayer.codjugador;
      const fullName = `${player.first_name || ''} ${player.last_name || ''}`.trim();

      // Si solo se pidió avatar y la foto ya viene en plantilla_home.php, evitar llamar a jugador_api.php y temporadas pasadas
      if (onlyAvatar && matchedFfcvPlayer.foto && typeof matchedFfcvPlayer.foto === 'string' && matchedFfcvPlayer.foto.trim().length > 20) {
        const cleanRosterPhoto = matchedFfcvPlayer.foto.trim();
        const rosterPhotoBase64 = cleanRosterPhoto.startsWith('data:image')
          ? cleanRosterPhoto
          : 'data:image/jpeg;base64,' + cleanRosterPhoto;
        const avatarBody = {
          found: true,
          player: {
            codjugador: codJugador,
            nombre: fullName || matchedFfcvPlayer.nombre,
            foto_base64: rosterPhotoBase64
          }
        };
        playerInfoCache.set(modeCacheKey, { payload: avatarBody, expiresAt: Date.now() + PLAYER_CACHE_TTL_MS });
        return { __status: 200, body: avatarBody };
      }

      const playerApiUrl = 'https://ffcv.es/competiciones/api/jugadores/jugador_api.php?codigo=' + codJugador + '&cod_temporada=auto';
      const fullPlayerData = await fetchFfcvRawUrl(playerApiUrl);

      if (!fullPlayerData) {
        return {
          __status: 200,
          body: {
            found: true,
            basicInfo: matchedFfcvPlayer,
            message: 'Se localizó la ficha pero no se pudieron cargar las estadísticas extendidas.'
          }
        };
      }

      // Formatear foto correctamente (detectar si ya viene con 'data:image' o si es base64 puro)
      const rawPhoto = fullPlayerData.foto || matchedFfcvPlayer.foto;
      let finalPhoto: string | null = null;
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

      // Si solo se pidió avatar, responder ahora sin consultar hasta 10 temporadas históricas en la FFCV
      if (onlyAvatar) {
        const avatarBody = {
          found: true,
          player: {
            codjugador: codJugador,
            nombre: (fullPlayerData.nombre_jugador && fullPlayerData.nombre_jugador.trim().split(/\s+/).length > 1)
              ? fullPlayerData.nombre_jugador
              : (fullName || matchedFfcvPlayer.nombre),
            foto_base64: finalPhoto
          }
        };
        playerInfoCache.set(modeCacheKey, { payload: avatarBody, expiresAt: Date.now() + PLAYER_CACHE_TTL_MS });
        return { __status: 200, body: avatarBody };
      }

      // Check if player has verified official FFCV career trajectory
      const verifiedHistory = getVerifiedHistoryForPlayer(fullName);

      const listadoTemporadas = Array.isArray(fullPlayerData.listado_temporadas) ? [...fullPlayerData.listado_temporadas] : [];
      // Si ya tenemos trayectoria verificada, solo necesitamos consultar la temporada actual para fusionar estadísticas en vivo;
      // en caso contrario, limitamos a las 5 temporadas más recientes con timeout corto y caché de 2h en client.ts
      const seasonsToFetch = (verifiedHistory && verifiedHistory.length > 0)
        ? listadoTemporadas.filter((t: any) => String(t.codigo_temporada) === String(fullPlayerData.codigo_temporada)).slice(0, 1)
        : listadoTemporadas.slice(0, 5);

      const seasonFetchPromises = seasonsToFetch.map(async (temp: any) => {
        const isCurrentSeason = String(temp.codigo_temporada) === String(fullPlayerData.codigo_temporada);
        let seasonData = isCurrentSeason ? fullPlayerData : null;

        if (!seasonData) {
          const pastUrl = `https://ffcv.es/competiciones/api/jugadores/jugador_api.php?codigo=${codJugador}&cod_temporada=${temp.codigo_temporada}`;
          seasonData = await fetchFfcvRawUrl(pastUrl, { timeoutMs: 4500, retries: 0 });
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

      const fullPayload = {
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
      };

      playerInfoCache.set(fullCacheKey, { payload: fullPayload, expiresAt: Date.now() + PLAYER_CACHE_TTL_MS });
      return { __status: 200, body: fullPayload };
    })();

    playerInfoInFlight.set(modeCacheKey, computePromise.then(r => r.body));
    try {
      const result = await computePromise;
      return NextResponse.json(result.body, {
        status: result.__status,
        headers: result.__status === 200 ? CACHE_HEADERS : undefined
      });
    } finally {
      playerInfoInFlight.delete(modeCacheKey);
    }

  } catch (err: any) {
    console.error('[ffcv-player-info] Global Exception:', err);
    return NextResponse.json({ error: err.message || 'Error interno del servidor' }, { status: 500 });
  }
}
