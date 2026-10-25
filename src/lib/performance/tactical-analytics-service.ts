import { createAdminClient } from '../supabase/admin';
import { fetchApuntameloJson, getApuntameloConfigForTeam, isApuntameloTeam } from '../apuntamelo/sync';
import { fetchMatchDetails } from '../ffcv/client';

export interface TimeIntervalStat {
  interval: string;
  scored: number;
  conceded: number;
}

export interface GoalTypeStat {
  type: string;
  count: number;
  percentage: number;
}

export interface DuplaStat {
  assistant: string;
  scorer: string;
  count: number;
}

export interface TacticalAnalyticsResult {
  teamId: string;
  teamName: string;
  isBrave: boolean;
  totalMatches: number;
  totalScored: number;
  totalConceded: number;
  timeIntervals: TimeIntervalStat[];
  goalTypes: GoalTypeStat[];
  topDuplas: DuplaStat[];
  pichichis: { name: string; goals: number; dorsal?: number }[];
  asistentes: { name: string; assists: number; dorsal?: number }[];
  zamora?: { name: string; goalsConceded: number; matches: number; average: number };
}

export interface PlayerAchievementBadge {
  id: string;
  title: string;
  subtitle: string;
  icon: 'goal' | 'mvp' | 'shield' | 'hattrick' | 'regular' | 'assist';
  badgeColor: 'amber' | 'emerald' | 'blue' | 'purple';
  unlockedAt?: string;
  description: string;
}

// In-memory 30-minute cache: key -> { data, timestamp }
const CACHE_TTL_MS = 30 * 60 * 1000;
const teamTacticalCache = new Map<string, { data: TacticalAnalyticsResult; timestamp: number }>();
const playerBadgesCache = new Map<string, { data: PlayerAchievementBadge[]; timestamp: number }>();

/**
 * Retrieves normalized tactical analytics for a team (works for both Liga Brave and FFCV teams)
 */
export async function getTeamTacticalAnalytics(teamId: string): Promise<TacticalAnalyticsResult | null> {
  const cached = teamTacticalCache.get(teamId);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const supabase = createAdminClient();

  // 1. Fetch team info
  const { data: team, error: teamErr } = await supabase
    .from('teams')
    .select('id, name, category, season_id, ffcv_season_id, ffcv_competition_id, ffcv_group_id, ffcv_team_id, ffcv_url')
    .eq('id', teamId)
    .single();

  if (teamErr || !team) {
    return null;
  }

  const isBrave = isApuntameloTeam(team);

  let result: TacticalAnalyticsResult;

  if (isBrave) {
    result = await getApuntameloTacticalAnalytics(team, supabase);
  } else {
    result = await getFfcvTacticalAnalytics(team, supabase);
  }

  teamTacticalCache.set(teamId, { data: result, timestamp: now });
  return result;
}

/**
 * Fetches and parses tactical stats from Apuntamelo API
 */
async function getApuntameloTacticalAnalytics(team: any, supabase: any): Promise<TacticalAnalyticsResult> {
  const config = getApuntameloConfigForTeam(team);
  const teamApuntameloId = config?.teamApuntameloId || team.ffcv_team_id;

  let totalScored = 0;
  let totalConceded = 0;
  let totalMatches = 0;
  const rawIntervals: { interval: string; scored: number; conceded: number }[] = [];
  const goalTypes: GoalTypeStat[] = [];
  const topDuplas: DuplaStat[] = [];
  const pichichis: { name: string; goals: number; dorsal?: number }[] = [];
  const asistentes: { name: string; assists: number; dorsal?: number }[] = [];

  try {
    const infoArr = await fetchApuntameloJson<any[]>(
      `https://apuntamelo.com/obtenerInfoEquipo?equipo=${teamApuntameloId}`
    );

    if (Array.isArray(infoArr) && infoArr.length > 0) {
      const data = infoArr[0];
      totalScored = Number(data.GF) || 0;
      totalConceded = Number(data.GC) || 0;
      totalMatches = Number(data.PJ) || 0;

      // 1. Minutos y tramos de gol
      const minutosGoles = JSON.parse(data.Json_minutosgoles || '[]');
      if (Array.isArray(minutosGoles) && minutosGoles.length > 0) {
        // Group into football quarter-hours (0-15', 15-30', 30-45', 45-60', 60-75', 75-90')
        const buckets: Record<string, { scored: number; conceded: number }> = {
          "0'-15'": { scored: 0, conceded: 0 },
          "15'-30'": { scored: 0, conceded: 0 },
          "30'-45'": { scored: 0, conceded: 0 },
          "45'-60'": { scored: 0, conceded: 0 },
          "60'-75'": { scored: 0, conceded: 0 },
          "75'-90'": { scored: 0, conceded: 0 }
        };

        for (const mg of minutosGoles) {
          const parts = (mg.intervalo || '').split('-').map((v: string) => parseInt(v, 10));
          const startMin = parts[0] || 0;
          let bucketKey = "0'-15'";
          if (startMin >= 75) bucketKey = "75'-90'";
          else if (startMin >= 60) bucketKey = "60'-75'";
          else if (startMin >= 45) bucketKey = "45'-60'";
          else if (startMin >= 30) bucketKey = "30'-45'";
          else if (startMin >= 15) bucketKey = "15'-30'";

          buckets[bucketKey].scored += Number(mg.marcados) || 0;
          buckets[bucketKey].conceded += Number(mg.encajados) || 0;
        }

        for (const [k, v] of Object.entries(buckets)) {
          rawIntervals.push({ interval: k, scored: v.scored, conceded: v.conceded });
        }
      }

      // 2. Tipos de Gol
      const tiposFavor = JSON.parse(data.Json_tipofavor || '[]');
      if (Array.isArray(tiposFavor) && tiposFavor.length > 0) {
        const sumGoals = tiposFavor.reduce((acc: number, t: any) => acc + (Number(t.total) || 0), 0) || totalScored || 1;
        for (const tf of tiposFavor) {
          const count = Number(tf.total) || 0;
          goalTypes.push({
            type: tf.tipo || 'Área',
            count,
            percentage: Math.round((count / sumGoals) * 100)
          });
        }
      }

      // 3. Duplas
      const duplasRaw = JSON.parse(data.Json_duplas || '[]');
      if (Array.isArray(duplasRaw)) {
        for (const d of duplasRaw) {
          if (d.Asistente && d.Goleador) {
            topDuplas.push({
              assistant: d.Asistente,
              scorer: d.Goleador,
              count: Number(d.Total) || 1
            });
          }
        }
      }

      // 4. Pichichis
      const pichRaw = JSON.parse(data.Json_pichichi || '[]');
      if (Array.isArray(pichRaw)) {
        for (const p of pichRaw) {
          if (p.Nombre) {
            pichichis.push({
              name: p.Nombre,
              goals: Number(p.Total) || Number(p.Goles) || 0,
              dorsal: p.Dorsal ? Number(p.Dorsal) : undefined
            });
          }
        }
      }

      // 5. Asistencias
      const asistRaw = JSON.parse(data.Json_asistencias || '[]');
      if (Array.isArray(asistRaw)) {
        for (const a of asistRaw) {
          if (a.Nombre) {
            asistentes.push({
              name: a.Nombre,
              assists: Number(a.Total) || Number(a.Asistencias) || 0,
              dorsal: a.Dorsal ? Number(a.Dorsal) : undefined
            });
          }
        }
      }
    }
  } catch (err: any) {
    console.warn(`[getApuntameloTacticalAnalytics] Error fetching Apuntamelo team stats for ${team.id}:`, err.message);
  }

  // Fallback defaults if intervals empty
  const defaultIntervals = rawIntervals.length > 0 ? rawIntervals : [
    { interval: "0'-15'", scored: 0, conceded: 0 },
    { interval: "15'-30'", scored: 0, conceded: 0 },
    { interval: "30'-45'", scored: totalScored, conceded: Math.ceil(totalConceded / 2) },
    { interval: "45'-60'", scored: 0, conceded: Math.floor(totalConceded / 2) },
    { interval: "60'-75'", scored: 0, conceded: 0 },
    { interval: "75'-90'", scored: 0, conceded: 0 }
  ];

  const defaultGoalTypes = goalTypes.length > 0 ? goalTypes : (totalScored > 0 ? [
    { type: 'Dentro del área', count: totalScored, percentage: 100 }
  ] : []);

  return {
    teamId: team.id,
    teamName: team.name,
    isBrave: true,
    totalMatches,
    totalScored,
    totalConceded,
    timeIntervals: defaultIntervals,
    goalTypes: defaultGoalTypes,
    topDuplas,
    pichichis,
    asistentes
  };
}

/**
 * Calculates tactical analytics for FFCV teams from official match reports and internal matches
 */
async function getFfcvTacticalAnalytics(team: any, supabase: any): Promise<TacticalAnalyticsResult> {
  const { data: matches } = await supabase
    .from('partidos')
    .select('id, resultado_propio, resultado_rival, estado, acta_oficial_url, fecha_hora, lugar')
    .eq('equipo_id', team.id)
    .neq('season_id', '584f508a-fc1a-4339-b5b2-4296ffde2f4c')
    .eq('estado', 'Finalizado');

  const finishedMatches = matches || [];
  let totalScored = 0;
  let totalConceded = 0;

  const buckets: Record<string, { scored: number; conceded: number }> = {
    "0'-15'": { scored: 0, conceded: 0 },
    "15'-30'": { scored: 0, conceded: 0 },
    "30'-45'": { scored: 0, conceded: 0 },
    "45'-60'": { scored: 0, conceded: 0 },
    "60'-75'": { scored: 0, conceded: 0 },
    "75'-90'": { scored: 0, conceded: 0 }
  };

  let areaGoals = 0;
  let penaltyGoals = 0;

  for (const m of finishedMatches) {
    const ownScore = Number(m.resultado_propio) || 0;
    const rivalScore = Number(m.resultado_rival) || 0;
    totalScored += ownScore;
    totalConceded += rivalScore;

    // Extract match codacta from acta_oficial_url if available
    let codacta = '';
    if (m.acta_oficial_url && m.acta_oficial_url.includes('CodPartido=')) {
      codacta = m.acta_oficial_url.split('CodPartido=')[1]?.split('&')[0] || '';
    }

    if (codacta) {
      try {
        const details = await fetchMatchDetails({ matchId: codacta });
        if (details) {
          const isHome = (m.lugar || '').toLowerCase().includes('local');
          const ownGoalsArr = isHome ? details.goles_equipo_local : details.goles_equipo_visitante;
          const rivalGoalsArr = isHome ? details.goles_equipo_visitante : details.goles_equipo_local;

          // Process goals scored by Saladar
          for (const g of (ownGoalsArr || [])) {
            const min = parseInt(g.minuto, 10) || 45;
            let key = "0'-15'";
            if (min > 75) key = "75'-90'";
            else if (min > 60) key = "60'-75'";
            else if (min > 45) key = "45'-60'";
            else if (min > 30) key = "30'-45'";
            else if (min > 15) key = "15'-30'";
            buckets[key].scored++;

            if (g.tipo_gol === '101') penaltyGoals++;
            else areaGoals++;
          }

          // Process goals conceded
          for (const g of (rivalGoalsArr || [])) {
            const min = parseInt(g.minuto, 10) || 45;
            let key = "0'-15'";
            if (min > 75) key = "75'-90'";
            else if (min > 60) key = "60'-75'";
            else if (min > 45) key = "45'-60'";
            else if (min > 30) key = "30'-45'";
            else if (min > 15) key = "15'-30'";
            buckets[key].conceded++;
          }
        }
      } catch (e: any) {
        // Fallback gracefully
      }
    }
  }

  // Get top scorers from convocatorias
  const matchIds = finishedMatches.map((m: any) => m.id);
  const pichichis: { name: string; goals: number; dorsal?: number }[] = [];

  if (matchIds.length > 0) {
    const { data: convs } = await supabase
      .from('convocatorias')
      .select('player_id, goals, player:players(first_name, last_name, dorsal)')
      .in('partido_id', matchIds)
      .gt('goals', 0);

    const goalMap = new Map<string, { name: string; goals: number; dorsal?: number }>();
    (convs || []).forEach((c: any) => {
      const p = c.player;
      if (!p) return;
      const name = `${p.first_name} ${p.last_name || ''}`.trim();
      const current = goalMap.get(c.player_id) || { name, goals: 0, dorsal: p.dorsal };
      current.goals += Number(c.goals) || 0;
      goalMap.set(c.player_id, current);
    });

    pichichis.push(...Array.from(goalMap.values()).sort((a, b) => b.goals - a.goals));
  }

  const timeIntervals: TimeIntervalStat[] = Object.entries(buckets).map(([interval, v]) => ({
    interval,
    scored: v.scored,
    conceded: v.conceded
  }));

  const goalTypes: GoalTypeStat[] = [];
  const sumTypes = (areaGoals + penaltyGoals) || totalScored || 1;
  if (areaGoals > 0 || penaltyGoals === 0) {
    goalTypes.push({
      type: 'Dentro del área',
      count: areaGoals || totalScored,
      percentage: Math.round(((areaGoals || totalScored) / sumTypes) * 100)
    });
  }
  if (penaltyGoals > 0) {
    goalTypes.push({
      type: 'Penalti',
      count: penaltyGoals,
      percentage: Math.round((penaltyGoals / sumTypes) * 100)
    });
  }

  return {
    teamId: team.id,
    teamName: team.name,
    isBrave: false,
    totalMatches: finishedMatches.length,
    totalScored,
    totalConceded,
    timeIntervals,
    goalTypes,
    topDuplas: [],
    pichichis,
    asistentes: []
  };
}

/**
 * Retrieves motivational badges and achievements for a player
 */
export async function getPlayerAchievements(playerId: string): Promise<PlayerAchievementBadge[]> {
  const cached = playerBadgesCache.get(playerId);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const supabase = createAdminClient();

  // 1. Get player info and player team
  const { data: player } = await supabase
    .from('players')
    .select('id, first_name, last_name, dorsal, posicion, team_id, team:teams(id, name, category, ffcv_team_id, ffcv_url)')
    .eq('id', playerId)
    .single();

  if (!player) return [];

  // 2. Query player's convocatorias in finished matches
  const { data: convocatorias } = await supabase
    .from('convocatorias')
    .select('id, partido_id, goals, yellow_cards, red_cards, status, titular, minutes_played, partido:partidos!inner(id, fecha_hora, rival_nombre, resultado_propio, resultado_rival, estado)')
    .eq('player_id', playerId)
    .eq('partido.estado', 'Finalizado');

  const convs = convocatorias || [];
  const badges: PlayerAchievementBadge[] = [];

  const totalGoals = convs.reduce((acc, c) => acc + (Number(c.goals) || 0), 0);
  const totalMatches = convs.filter(c => c.status === 'convocado' || (Number(c.minutes_played) || 0) > 0).length;
  const titularMatches = convs.filter(c => c.titular).length;

  const getPartido = (p: any): { id?: string; fecha_hora?: string; rival_nombre?: string; resultado_propio?: number; resultado_rival?: number; estado?: string } | null => {
    if (!p) return null;
    return Array.isArray(p) ? p[0] : p;
  };

  // Badge 1: Primer Gol de la Temporada
  if (totalGoals > 0) {
    const firstGoalConv = convs.find(c => Number(c.goals) > 0);
    const partido = getPartido(firstGoalConv?.partido);
    const rival = partido?.rival_nombre ? `vs ${partido.rival_nombre}` : 'en partido oficial';
    badges.push({
      id: 'first-goal',
      title: 'Goleador Oficial',
      subtitle: `${totalGoals} ${totalGoals === 1 ? 'gol anotado' : 'goles anotados'}`,
      icon: 'goal',
      badgeColor: 'amber',
      unlockedAt: partido?.fecha_hora ? new Date(partido.fecha_hora).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : undefined,
      description: `Inauguró su casillero goleador oficial ${rival}.`
    });
  }

  // Badge 2: Doblete o Hat-Trick
  const hatTrickMatch = convs.find(c => Number(c.goals) >= 3);
  const braceMatch = convs.find(c => Number(c.goals) === 2);

  if (hatTrickMatch) {
    const partido = getPartido(hatTrickMatch.partido);
    badges.push({
      id: 'hat-trick',
      title: 'Hat-Trick Hero',
      subtitle: '3+ goles en un encuentro',
      icon: 'hattrick',
      badgeColor: 'purple',
      unlockedAt: partido?.fecha_hora ? new Date(partido.fecha_hora).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : undefined,
      description: `Actuación estelar con triplete frente a ${partido?.rival_nombre || 'el rival'}.`
    });
  } else if (braceMatch) {
    const partido = getPartido(braceMatch.partido);
    badges.push({
      id: 'brace',
      title: 'Doblete Imparable',
      subtitle: '2 goles en el mismo partido',
      icon: 'hattrick',
      badgeColor: 'blue',
      unlockedAt: partido?.fecha_hora ? new Date(partido.fecha_hora).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : undefined,
      description: `Demostró pegada marcando por partida doble ante ${partido?.rival_nombre || 'el rival'}.`
    });
  }

  // Badge 3: Portería a Cero (Porteros o defensas)
  const pos = (player.posicion || '').toLowerCase();
  const isGoalkeeper = pos.includes('porter') || pos.includes('goalkeeper');
  const cleanSheetMatch = convs.find(c => {
    const p = getPartido(c.partido);
    return p && Number(p.resultado_rival) === 0 && (Number(c.minutes_played) || 0) >= 30;
  });

  if (cleanSheetMatch && isGoalkeeper) {
    const partido = getPartido(cleanSheetMatch.partido);
    badges.push({
      id: 'clean-sheet',
      title: 'Muro Infranqueable',
      subtitle: 'Portería a cero',
      icon: 'shield',
      badgeColor: 'emerald',
      unlockedAt: partido?.fecha_hora ? new Date(partido.fecha_hora).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }) : undefined,
      description: `Mantuvo el cerrojo defensivo y la portería a cero ante ${partido?.rival_nombre || 'el rival'}.`
    });
  }

  // Badge 4: Titular / Pilar de la Plantilla
  if (totalMatches >= 3 && titularMatches / totalMatches >= 0.7) {
    badges.push({
      id: 'starter',
      title: 'Titular Indiscutible',
      subtitle: `${titularMatches} titularidades`,
      icon: 'regular',
      badgeColor: 'blue',
      description: 'Presencia constante en el once inicial del cuerpo técnico.'
    });
  } else if (totalMatches >= 5) {
    badges.push({
      id: 'veteran',
      title: 'Compromiso Total',
      subtitle: `${totalMatches} partidos jugados`,
      icon: 'regular',
      badgeColor: 'emerald',
      description: 'Regularidad y asistencia continua a los compromisos del club.'
    });
  }

  // Si no tiene ningún logro aún, dar insignia de bienvenida
  if (badges.length === 0) {
    badges.push({
      id: 'debut',
      title: 'En Crecimiento',
      subtitle: 'Temporada 26/27',
      icon: 'regular',
      badgeColor: 'emerald',
      description: 'Preparado para desbloquear sus primeras medallas e hitos deportivos.'
    });
  }

  playerBadgesCache.set(playerId, { data: badges, timestamp: now });
  return badges;
}
