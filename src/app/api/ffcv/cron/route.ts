import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { syncAllConfiguredFFCVTeams, syncRecentlyFinishedMatches } from '@/lib/ffcv/sync';
import { injectApuntameloCache } from '@/lib/apuntamelo/sync';
import { scheduleUpcomingMatchesPostSync } from '@/lib/ffcv/post-match-scheduler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds on Vercel Pro if needed

function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const expected = Buffer.from(`Bearer ${cronSecret}`, 'utf8');
  const provided = Buffer.from(authHeader, 'utf8');
  if (expected.length !== provided.length) return false;

  return crypto.timingSafeEqual(expected, provided);
}

export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
        { status: 401 }
      );
    }

    if (req.method === 'POST') {
      try {
        const body = await req.json();
        if (body && body.apuntameloCache && typeof body.apuntameloCache === 'object') {
          injectApuntameloCache(body.apuntameloCache);
          console.log('[FFCV Cron] Injected pre-fetched Apúntamelo cache keys:', Object.keys(body.apuntameloCache).length);
        }
      } catch {
        // Empty or non-JSON POST body is valid
      }
    }

    const syncAllMatchdays = req.nextUrl.searchParams.get('all') === 'true';
    const braveOnly = req.nextUrl.searchParams.get('braveOnly') === 'true';
    const specificMatchdayParam = req.nextUrl.searchParams.get('jornada');
    const specificMatchday = specificMatchdayParam ? Number(specificMatchdayParam) : undefined;

    // 1. Prioridad: Evaluar partidos que finalizaron hace ~1 hora (post-partido), salvo en modo braveOnly
    let postMatchResult = null;
    if (!braveOnly) {
      console.log('[FFCV Cron] Checking for recently finished matches (post-match window)...');
      try {
        postMatchResult = await syncRecentlyFinishedMatches(undefined, { skipPropagation: true });
        if (postMatchResult.teamsSynced.length > 0) {
          console.log('[FFCV Cron] Post-match sync triggered for teams:', postMatchResult.teamsSynced);
        }
      } catch (pmErr: any) {
        console.warn('[FFCV Cron] Non-fatal error during post-match check:', pmErr.message);
      }
    }

    // 2. Sincronización rutinaria programada de grupos activos (o solo Liga Brave si braveOnly=true)
    console.log(`[FFCV Cron] Starting scheduled batch synchronization (braveOnly=${braveOnly})...`);
    const result = await syncAllConfiguredFFCVTeams({
      syncAllMatchdays,
      specificMatchday,
      braveOnly
    });

    // 3. Programar en QStash los disparos post-partido (+30m y +90m) para los próximos 7 días
    let qstashScheduleResult = null;
    if (!braveOnly) {
      try {
        qstashScheduleResult = await scheduleUpcomingMatchesPostSync();
      } catch (qsErr: any) {
        console.warn('[FFCV Cron] Non-fatal error scheduling QStash post-match syncs:', qsErr.message);
      }
    }

    console.log(
      '[FFCV Cron] Completed. Groups processed:',
      result.groupsProcessed,
      'Success:',
      result.groupsSuccess,
      'Failed:',
      result.groupsFailed
    );

    return NextResponse.json({
      success: result.success,
      timestamp: result.timestamp,
      postMatchResult,
      qstashScheduleResult,
      result
    });
  } catch (err: any) {
    console.error('[FFCV Cron] Error during synchronization:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error in FFCV cron' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
