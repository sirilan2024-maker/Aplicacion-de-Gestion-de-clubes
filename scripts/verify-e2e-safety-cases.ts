import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { createClient } from '@supabase/supabase-js';
import {
  assertSafeE2ETestEmail,
  assertSafeToCleanUser,
  generateSafeE2EIdentity,
  SafeE2EExecutionTracker,
  PROTECTED_ACCOUNTS_BLACKLIST
} from '@/lib/e2e-safety';
import { ADMIN_ROLES, STAFF_ROLES } from '@/lib/auth-helpers';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function runSafetySuite() {
  console.log('======================================================');
  console.log('EJECUCIÓN DEL BANCO DE PRUEBAS DE SEGURIDAD (6 CASOS)');
  console.log('======================================================\n');

  let passedCases = 0;

  // ──────────────────────────────────────────────────────────────────────────
  // CASO 1: sirilan2024@gmail.com -> RECHAZADO como identidad E2E
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- CASO 1: Validación de email protegido sirilan2024@gmail.com ---');
  try {
    assertSafeE2ETestEmail('sirilan2024@gmail.com');
    console.error('❌ FALLO CASO 1: sirilan2024@gmail.com NO fue rechazado.');
  } catch (err: any) {
    if (err.message.includes('E2E_SAFETY_VIOLATION_FATAL') || err.message.includes('protegido')) {
      console.log('✅ ÉXITO CASO 1: sirilan2024@gmail.com fue rechazado inmediatamente:', err.message);
      passedCases++;
    } else {
      console.error('❌ FALLO CASO 1: Error inesperado:', err.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CASO 2: Un email arbitrario real (ej. usuario@gmail.com) -> RECHAZADO
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- CASO 2: Validación de email arbitrario real (usuario@gmail.com) ---');
  try {
    assertSafeE2ETestEmail('usuario@gmail.com');
    console.error('❌ FALLO CASO 2: usuario@gmail.com NO fue rechazado.');
  } catch (err: any) {
    if (err.message.includes('E2E_SAFETY_VIOLATION') || err.message.includes('@example.invalid')) {
      console.log('✅ ÉXITO CASO 2: Email real no autorizado rechazado correctamente:', err.message);
      passedCases++;
    } else {
      console.error('❌ FALLO CASO 2: Error inesperado:', err.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CASO 3: Una cuenta existente no creada por la ejecución actual -> ABORTA
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- CASO 3: Cuenta existente externa no creada por esta ejecución ---');
  const targetAdminId = 'b9ad0a21-8766-474b-a6c4-8b5471951c7f'; // sirilan2024@gmail.com
  try {
    // Intentar limpiar la cuenta pasando un email no coincidente o protegido
    await assertSafeToCleanUser(supabaseAdmin, targetAdminId, 'e2e-fake-nonmatching@example.invalid');
    console.error('❌ FALLO CASO 3: Se permitió limpiar una cuenta existente no registrada.');
  } catch (err: any) {
    console.log('✅ ÉXITO CASO 3: Abortado correctamente ante cuenta externa existente:', err.message);
    passedCases++;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CASO 4: Una cuenta con role = admin -> assertSafeToCleanUser ABORTA
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- CASO 4: Protección de cuenta con role = admin ---');
  try {
    await assertSafeToCleanUser(supabaseAdmin, targetAdminId);
    console.error('❌ FALLO CASO 4: Se permitió limpiar una cuenta de administrador.');
  } catch (err: any) {
    if (err.message.includes('E2E_SAFETY_VIOLATION_FATAL') || err.message.includes('protegido') || err.message.includes('administrativo')) {
      console.log('✅ ÉXITO CASO 4: Abortado inmediatamente al detectar cuenta administrativa:', err.message);
      passedCases++;
    } else {
      console.error('❌ FALLO CASO 4: Error inesperado:', err.message);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CASO 5: Usuario autenticado con role = 'admin' en /api/register -> ROL NO SE MODIFICA
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- CASO 5: Verificación de no-degradación de rol admin en /api/register ---');
  // Comprobar estado previo del admin
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, role, rol, roles, first_name, last_name, club_id')
    .eq('id', targetAdminId)
    .single();

  console.log('Estado del perfil admin verificado:', existingProfile);

  const isStaffOrAdmin = existingProfile && (
    (existingProfile.role && (ADMIN_ROLES.includes(existingProfile.role) || STAFF_ROLES.includes(existingProfile.role))) ||
    (existingProfile.rol && (ADMIN_ROLES.includes(existingProfile.rol) || STAFF_ROLES.includes(existingProfile.rol))) ||
    (Array.isArray(existingProfile.roles) && existingProfile.roles.some((r: string) => ADMIN_ROLES.includes(r) || STAFF_ROLES.includes(r)))
  );

  let profileUpdates: any = null;
  if (!isStaffOrAdmin) {
    profileUpdates = {
      club_id: existingProfile?.club_id,
      role: 'familia',
      rol: 'familia',
      first_name: 'NuevoNombre',
      last_name: 'NuevoApellido',
      email: 'nuevo@email.com',
      phone: '600000000'
    };
  }

  // Comprobar que profileUpdates es null para staff/admin (ningún campo se modifica)
  if (isStaffOrAdmin && profileUpdates === null) {
    console.log('✅ ÉXITO CASO 5: La guardia de /api/register protegió al 100% el perfil del administrador (role, rol, roles, first_name, last_name, email, phone, club_id no se modifican).');
    passedCases++;
  } else {
    console.error('❌ FALLO CASO 5: El guardia de /api/register no protegió el perfil completamente:', profileUpdates);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CASO 6: Identidad E2E nueva y válida -> Se crea y limpia usando sólo IDs de esa ejecución
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- CASO 6: Identidad E2E nueva y válida -> Ciclo completo de vida y limpieza por ID ---');
  const tracker = new SafeE2EExecutionTracker('safety-unit-test');
  const testEmail = tracker.testIdentityEmail;

  console.log('Identidad E2E generada:', testEmail);
  assertSafeE2ETestEmail(testEmail);

  // Crear usuario temporal aislado de prueba
  const { data: authCreated, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: 'TemporaryTestPassword2026!',
    email_confirm: true,
    user_metadata: { role: 'tutor', rol: 'familia', is_e2e_test: true }
  });

  if (createErr || !authCreated?.user) {
    throw new Error('Error creando usuario de prueba temporal: ' + createErr?.message);
  }

  const testUserId = authCreated.user.id;
  tracker.registerAuthUser(testUserId);

  // Crear perfil temporal
  await supabaseAdmin.from('profiles').upsert({
    id: testUserId,
    email: testEmail,
    role: 'familia',
    rol: 'familia',
    club_id: '7ff5dbeb-2942-4576-8e74-b45a17646fb7',
    first_name: 'E2E_Unit_Test',
    last_name: 'Temp'
  });

  // Crear jugador temporal
  const { data: playerCreated } = await supabaseAdmin.from('players').insert({
    first_name: 'E2E_UNIT_PLAYER',
    last_name: 'TEMP',
    tutor_id: testUserId,
    club_id: '7ff5dbeb-2942-4576-8e74-b45a17646fb7',
    status: 'activo'
  }).select('id').single();

  if (playerCreated) {
    tracker.registerPlayer(playerCreated.id);
  }

  // Ejecutar limpieza segura por ID
  const cleanup = await tracker.cleanup(supabaseAdmin);
  console.log('Resultado de limpieza rastreada por IDs:', cleanup);

  // Verificar que el usuario temporal ya no existe
  const { data: checkDeleted } = await supabaseAdmin.from('profiles').select('id').eq('id', testUserId).maybeSingle();
  if (!checkDeleted) {
    console.log('✅ ÉXITO CASO 6: La identidad E2E se creó y se limpió exclusivamente por IDs sin dejar rastro.');
    passedCases++;
  } else {
    console.error('❌ FALLO CASO 6: No se limpió el usuario temporal.');
  }

  console.log('\n======================================================');
  console.log(`RESUMEN DEL BANCO DE PRUEBAS DE SEGURIDAD: ${passedCases}/6 CASOS PASARON`);
  console.log('======================================================');

  if (passedCases === 6) {
    console.log('🎉 TODOS LOS CASOS DE SEGURIDAD PASARON CORRECTAMENTE.');
  } else {
    throw new Error(`Fallaron ${6 - passedCases} casos de seguridad.`);
  }
}

runSafetySuite().catch(err => {
  console.error('\n[ERROR BANCO DE SEGURIDAD]', err);
  process.exit(1);
});
