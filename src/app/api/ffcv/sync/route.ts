import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncGroupFFCV, syncTeamFFCV } from '@/lib/ffcv/sync';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { teamId, seasonId, competitionId, groupId, competitionName, groupName, syncAllMatchdays, specificMatchday } = body;

    // Case 1: Synchronize via teamId
    if (teamId) {
      const result = await syncTeamFFCV(teamId, {
        syncAllMatchdays: !!syncAllMatchdays,
        specificMatchday: specificMatchday !== undefined ? Number(specificMatchday) : undefined
      });
      return NextResponse.json({ success: true, result });
    }

    // Case 2: Synchronize via direct FFCV group coordinates
    if (seasonId && competitionId && groupId) {
      const result = await syncGroupFFCV({
        seasonId: String(seasonId),
        competitionId: String(competitionId),
        groupId: String(groupId),
        competitionName: competitionName ? String(competitionName) : undefined,
        groupName: groupName ? String(groupName) : undefined,
        syncAllMatchdays: !!syncAllMatchdays,
        specificMatchday: specificMatchday !== undefined ? Number(specificMatchday) : undefined
      });
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json(
      { success: false, error: 'Missing parameters: Provide either teamId or (seasonId, competitionId, groupId)' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[FFCV Sync Route] Error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
