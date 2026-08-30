process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  generateSepaXml,
  validateIban,
  validateSepaRemittanceInput,
  SepaRemittanceInput,
} from '../src/lib/sepa/sepaGenerator';

// Cargar variables de entorno desde .env.local sin depender de dotenv externo
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) {
      process.env[key.trim()] = rest.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, serviceRoleKey);

let passCount = 0;
let failCount = 0;

function assert(condition: boolean | undefined | null, testName: string, detail?: string) {
  if (condition) {
    console.log(`  [PASS] ${testName}${detail ? ` -> ${detail}` : ''}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
    failCount++;
  }
}

// Simulación fiel de la Server Action con todas las verificaciones de seguridad
async function simulateGenerateSepaRemittance(
  ctx: { user?: { id: string }; profile?: { id: string; role: string; club_id: string } } | null,
  params: { clubId: string; feeIds?: string[]; customFees?: any[] }
): Promise<{ success: boolean; xml?: string; filename?: string; totalAmount?: number; error?: string }> {
  // 1. Verificación de Autenticación
  if (!ctx || !ctx.user || !ctx.profile) {
    return { success: false, error: 'No autenticado' };
  }

  // 2. Verificación de Permisos de Tesorería
  const TREASURY_ADMIN_ROLES = ['admin', 'coordinador', 'tesorero', 'superadmin', 'secretario'];
  if (!TREASURY_ADMIN_ROLES.includes(ctx.profile.role)) {
    return { success: false, error: 'No tienes permisos de Tesorería para generar remesas SEPA' };
  }

  // 3. Verificación de Aislamiento de Club
  if (ctx.profile.club_id !== params.clubId) {
    return { success: false, error: 'No tienes permisos para operar sobre este club' };
  }

  // 4. Verificación de Datos SEPA del Club (Acreedor)
  const { data: club } = await adminClient
    .from('clubs')
    .select('id, name, sepa_creditor_id, sepa_iban')
    .eq('id', params.clubId)
    .single();

  if (!club) {
    return { success: false, error: 'Club no encontrado' };
  }

  if (!club.sepa_creditor_id || !club.sepa_creditor_id.trim()) {
    return { success: false, error: 'Falta el Identificador de acreedor SEPA del club' };
  }

  if (!club.sepa_iban || !club.sepa_iban.trim()) {
    return { success: false, error: 'Falta el IBAN del club' };
  }

  const clubIbanCheck = validateIban(club.sepa_iban);
  if (!clubIbanCheck.valid) {
    return { success: false, error: `IBAN del club inválido (${clubIbanCheck.reason})` };
  }

  // 5. Cargar y filtrar cuotas
  let fees = params.customFees;
  if (!fees) {
    const { data: dbFees } = await adminClient
      .from('fees')
      .select(`
        id, concept, amount_cents, estado, payment_method, club_id, player_id,
        players (
          id, first_name, last_name, dni, is_senior,
          parent1_name, parent1_last_name, parent1_dni,
          iban, sepa_mandate_id, sepa_mandate_date
        )
      `)
      .eq('club_id', params.clubId);
    fees = dbFees || [];
  }

  // Filtrado de cuotas: solo cuotas del club, estado pendiente y domiciliacion
  const validCandidates = [];
  for (const f of fees) {
    // Verificar club_id de la cuota
    if (f.club_id !== params.clubId) {
      return { success: false, error: 'Violación de seguridad: Una o más cuotas no pertenecen a tu club' };
    }

    // Filtrar estado: solo pendiente
    const status = (f.estado || f.status || '').toLowerCase();
    if (!['pending', 'pendiente', 'pdte_verif', 'pendiente_verificacion'].includes(status)) {
      continue; // Excluida por estado no pendiente
    }

    // Filtrar método de pago: solo domiciliación
    const method = (f.payment_method || '').toLowerCase();
    if (!method.includes('domicilia')) {
      continue; // Excluida por método no domiciliación
    }

    // Si se especificaron feeIds y no está en la lista, continuar
    if (params.feeIds && params.feeIds.length > 0 && !params.feeIds.includes(f.id)) {
      continue;
    }

    validCandidates.push(f);
  }

  if (validCandidates.length === 0) {
    return { success: false, error: 'No se encontraron cuotas domiciliadas pendientes válidas' };
  }

  // 6. Validaciones estrictas por cada cuota
  const transactions = [];
  for (const f of validCandidates) {
    const player = f.players;
    const isSenior = Boolean(player?.is_senior);
    const playerName = `${player?.first_name || ''} ${player?.last_name || ''}`.trim() || 'Jugador';

    if (!f.amount_cents || f.amount_cents <= 0) {
      return { success: false, error: `La cuota de "${playerName}" tiene un importe igual o inferior a cero` };
    }

    // Regla de pagador
    let debtorName = '';
    if (isSenior) {
      debtorName = `${player?.first_name || ''} ${player?.last_name || ''}`.trim();
    } else {
      debtorName = `${player?.parent1_name || ''} ${player?.parent1_last_name || ''}`.trim() || player?.parent1_name || '';
    }

    if (!debtorName) {
      return { success: false, error: `Falta el nombre del deudor para la cuota de "${playerName}"` };
    }

    const debtorIban = player?.iban?.trim();
    if (!debtorIban) {
      return { success: false, error: `Falta el IBAN para la cuota de "${playerName}"` };
    }

    const debtorIbanCheck = validateIban(debtorIban);
    if (!debtorIbanCheck.valid) {
      return { success: false, error: `El IBAN de "${playerName}" no es válido (${debtorIbanCheck.reason})` };
    }

    const mandateId = player?.sepa_mandate_id?.trim();
    if (!mandateId) {
      return { success: false, error: `Falta la referencia de mandato SEPA para "${playerName}"` };
    }

    const mandateDate = player?.sepa_mandate_date ? String(player.sepa_mandate_date).trim() : '';
    if (!mandateDate) {
      return { success: false, error: `Falta la fecha de mandato SEPA para "${playerName}"` };
    }

    transactions.push({
      feeId: f.id,
      amountCents: f.amount_cents,
      concept: f.concept || 'Cuota club',
      debtorIban,
      debtorName,
      mandateId,
      mandateDate,
      endToEndId: `FEE-${f.id.replace(/-/g, '').slice(0, 20)}`,
    });
  }

  // 7. Generar XML
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const messageId = `MSG-${club.id.replace(/-/g, '').slice(0, 8)}-${dateStr}-TEST`;

  try {
    const xml = generateSepaXml({
      header: {
        messageId,
        creditorName: club.name || 'Club Deportivo',
        creditorIban: club.sepa_iban,
        creditorId: club.sepa_creditor_id,
        collectionDate: '2026-08-31',
      },
      transactions,
    });

    const totalAmount = transactions.reduce((acc, t) => acc + t.amountCents, 0) / 100;
    return {
      success: true,
      xml,
      filename: `remesa_sepa_${dateStr}.xml`,
      totalAmount,
    };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

async function runAllTests() {
  console.log('====================================================');
  console.log('=== TEST SUITE P11: GENERADOR REMESAS SEPA XML   ===');
  console.log('====================================================\n');

  // Obtener dos clubes de la BD para pruebas
  const { data: clubs } = await adminClient.from('clubs').select('id, name, sepa_creditor_id, sepa_iban').limit(2);
  if (!clubs || clubs.length < 2) {
    console.error('Se requieren al menos 2 clubes en la BD.');
    process.exit(1);
  }

  const clubA = clubs[0];
  const clubB = clubs[1];

  // Configurar temporalmente datos SEPA en Club A para pruebas y restaurar después
  const originalCreditorId = clubA.sepa_creditor_id;
  const originalClubIban = clubA.sepa_iban;

  const validTestCreditorId = 'ES02000A12345678';
  const validTestClubIban = 'ES6000491500051234567892'; // IBAN válido con checksum real

  await adminClient.from('clubs').update({
    sepa_creditor_id: validTestCreditorId,
    sepa_iban: validTestClubIban,
  }).eq('id', clubA.id);

  const ctxAdminA = {
    user: { id: 'admin-a' },
    profile: { id: 'prof-a', role: 'admin', club_id: clubA.id },
  };

  const ctxTesoreroA = {
    user: { id: 'tesorero-a' },
    profile: { id: 'prof-t', role: 'tesorero', club_id: clubA.id },
  };

  const ctxFamilyA = {
    user: { id: 'family-a' },
    profile: { id: 'prof-f', role: 'family', club_id: clubA.id },
  };

  const ctxAdminB = {
    user: { id: 'admin-b' },
    profile: { id: 'prof-b', role: 'admin', club_id: clubB.id },
  };

  // Cuota válida base (jugador senior)
  const validSeniorFee = {
    id: 'fee-senior-001',
    club_id: clubA.id,
    concept: 'Cuota Septiembre Senior',
    amount_cents: 15000,
    estado: 'pendiente',
    payment_method: 'domiciliacion',
    players: {
      id: 'player-senior-1',
      first_name: 'Alberto',
      last_name: 'Gómez Sanz',
      dni: '12345678Z',
      is_senior: true,
      parent1_name: null,
      parent1_last_name: null,
      parent1_dni: null,
      iban: 'ES9121000418450200051332', // IBAN válido con checksum real
      sepa_mandate_id: 'MANDATO-2026-SR01',
      sepa_mandate_date: '2026-08-01',
    },
  };

  // Cuota válida base (jugador menor)
  const validMinorFee = {
    id: 'fee-minor-002',
    club_id: clubA.id,
    concept: 'Cuota Septiembre Cadete',
    amount_cents: 10000,
    estado: 'pendiente',
    payment_method: 'domiciliacion',
    players: {
      id: 'player-minor-1',
      first_name: 'Daniel',
      last_name: 'Ruiz Navarro',
      dni: '87654321A',
      is_senior: false,
      parent1_name: 'Rosa',
      parent1_last_name: 'Navarro Gil',
      parent1_dni: '44556677C',
      iban: 'ES9121000418450200051332', // IBAN válido
      sepa_mandate_id: 'MANDATO-2026-MN02',
      sepa_mandate_date: '2026-07-15',
    },
  };

  // ─────────────────────────────────────────────────────────────
  // 1. usuario no autorizado → DENIED
  // ─────────────────────────────────────────────────────────────
  console.log('--- 1. usuario no autorizado → DENIED ---');
  const resUnauth = await simulateGenerateSepaRemittance(null, { clubId: clubA.id, customFees: [validSeniorFee] });
  assert(resUnauth.success === false && resUnauth.error?.includes('No autenticado'), 'Usuario no autenticado → DENIED');

  const resFamily = await simulateGenerateSepaRemittance(ctxFamilyA, { clubId: clubA.id, customFees: [validSeniorFee] });
  assert(resFamily.success === false && resFamily.error?.includes('No tienes permisos'), 'Usuario no autorizado (family) → DENIED');

  const resTesorero = await simulateGenerateSepaRemittance(ctxTesoreroA, { clubId: clubA.id, customFees: [validSeniorFee] });
  assert(resTesorero.success === true, 'Usuario autorizado (tesorero) → ALLOWED');

  // ─────────────────────────────────────────────────────────────
  // 2. club incorrecto → DENIED (Cross-Tenant)
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 2. club incorrecto → DENIED (Cross-Tenant) ---');
  // Intento de admin de Club B de generar remesa de Club A
  const resCrossClub = await simulateGenerateSepaRemittance(ctxAdminB, { clubId: clubA.id, customFees: [validSeniorFee] });
  assert(resCrossClub.success === false && resCrossClub.error?.includes('No tienes permisos'), 'Admin de Club B intentando operar Club A → DENIED');

  // Intento de incluir cuota perteneciente a Club B en Club A
  const feeForeignClub = { ...validSeniorFee, id: 'fee-foreign', club_id: clubB.id };
  const resForeignFee = await simulateGenerateSepaRemittance(ctxAdminA, { clubId: clubA.id, customFees: [feeForeignClub] });
  assert(resForeignFee.success === false && resForeignFee.error?.includes('no pertenecen a tu club'), 'Cuota de otro club en remesa → DENIED');

  // ─────────────────────────────────────────────────────────────
  // 3. cuota no domiciliada → DENIED / EXCLUDED
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 3. cuota no domiciliada → DENIED/EXCLUDED ---');
  const feeTransfer = { ...validSeniorFee, payment_method: 'Transferencia' };
  const resTransfer = await simulateGenerateSepaRemittance(ctxAdminA, { clubId: clubA.id, customFees: [feeTransfer] });
  assert(resTransfer.success === false && resTransfer.error?.includes('No se encontraron cuotas domiciliadas'), 'Cuota por Transferencia excluida de remesa SEPA → DENIED/EXCLUDED');

  const feeStripe = { ...validSeniorFee, payment_method: 'Stripe' };
  const resStripe = await simulateGenerateSepaRemittance(ctxAdminA, { clubId: clubA.id, customFees: [feeStripe] });
  assert(resStripe.success === false && resStripe.error?.includes('No se encontraron cuotas domiciliadas'), 'Cuota por Stripe excluida de remesa SEPA → DENIED/EXCLUDED');

  // ─────────────────────────────────────────────────────────────
  // 4. cuota no pendiente → DENIED / EXCLUDED
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 4. cuota no pendiente → DENIED/EXCLUDED ---');
  const feePaid = { ...validSeniorFee, estado: 'pagado' };
  const resPaid = await simulateGenerateSepaRemittance(ctxAdminA, { clubId: clubA.id, customFees: [feePaid] });
  assert(resPaid.success === false && resPaid.error?.includes('No se encontraron cuotas domiciliadas'), 'Cuota con estado "pagado" excluida de remesa SEPA → DENIED/EXCLUDED');

  // ─────────────────────────────────────────────────────────────
  // 5. IBAN deudor ausente o inválido → DENIED
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 5. IBAN deudor ausente o inválido → DENIED ---');
  const feeMissingIban = {
    ...validSeniorFee,
    players: { ...validSeniorFee.players, iban: null },
  };
  const resMissingIban = await simulateGenerateSepaRemittance(ctxAdminA, { clubId: clubA.id, customFees: [feeMissingIban] });
  assert(resMissingIban.success === false && resMissingIban.error?.includes('Falta el IBAN'), 'IBAN deudor ausente → DENIED');

  const feeInvalidIban = {
    ...validSeniorFee,
    players: { ...validSeniorFee.players, iban: 'ES001234567890' }, // Checksum incorrecto
  };
  const resInvalidIban = await simulateGenerateSepaRemittance(ctxAdminA, { clubId: clubA.id, customFees: [feeInvalidIban] });
  assert(resInvalidIban.success === false && resInvalidIban.error?.includes('no es válido'), 'IBAN deudor con formato/checksum incorrecto → DENIED');

  // ─────────────────────────────────────────────────────────────
  // 6. mandato ausente → DENIED
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 6. mandato ausente → DENIED ---');
  const feeMissingMandateId = {
    ...validSeniorFee,
    players: { ...validSeniorFee.players, sepa_mandate_id: null },
  };
  const resMissingMandateId = await simulateGenerateSepaRemittance(ctxAdminA, { clubId: clubA.id, customFees: [feeMissingMandateId] });
  assert(resMissingMandateId.success === false && resMissingMandateId.error?.includes('Falta la referencia de mandato'), 'Referencia de mandato ausente → DENIED');

  const feeMissingMandateDate = {
    ...validSeniorFee,
    players: { ...validSeniorFee.players, sepa_mandate_date: null },
  };
  const resMissingMandateDate = await simulateGenerateSepaRemittance(ctxAdminA, { clubId: clubA.id, customFees: [feeMissingMandateDate] });
  assert(resMissingMandateDate.success === false && resMissingMandateDate.error?.includes('Falta la fecha de mandato'), 'Fecha de mandato ausente → DENIED');

  // ─────────────────────────────────────────────────────────────
  // 7. datos club SEPA ausentes → DENIED
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 7. datos club SEPA ausentes → DENIED ---');
  await adminClient.from('clubs').update({ sepa_creditor_id: null }).eq('id', clubA.id);
  const resClubNoCreditor = await simulateGenerateSepaRemittance(ctxAdminA, { clubId: clubA.id, customFees: [validSeniorFee] });
  assert(resClubNoCreditor.success === false && resClubNoCreditor.error?.includes('Identificador de acreedor'), 'Club sin Creditor ID → DENIED');

  await adminClient.from('clubs').update({ sepa_creditor_id: validTestCreditorId, sepa_iban: null }).eq('id', clubA.id);
  const resClubNoIban = await simulateGenerateSepaRemittance(ctxAdminA, { clubId: clubA.id, customFees: [validSeniorFee] });
  assert(resClubNoIban.success === false && resClubNoIban.error?.includes('IBAN del club'), 'Club sin IBAN → DENIED');

  // Restaurar datos válidos en Club A
  await adminClient.from('clubs').update({
    sepa_creditor_id: validTestCreditorId,
    sepa_iban: validTestClubIban,
  }).eq('id', clubA.id);

  // ─────────────────────────────────────────────────────────────
  // 8. datos completos → XML ACCEPT
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 8. datos completos → XML ACCEPT ---');
  const resAccept = await simulateGenerateSepaRemittance(ctxAdminA, {
    clubId: clubA.id,
    customFees: [validSeniorFee, validMinorFee],
  });
  assert(resAccept.success === true && Boolean(resAccept.xml), 'Remesa con datos completos → XML ACCEPT');

  const xml = resAccept.xml || '';

  // ─────────────────────────────────────────────────────────────
  // 9. XML bien formado → PASS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 9. XML bien formado → PASS ---');
  const hasXmlDeclaration = xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>');
  const hasDocumentNamespace = xml.includes('xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02"');
  const hasCstmrDrctDbtInitn = xml.includes('<CstmrDrctDbtInitn>') && xml.includes('</CstmrDrctDbtInitn>');
  const hasGrpHdr = xml.includes('<GrpHdr>') && xml.includes('</GrpHdr>');
  const hasPmtInf = xml.includes('<PmtInf>') && xml.includes('</PmtInf>');
  const txCountMatch = (xml.match(/<DrctDbtTxInf>/g) || []).length;

  assert(
    hasXmlDeclaration && hasDocumentNamespace && hasCstmrDrctDbtInitn && hasGrpHdr && hasPmtInf && txCountMatch === 2,
    'XML bien formado en estándar ISO 20022 pain.008.001.02 con 2 transacciones'
  );

  // ─────────────────────────────────────────────────────────────
  // 10. importe correcto → PASS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 10. importe correcto → PASS ---');
  // Total = 150.00 + 100.00 = 250.00
  const hasTotalSum = xml.includes('<CtrlSum>250.00</CtrlSum>');
  const hasTx1Amount = xml.includes('<InstdAmt Ccy="EUR">150.00</InstdAmt>');
  const hasTx2Amount = xml.includes('<InstdAmt Ccy="EUR">100.00</InstdAmt>');

  assert(hasTotalSum && hasTx1Amount && hasTx2Amount, 'Importes individuales (150.00€, 100.00€) y suma de control (250.00€) exactos');

  // ─────────────────────────────────────────────────────────────
  // 11. IBAN deudor correcto → PASS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 11. IBAN deudor correcto → PASS ---');
  const compactXml = xml.replace(/\s+/g, '');
  const hasDebtorIban = compactXml.includes('<DbtrAcct><Id><IBAN>ES9121000418450200051332</IBAN></Id></DbtrAcct>');
  assert(hasDebtorIban, 'IBAN del deudor incluido correctamente en <DbtrAcct>');

  // ─────────────────────────────────────────────────────────────
  // 12. mandato correcto → PASS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 12. mandato correcto → PASS ---');
  const hasMandate1 = compactXml.includes('<MndtId>MANDATO-2026-SR01</MndtId>') && compactXml.includes('<DtOfSgntr>2026-08-01</DtOfSgntr>');
  const hasMandate2 = compactXml.includes('<MndtId>MANDATO-2026-MN02</MndtId>') && compactXml.includes('<DtOfSgntr>2026-07-15</DtOfSgntr>');
  assert(hasMandate1 && hasMandate2, 'Referencias y fechas de mandato SEPA de ambas transacciones correctas');

  // ─────────────────────────────────────────────────────────────
  // 13. club_id correcto → PASS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 13. club_id correcto → PASS ---');
  const hasCreditorIban = compactXml.includes(`<CdtrAcct><Id><IBAN>${validTestClubIban}</IBAN></Id></CdtrAcct>`);
  const hasCreditorId = compactXml.includes(`<Id>${validTestCreditorId}</Id>`);
  assert(hasCreditorIban && hasCreditorId, 'IBAN y Creditor ID del club acreedor incluidos con exactitud en la remesa');

  // ─────────────────────────────────────────────────────────────
  // 14. Regla de pagador (Senior vs Menor) en XML → PASS
  // ─────────────────────────────────────────────────────────────
  console.log('\n--- 14. Regla de pagador (Senior vs Menor) en XML → PASS ---');
  const hasSeniorPayer = compactXml.includes('<Dbtr><Nm>AlbertoGomezSanz</Nm></Dbtr>') || compactXml.includes('<Dbtr><Nm>AlbertoGómezSanz</Nm></Dbtr>');
  const hasMinorTutorPayer = compactXml.includes('<Dbtr><Nm>RosaNavarroGil</Nm></Dbtr>');
  assert(hasSeniorPayer, 'Jugador Senior figura a su propio nombre como deudor (<Dbtr><Nm>)');
  assert(hasMinorTutorPayer, 'Jugador Menor figura a nombre de su tutor (parent1_*) como deudor (<Dbtr><Nm>)');

  // ─────────────────────────────────────────────────────────────
  // 15. Limpieza de datos temporales (Restauración)
  // ─────────────────────────────────────────────────────────────
  await adminClient.from('clubs').update({
    sepa_creditor_id: originalCreditorId,
    sepa_iban: originalClubIban,
  }).eq('id', clubA.id);

  console.log('\n====================================================');
  console.log(`RESULTADOS P11 SEPA: ${passCount} PASSED / ${failCount} FAILED`);
  console.log('====================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Error fatal ejecutando test suite P11:', err);
  process.exit(1);
});
