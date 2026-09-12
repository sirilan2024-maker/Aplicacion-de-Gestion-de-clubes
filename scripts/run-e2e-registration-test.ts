import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { POST } from '@/app/api/register/route';
import { createAdminClient } from '@/lib/supabase/server';
import { SafeE2EExecutionTracker, assertSafeE2ETestEmail } from '@/lib/e2e-safety';

async function main() {
  console.log('=== [E2E_SAFETY] INICIO PRUEBA E2E BLINDADA: INSCRIPCIÓN AISLADA ===\n');

  const supabaseAdmin = await createAdminClient();

  // 1. Inicializar el rastreador de ejecución segura (Genera email RFC 2606 aislado @example.invalid)
  const tracker = new SafeE2EExecutionTracker('reg-test');
  const isolatedTestEmail = tracker.testIdentityEmail;

  console.log(`[E2E_SAFETY] Identidad E2E generada para esta ejecución: ${isolatedTestEmail}`);
  console.log(`[E2E_SAFETY] ID de ejecución: ${tracker.executionId}`);

  // Validar inmediatamente con el guard de seguridad
  assertSafeE2ETestEmail(isolatedTestEmail);

  // 2. Pre-verificación estricta: Si ya existe en la base de datos, ABORTAR
  console.log('1. Verificando que la identidad de prueba no colisione con registros existentes...');
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, email, role')
    .eq('email', isolatedTestEmail)
    .maybeSingle();

  if (existingProfile) {
    throw new Error(
      `[E2E_SAFETY_ABORT] La identidad generada "${isolatedTestEmail}" ya existe en profiles (ID: ${existingProfile.id}). Abortando para no sobrescribir nada.`
    );
  }

  // 3. Email de notificación real opcional (solo como destinatario si se requiere probar Resend)
  const emailForDelivery = process.env.E2E_EMAIL_RECIPIENT || isolatedTestEmail;
  if (process.env.E2E_EMAIL_RECIPIENT) {
    console.log(`[E2E_SAFETY] Nota: Envío de Resend redirigido a destinatario de prueba: ${emailForDelivery}`);
  }

  // 4. Construir payload de inscripción TEST
  console.log('2. Preparando payload de inscripción E2E seguro...');
  const registrationPayload = {
    playerFirstName: 'E2E_TEST_PLAYER',
    playerLastName: 'VERIFIED',
    birthDate: '2014-06-10',
    playerDni: '00000000T',
    playerSip: '000000000',
    nationality: 'Española',
    address: 'Calle E2E Test 123',
    city: 'Gandía',
    postalCode: '46700',
    
    tutor1Name: 'E2E Test Tutor',
    tutor1LastName: 'Isolated',
    tutor1Email: isolatedTestEmail,
    tutor1Phone: '+34600000000',
    tutor1Dni: '99999999X',
    password: 'E2ETestPassword2026!',
    confirmPassword: 'E2ETestPassword2026!',
    
    category: 'Infantil B',
    sportPosicionPrincipal: 'Centrocampista',
    
    paymentMethod: 'Transferencia',
    paymentPlan: 'Fraccionado',
    wasInClub: false,
    paidReservation: false,
    
    consentRgpd: true,
    consentTutela: true,
    consentMedical: true,
    consentImage: true,
  };

  const req = new Request('http://localhost:3000/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(registrationPayload),
  });

  // 5. Ejecutar la llamada a /api/register
  console.log('3. Ejecutando POST /api/register con identidad aislada...');
  const response = await POST(req);
  const result = await response.json();

  console.log('Respuesta de /api/register:', JSON.stringify(result, null, 2));

  if (!result.success || !result.playerId) {
    throw new Error(`[E2E_ERROR] La inscripción E2E falló: ${JSON.stringify(result)}`);
  }

  const playerId = result.playerId;
  tracker.registerPlayer(playerId);
  console.log(`\n4. Inscripción creada con éxito. Player ID rastreado: ${playerId}`);

  // 6. Obtener y rastrear IDs creados para esta ejecución
  const { data: createdPlayer } = await supabaseAdmin
    .from('players')
    .select('id, tutor_id, family_id')
    .eq('id', playerId)
    .single();

  if (createdPlayer?.tutor_id) {
    tracker.registerAuthUser(createdPlayer.tutor_id);
    console.log(`   - Auth User ID rastreado: ${createdPlayer.tutor_id}`);
  }
  if (createdPlayer?.family_id) {
    tracker.registerFamily(createdPlayer.family_id);
    console.log(`   - Family ID rastreado: ${createdPlayer.family_id}`);
  }

  // 7. Rastrear y verificar cuotas generadas
  console.log('\n5. Consultando y registrando cuotas generadas en BD...');
  const { data: fees } = await supabaseAdmin
    .from('fees')
    .select('id, concept, amount_cents, amount_paid_cents, estado, fecha_pago, payment_method, payment_reference')
    .eq('player_id', playerId)
    .order('creado_en', { ascending: true });

  (fees || []).forEach((f: any, idx: number) => {
    tracker.registerFee(f.id);
    console.log(`   - Cuota ${idx + 1} rastreada: ID=${f.id.substring(0, 8)}... | Concepto="${f.concept}" | Importe=${(f.amount_cents / 100).toFixed(2)} €`);
  });

  // 8. Rastrear historial de temporada
  const { data: seasonHist } = await supabaseAdmin
    .from('player_season_history')
    .select('id')
    .eq('player_id', playerId);

  (seasonHist || []).forEach((sh: any) => {
    tracker.registerSeasonHistory(sh.id);
    console.log(`   - Season History ID rastreado: ${sh.id}`);
  });

  // 9. Rastrear player_tutors
  const { data: playerTutors } = await supabaseAdmin
    .from('player_tutors')
    .select('id')
    .eq('player_id', playerId);

  (playerTutors || []).forEach((pt: any) => {
    tracker.registerPlayerTutor(pt.id);
    console.log(`   - Player Tutor ID rastreado: ${pt.id}`);
  });

  console.log('\n=== 6. EJECUTANDO LIMPIEZA SEGURA BASADA EN IDS RASTREADOS ===');
  const cleanupResult = await tracker.cleanup(supabaseAdmin);
  console.log('Resultado de limpieza segura:', cleanupResult);

  console.log('\n=== [E2E_SAFETY] PRUEBA E2E AISLADA COMPLETADA CON ÉXITO SIN RESIDUOS ===');
}

main().catch(err => {
  console.error('\n[FATAL E2E ERROR]', err.message || err);
  process.exit(1);
});
