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

    // 2. Parsear y validar el cuerpo de la petición
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Cuerpo de petición inválido (JSON requerido)' }, { status: 400 });
    }

    const { endpoint, keys } = body || {};

    if (!endpoint || typeof endpoint !== 'string' || !endpoint.startsWith('https://') || endpoint.length > 2048) {
      return NextResponse.json({ error: 'Campo endpoint inválido o ausente' }, { status: 400 });
    }

    if (!keys || typeof keys !== 'object') {
      return NextResponse.json({ error: 'Objeto keys inválido o ausente' }, { status: 400 });
    }

    const { p256dh, auth } = keys;

    if (!p256dh || typeof p256dh !== 'string' || p256dh.length > 512) {
      return NextResponse.json({ error: 'Clave p256dh inválida o ausente' }, { status: 400 });
    }

    if (!auth || typeof auth !== 'string' || auth.length > 512) {
      return NextResponse.json({ error: 'Clave auth inválida o ausente' }, { status: 400 });
    }

    // 3. Extraer User-Agent real de las cabeceras HTTP
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // 4. Upsert idempotente en public.push_subscriptions
    // El user_id procede estrictamente de la sesión autenticada (user.id)
    const adminClient = await createAdminClient();

    const { data, error: dbError } = await adminClient
      .from('push_subscriptions')
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'endpoint' }
      )
      .select('id, created_at, updated_at')
      .single();

    if (dbError) {
      console.error('[API /api/push/subscribe DB Error]:', dbError);
      return NextResponse.json({ error: 'Error guardando suscripción en base de datos' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subscriptionId: data?.id,
      updatedAt: data?.updated_at,
    });
  } catch (error: any) {
    console.error('[API /api/push/subscribe Exception]:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
