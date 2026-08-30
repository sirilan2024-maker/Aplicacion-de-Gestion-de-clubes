import { NextResponse } from 'next/server';
import { seedFormativeEvaluationData } from '@/lib/formative-seed';
import { getAuthenticatedContext, ADMIN_ROLES } from '@/lib/auth-helpers';

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint de desarrollo no disponible en producción' }, { status: 403 });
  }

  const { context, error: authError } = await getAuthenticatedContext();
  if (!context || authError || !ADMIN_ROLES.includes(context.profile.role)) {
    return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 });
  }

  const result = await seedFormativeEvaluationData();
  return NextResponse.json(result);
}

