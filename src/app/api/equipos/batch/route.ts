'use server';

import { createMultipleTeams } from '@/lib/club-actions';
import { NextResponse } from 'next/server';

type TeamInput = {
  name: string;
  category: string;
  color?: string;
};

export async function POST(request: Request) {
  try {
    const { teams } = (await request.json()) as { teams: TeamInput[] };
    if (!Array.isArray(teams) || teams.length === 0) {
      return NextResponse.json({ success: false, error: 'No teams provided' }, { status: 400 });
    }
    const result = await createMultipleTeams(teams);
    if (result.success) {
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  } catch (err) {
    console.error('[BatchCreateTeams] error:', err);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
