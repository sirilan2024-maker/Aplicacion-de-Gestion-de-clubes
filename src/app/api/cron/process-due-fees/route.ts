import { NextRequest, NextResponse } from 'next/server';
import { processAllDueFractionalFees } from '@/lib/payments/stripe-automatic-fee-service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const summary = await processAllDueFractionalFees({ limit: 50 });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        processed: summary.processed,
        succeeded: summary.succeeded,
        requiresAction: summary.requiresAction,
        failed: summary.failed,
        skipped: summary.skipped,
      },
    });
  } catch (err: any) {
    console.error('[cron/process-due-fees] Execution error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
