import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  try {
    // 1. Validar autenticación de usuario
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // 2. Parsear y validar el endpoint
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de petición inválido (JSON requerido)' }, { status: 400 });
    }

    const { endpoint } = body || {};

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'Campo endpoint requerido' }, { status: 400 });
    }

    // 3. Eliminar exclusivamente la suscripción del usuario autenticado
    const adminClient = await createAdminClient();

    const { error: deleteError } = await adminClient
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('[API /api/push/unsubscribe DB Error]:', deleteError);
      return NextResponse.json({ error: 'Error eliminando la suscripción' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /api/push/unsubscribe Exception]:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
