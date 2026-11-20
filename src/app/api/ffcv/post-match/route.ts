import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncRecentlyFinishedMatches, syncTeamFFCV } from '@/lib/ffcv/sync';
import { isApuntameloTeam } from '@/lib/apuntamelo/sync';
import { triggerBraveGitHubWorkflow } from '@/lib/ffcv/post-match-scheduler';
import { verifyQStashSignature } from '@/lib/performance/qstash-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

function verifyCronSecret(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) return false;

  const authHeader = req.headers.get('authorization');
  if (!authHeader) return false;

  const expected = Buffer.from(`Bearer ${cronSecret}`, 'utf8');
  const provided = Buffer.from(authHeader, 'utf8');
  if (expected.length !== provided.length) return false;

  return crypto.timingSafeEqual(expected, provided);
}

async function handlePostMatchRequest(req: NextRequest) {
  const rawBody = req.method === 'POST' ? await req.text() : '';
  const qstashSig = req.headers.get('upstash-signature') || req.headers.get('Upstash-Signature');

  if (qstashSig) {
    const verification = await verifyQStashSignature({
      signature: qstashSig,
      body: rawBody,
      url: req.url
    });
    if (!verification.isValid) {
      return NextResponse.json(
        { success: false, error: `Firma QStash inválida: ${verification.reason}` },
        { status: 401 }
      );
    }
  } else if (!verifyCronSecret(req)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  let bodyJson: any = null;
  if (rawBody) {
    try {
      bodyJson = JSON.parse(rawBody);
    } catch {
      bodyJson = null;
    }
  }

  const partidoId = bodyJson?.partidoId || req.nextUrl.searchParams.get('partidoId');

  // Modo puntual dirigido por QStash para un partido concreto
  if (partidoId) {
    const supabase = createAdminClient();
    const { data: partido, error: pErr } = await supabase
      .from('partidos')
      .select(`
        id, estado, resultado_propio, resultado_rival, equipo_id,
        team:teams!inner ( id, name, ffcv_group_id, ffcv_team_id, ffcv_url )
      `)
      .eq('id', partidoId)
      .single();

    if (pErr || !partido) {
      return NextResponse.json({
        success: true,
        skipped: 'match_not_found',
        partidoId
      });
    }

    // Si el 1er intento ya cerró el partido con resultado, el 2º intento no consume recursos
    if (partido.estado === 'Finalizado' && partido.resultado_propio !== null) {
      return NextResponse.json({
        success: true,
        skipped: 'already_finalized',
        partidoId,
        attempt: bodyJson?.attempt || 1
      });
    }

    const team = (partido as any).team;
    if (isApuntameloTeam(team)) {
      const dispatchRes = await triggerBraveGitHubWorkflow(`post-match:${partidoId}:a${bodyJson?.attempt || 1}`);
      return NextResponse.json({
        success: dispatchRes.triggered,
        mode: 'liga_brave_github_dispatch',
        partidoId,
        teamName: team.name,
        dispatchRes
      });
    }

    const syncRes = await syncTeamFFCV(team.id, { syncAllMatchdays: false }, supabase);
    return NextResponse.json({
      success: syncRes.success,
      mode: 'ffcv_direct',
      partidoId,
      teamName: team.name,
      result: syncRes
    });
  }

  // Modo general fallback (sin partidoId)
  const result = await syncRecentlyFinishedMatches();
  return NextResponse.json({
    success: result.success,
    timestamp: new Date().toISOString(),
    result
  });
}

export async function GET(req: NextRequest) {
  try {
    return await handlePostMatchRequest(req);
  } catch (err: any) {
    console.error('[Post-Match Route] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
