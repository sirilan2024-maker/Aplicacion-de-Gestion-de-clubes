import { NextResponse } from 'next/server';
import { seedFormativeEvaluationData } from '@/lib/formative-seed';

export async function GET() {
  const result = await seedFormativeEvaluationData();
  return NextResponse.json(result);
}
