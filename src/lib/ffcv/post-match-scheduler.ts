import { createAdminClient } from '../supabase/admin';
import { getOfficialMatchDuration } from '../utils';
import { publishDelayedQStashWebhook } from '../performance/qstash-service';
import { isApuntameloTeam } from '../apuntamelo/sync';

const GITHUB_REPO = process.env.GITHUB_SYNC_REPO || 'sirilan2024-maker/Aplicacion-de-Gestion-de-clubes';
const GITHUB_WORKFLOW_FILE = 'ffcv-sync-cron.yml';
const GITHUB_REF = process.env.GITHUB_SYNC_REF || 'main';
const MAX_QSTASH_DELAY_SECONDS = 7 * 24 * 3600 - 300; // Margen de seguridad bajo los 7 días del plan gratuito

function getPostMatchWebhookUrl(): string {
  const configured = process.env.QSTASH_POST_MATCH_URL?.trim();
  if (configured) return configured;
  // Priorizar siempre el dominio canónico de producción (app.clubsportingsaladar.com)
  // sobre VERCEL_URL, ya que los dominios de despliegue de Vercel (*.vercel.app) tienen activada
  // la protección de despliegue (Vercel Deployment Protection) y rechazan las peticiones entrantes de QStash con 401.
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    'https://app.clubsportingsaladar.com';
  return `${baseUrl.replace(/\/$/, '')}/api/ffcv/post-match`;
}

/**
 * Dispara el workflow de GitHub Actions en modo `brave_only` para saltar Cloudflare
 * al sincronizar equipos de Liga Brave (Infantil B / Cadete B).
 */
export async function triggerBraveGitHubWorkflow(reason: string = 'post-match'): Promise<{
  triggered: boolean;
  reason?: string;
  error?: string;
}> {
  const token = (process.env.GITHUB_ACTIONS_TOKEN || '')
    .trim()
    .split(/\r?\n/)[0]
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .trim();
  if (!token) {
    return {
      triggered: false,
      error: 'GITHUB_ACTIONS_TOKEN no configurado en las variables de entorno'
    };
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/${GITHUB_WORKFLOW_FILE}/dispatches`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref: GITHUB_REF,
        inputs: {
          mode: 'brave_only'
        }
      })
    });

    if (res.status === 204 || res.ok) {
      console.log(`[GitHubDispatch] Workflow ${GITHUB_WORKFLOW_FILE} lanzado (brave_only, motivo: ${reason})`);
      return { triggered: true, reason };
    }

    const bodyText = await res.text().catch(() => '');
    return {
      triggered: false,
      error: `GitHub API respondió ${res.status}: ${bodyText}`
    };
  } catch (err: any) {
    return {
      triggered: false,
      error: err?.message || 'Error al conectar con GitHub Actions API'
    };
  }
}

/**
 * Programa en Upstash QStash 2 disparos post-partido (+30 min y +90 min tras el final oficial)
 * para todos los partidos de la temporada activa dentro de los próximos 7 días.
 * Evita crones horarios ciegos durante los fines de semana.
 */
export async function scheduleUpcomingMatchesPostSync(customSupabaseClient?: any): Promise<{
  matchesEvaluated: number;
  webhooksScheduled: number;
  errors: string[];
}> {
  const supabase = customSupabaseClient || createAdminClient();
  const errors: string[] = [];
  let webhooksScheduled = 0;

  // Sin QSTASH_TOKEN en producción no intentamos programar para no ensuciar logs
  if (process.env.NODE_ENV === 'production' && !process.env.QSTASH_TOKEN?.trim()) {
    return { matchesEvaluated: 0, webhooksScheduled: 0, errors: ['QSTASH_TOKEN no configurado'] };
  }

  const { data: activeSeason } = await supabase
    .from('seasons')
    .select('id')
    .eq('is_active', true)
    .single();

  if (!activeSeason) {
    return { matchesEvaluated: 0, webhooksScheduled: 0, errors: ['No active season found'] };
  }

  const nowMs = Date.now();
  const windowStartIso = new Date(nowMs - 3 * 60 * 60 * 1000).toISOString();
  const windowEndIso = new Date(nowMs + MAX_QSTASH_DELAY_SECONDS * 1000).toISOString();

  const { data: upcomingMatches, error: mErr } = await supabase
    .from('partidos')
    .select(`
      id, fecha_hora, estado, equipo_id,
      team:teams!inner ( id, name, ffcv_group_id, ffcv_season_id, ffcv_competition_id, ffcv_url )
    `)
    .eq('season_id', activeSeason.id)
    .not('estado', 'in', '(Finalizado,Aplazado,Suspendido)')
    .gte('fecha_hora', windowStartIso)
    .lte('fecha_hora', windowEndIso);

  if (mErr) {
    return { matchesEvaluated: 0, webhooksScheduled: 0, errors: [mErr.message] };
  }

  const matches = upcomingMatches || [];
  const webhookUrl = getPostMatchWebhookUrl();
  const nowEpoch = Math.floor(nowMs / 1000);

  for (const m of matches) {
    const team = (m as any).team;
    if (!m.fecha_hora || !team) continue;
    // Solo equipos configurados con FFCV o Liga Brave
    if (!team.ffcv_group_id && !isApuntameloTeam(team)) continue;

    const startMs = new Date(m.fecha_hora).getTime();
    if (isNaN(startMs)) continue;

    const isBrave = isApuntameloTeam(team);
    const durationMinutes = getOfficialMatchDuration(team.name, isBrave ? 'Liga Brave' : undefined);
    const breakMinutes = 15;
    const matchEndMs = startMs + (durationMinutes + breakMinutes) * 60 * 1000;

    // Planificación de disparos:
    // - Para Liga Brave (Apúntamelo): incluye arranque en minuto 0 para pasar a 'En Curso',
    //   descanso para goles intermedios y 2 post-partido para cierre.
    // - Para FFCV oficial: 2 disparos post-partido (+30 min y +90 min) para actas oficiales.
    const schedules: Array<{ attempt: string | number; targetMs: number }> = isBrave
      ? [
          { attempt: 'start', targetMs: startMs },
          { attempt: 'half', targetMs: startMs + Math.round(durationMinutes / 2 + 5) * 60 * 1000 },
          { attempt: 1, targetMs: matchEndMs + 10 * 60 * 1000 },
          { attempt: 2, targetMs: matchEndMs + 45 * 60 * 1000 }
        ]
      : [
          { attempt: 1, targetMs: matchEndMs + 30 * 60 * 1000 },
          { attempt: 2, targetMs: matchEndMs + 90 * 60 * 1000 }
        ];

    for (const { attempt, targetMs } of schedules) {
      const targetEpoch = Math.floor(targetMs / 1000);
      const delaySeconds = targetEpoch - nowEpoch;

      // Solo programar si está en el futuro (>= 60s) y dentro del límite de 7 días de QStash
      if (delaySeconds < 60 || delaySeconds > MAX_QSTASH_DELAY_SECONDS) continue;

      const res = await publishDelayedQStashWebhook({
        destinationUrl: webhookUrl,
        payload: {
          partidoId: m.id,
          teamId: team.id,
          attempt,
          isBrave
        },
        notBeforeEpochSeconds: targetEpoch,
        deduplicationId: `pm_${m.id}_a${attempt}_${targetEpoch}`
      });

      if (res.success) {
        webhooksScheduled++;
      } else if (res.error) {
        errors.push(`Partido ${m.id} (intento ${attempt}): ${res.error}`);
      }
    }
  }

  return {
    matchesEvaluated: matches.length,
    webhooksScheduled,
    errors
  };
}
