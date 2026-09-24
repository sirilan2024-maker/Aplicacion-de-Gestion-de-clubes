import { NextResponse } from 'next/server';
import { getAuthenticatedContext } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const { context: ctx } = await getAuthenticatedContext();
    if (!ctx || !ctx.isImpersonating) {
      return NextResponse.json({ isImpersonating: false });
    }

    return NextResponse.json({
      isImpersonating: true,
      impersonatedId: ctx.profile.id,
      impersonatedName: ctx.impersonatedName || `${ctx.profile.first_name || ''} ${ctx.profile.last_name || ''}`.trim() || 'Usuario del Club',
      impersonatedRole: ctx.impersonatedRole || ctx.profile.role || 'familia',
    });
  } catch (err) {
    return NextResponse.json({ isImpersonating: false });
  }
}
