import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NotificationService } from '@/lib/notifications/notification-service';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const adminClient = await createAdminClient();

    // Comprobar si el usuario tiene al menos una suscripción activa
    const { data: subs, error: subError } = await adminClient
      .from('push_subscriptions')
      .select('id, endpoint')
      .eq('user_id', user.id);

    if (subError || !subs || subs.length === 0) {
      return NextResponse.json(
        {
          error: 'No hay ningún dispositivo suscrito a Notificaciones Push para este usuario. Activa las notificaciones primero en este dispositivo.',
        },
        { status: 400 }
      );
    }

    // Despachar notificación de prueba a través de NotificationService
    const result = await NotificationService.dispatch({
      userId: user.id,
      userEmail: user.email,
      type: 'GENERAL_ALERT',
      title: '🔔 Sporting Saladar - Notificación de prueba',
      content: '¡Excelente! Tu móvil está listo para recibir avisos de partidos, eventos y cambios de última hora en segundo plano.',
      link: '/dashboard',
      channels: ['PUSH', 'IN_APP'],
      idempotencyKey: `test_push:${user.id}:${Date.now()}`,
    });

    const pushChannelResult = result.channels.find((c) => c.channel === 'PUSH');

    if (pushChannelResult?.status === 'SENT') {
      return NextResponse.json({
        success: true,
        message: 'Notificación de prueba enviada a tus dispositivos suscritos.',
        details: pushChannelResult,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: pushChannelResult?.error || 'No se pudo entregar la notificación push.',
          details: pushChannelResult,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('[API /api/push/test Exception]:', error);
    return NextResponse.json(
      { error: error.message || 'Error interno al enviar prueba push' },
      { status: 500 }
    );
  }
}
