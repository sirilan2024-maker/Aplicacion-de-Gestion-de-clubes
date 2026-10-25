import { NextRequest, NextResponse } from 'next/server';
import { syncAllConfiguredFFCVTeams, syncRecentlyFinishedMatches } from '@/lib/ffcv/sync';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60 seconds on Vercel Pro if needed

function verifyCronAuth(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  
  // If CRON_SECRET is configured, enforce authorization
  if (cronSecret) {
    const authHeader = req.headers.get('authorization');
    if (authHeader === `Bearer ${cronSecret}`) {
      return true;
    }
    const querySecret = req.nextUrl.searchParams.get('secret');
    if (querySecret === cronSecret) {
      return true;
    }
    return false;
  }

  // By default allow invocation from automated schedulers (GitHub Actions, Vercel, pg_cron)
  return true;
}

export async function GET(req: NextRequest) {
  try {
    if (!verifyCronAuth(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid or missing CRON_SECRET' },
        { status: 401 }
      );
    }

    const syncAllMatchdays = req.nextUrl.searchParams.get('all') === 'true';
    const specificMatchdayParam = req.nextUrl.searchParams.get('jornada');
    const specificMatchday = specificMatchdayParam ? Number(specificMatchdayParam) : undefined;

    // 1. Prioridad: Evaluar partidos que finalizaron hace ~1 hora (post-partido)
    console.log('[FFCV Cron] Checking for recently finished matches (post-match window)...');
    let postMatchResult = null;
    try {
      postMatchResult = await syncRecentlyFinishedMatches();
      if (postMatchResult.teamsSynced.length > 0) {
        console.log('[FFCV Cron] Post-match sync triggered for teams:', postMatchResult.teamsSynced);
      }
    } catch (pmErr: any) {
      console.warn('[FFCV Cron] Non-fatal error during post-match check:', pmErr.message);
    }

    // 2. Sincronización rutinaria programada de grupos activos
    console.log('[FFCV Cron] Starting scheduled batch synchronization...');
    const result = await syncAllConfiguredFFCVTeams({
      syncAllMatchdays,
      specificMatchday
    });

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
