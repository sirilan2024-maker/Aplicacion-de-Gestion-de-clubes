import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Inicializar Stripe solo si existe la clave (para evitar fallos si no está configurada)
import Stripe from 'stripe';
const stripeKey = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_123';
const stripe = new Stripe(stripeKey, {
  apiVersion: '2023-10-16' as any,
});

export async function POST(request: Request) {
  try {
    const data = await request.json();
    // Usamos admin client para ignorar RLS ya que es un endpoint público
    const supabaseAdmin = await createAdminClient();

    // 1. Obtener el club_id base
    const { data: clubData } = await supabaseAdmin.from('clubs').select('id').limit(1).single();
    const clubId = clubData?.id;

    if (!clubId) {
      return NextResponse.json({ error: 'Club no encontrado' }, { status: 400 });
    }

    // 2. Extraer parámetros base para evitar anidación excesiva
    const { teamId, paymentMethod, paymentPlan, ...formData } = data;

    let stripeIntentId = null;
    let paymentStatus = 'PENDING';

    // 3. Procesar pagos con Stripe
    if (paymentMethod === 'Stripe') {
      const isFraccionado = paymentPlan === 'Fraccionado';
      // Cuota simulada basada en si estuvo o reservó (idealmente esto se valida en servidor, pero usaremos el form para el mock)
      const isRenewal = formData.wasInClub;
      const isReserved = formData.paidReservation;
      let totalAmount = 250;
      if (isRenewal) totalAmount = 195;
      if (isRenewal && isReserved) totalAmount = 145;

      const chargeAmount = isFraccionado ? Math.round((totalAmount / 2) * 100) : totalAmount * 100; // en céntimos

      if (process.env.STRIPE_SECRET_KEY) {
        // MODO REAL: Claves configuradas
        if (isFraccionado) {
          // SetupIntent para guardar tarjeta + cobrar primera cuota inmediata
          // En la práctica, se suele hacer un PaymentIntent con setup_future_usage
          const intent = await stripe.paymentIntents.create({
            amount: chargeAmount,
            currency: 'eur',
            setup_future_usage: 'off_session',
            metadata: {
              player: `${formData.playerFirstName} ${formData.playerLastName}`,
              type: 'inscripcion_fraccionada_1',
            },
          });
          stripeIntentId = intent.id;
        } else {
          // Pago Total
          const intent = await stripe.paymentIntents.create({
            amount: chargeAmount,
            currency: 'eur',
            metadata: {
              player: `${formData.playerFirstName} ${formData.playerLastName}`,
              type: 'inscripcion_total',
            },
          });
          stripeIntentId = intent.id;
        }
      } else {
        // MODO SIMULACIÓN LOCAL: Sin claves
        stripeIntentId = `pi_mock_${Date.now()}`;
        paymentStatus = 'SUCCESS_MOCK'; // Simulamos éxito directo
      }
    }

    // 4. Guardar en Base de Datos (Tabla 'registrations')
    const { data: registration, error } = await supabaseAdmin
      .from('registrations')
      .insert({
        club_id: clubId,
        team_id: teamId || null,
        status: 'PENDING_VALIDATION',
        form_data: formData, // Todo el resto del JSON
        payment_method: paymentMethod || 'Desconocido',
        payment_plan: paymentPlan || 'Total',
        payment_status: paymentStatus,
        stripe_payment_intent_id: stripeIntentId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error insertando registration:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5. Responder con el intent para el frontend si usara Stripe Elements Real
    return NextResponse.json({
      success: true,
      registrationId: registration.id,
      clientSecret: stripeIntentId ? `${stripeIntentId}_secret_mock` : null,
      message: 'Inscripción guardada correctamente en Secretaría.',
    });
  } catch (err: any) {
    console.error('API /register error:', err);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
