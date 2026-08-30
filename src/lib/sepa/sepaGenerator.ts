/**
 * SEPA XML Direct Debit Generator (ISO 20022 - pain.008.001.02)
 *
 * Módulo de generación de remesas bancarias SEPA para adeudos directos (CORE).
 * Cumple con la normativa SEPA Rulebook y el estándar ISO 20022.
 */

export interface SepaTransaction {
  feeId: string;
  amountCents: number; // En céntimos de euro (ej: 12500 para 125.00 €)
  concept: string;
  debtorIban: string;
  debtorName: string;
  mandateId: string;
  mandateDate: string; // Formato YYYY-MM-DD
  endToEndId?: string;
}

export interface SepaRemittanceHeader {
  messageId: string;
  creditorName: string;
  creditorIban: string;
  creditorId: string; // AT-02 Identificador de acreedor (ej: ES02000A12345678)
  initiatingPartyName?: string;
  collectionDate?: string; // Formato YYYY-MM-DD (fecha de cobro deseada)
}

export interface SepaRemittanceInput {
  header: SepaRemittanceHeader;
  transactions: SepaTransaction[];
}

export interface SepaValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Valida un código IBAN según el algoritmo ISO 7064 / Mod 97-10.
 */
export function validateIban(rawIban: string | null | undefined): { valid: boolean; reason?: string } {
  if (!rawIban || typeof rawIban !== 'string') {
    return { valid: false, reason: 'IBAN no proporcionado' };
  }

  const clean = rawIban.replace(/\s+/g, '').toUpperCase();

  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(clean)) {
    return { valid: false, reason: 'Formato o longitud de IBAN inválido' };
  }

  // Mover los primeros 4 caracteres al final
  const rearranged = clean.slice(4) + clean.slice(0, 4);

  // Convertir letras a números (A=10, B=11, ... Z=35)
  let numericString = '';
  for (let i = 0; i < rearranged.length; i++) {
    const charCode = rearranged.charCodeAt(i);
    if (charCode >= 65 && charCode <= 90) {
      numericString += (charCode - 55).toString();
    } else {
      numericString += rearranged[i];
    }
  }

  try {
    const isMod97Valid = BigInt(numericString) % BigInt(97) === BigInt(1);
    if (!isMod97Valid) {
      return { valid: false, reason: 'Dígitos de control de IBAN incorrectos (Módulo 97 fallido)' };
    }
  } catch {
    return { valid: false, reason: 'Error calculando dígitos de control de IBAN' };
  }

  return { valid: true };
}

/**
 * Enmascara un IBAN para presentación segura (nunca mostrar IBAN completo en logs).
 */
export function maskIban(iban: string | null | undefined): string {
  if (!iban) return '—';
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  if (clean.length < 8) return clean;
  return clean.slice(0, 4) + ' **** **** **** **' + clean.slice(-4);
}

/**
 * Escapa entidades XML para prevenir inyección XML o caracteres no permitidos.
 */
function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Sanitiza texto según el juego de caracteres permitido por SEPA (SEPA Character Set).
 * Trunca al tamaño máximo permitido.
 */
function sanitizeSepaText(text: string, maxLength = 70): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos para máxima compatibilidad bancaria
    .replace(/[^a-zA-Z0-9 /?:().,'+-]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * Valida de forma estricta los datos necesarios para generar la remesa SEPA.
 */
export function validateSepaRemittanceInput(input: SepaRemittanceInput): SepaValidationResult {
  const errors: string[] = [];

  const { header, transactions } = input;

  if (!header) {
    errors.push('Cabecera de remesa no proporcionada');
    return { valid: false, errors };
  }

  // 1. Validaciones del Club (Acreedor)
  if (!header.creditorId || !header.creditorId.trim()) {
    errors.push('Falta el Identificador de acreedor SEPA del club (Creditor ID)');
  }

  if (!header.creditorIban || !header.creditorIban.trim()) {
    errors.push('Falta el IBAN del club');
  } else {
    const clubIbanCheck = validateIban(header.creditorIban);
    if (!clubIbanCheck.valid) {
      errors.push(`IBAN del club inválido: ${clubIbanCheck.reason}`);
    }
  }

  if (!header.creditorName || !header.creditorName.trim()) {
    errors.push('Falta el nombre del club acreedor');
  }

  // 2. Validaciones de Transacciones
  if (!transactions || transactions.length === 0) {
    errors.push('No hay cuotas para incluir en la remesa');
    return { valid: false, errors };
  }

  transactions.forEach((tx, index) => {
    const txLabel = tx.debtorName ? `Cuota de ${tx.debtorName}` : `Cuota #${index + 1}`;

    if (!tx.amountCents || tx.amountCents <= 0) {
      errors.push(`${txLabel}: el importe debe ser superior a 0 €`);
    }

    if (!tx.debtorName || !tx.debtorName.trim()) {
      errors.push(`${txLabel}: falta el nombre del deudor`);
    }

    if (!tx.debtorIban || !tx.debtorIban.trim()) {
      errors.push(`${txLabel}: falta el IBAN del deudor`);
    } else {
      const debtorIbanCheck = validateIban(tx.debtorIban);
      if (!debtorIbanCheck.valid) {
        errors.push(`${txLabel}: IBAN no válido (${debtorIbanCheck.reason})`);
      }
    }

    if (!tx.mandateId || !tx.mandateId.trim()) {
      errors.push(`${txLabel}: falta la referencia de mandato SEPA`);
    }

    if (!tx.mandateDate || !tx.mandateDate.trim()) {
      errors.push(`${txLabel}: falta la fecha de mandato SEPA`);
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(tx.mandateDate.trim())) {
      errors.push(`${txLabel}: fecha de mandato con formato inválido (debe ser AAAA-MM-DD)`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Genera el documento XML SEPA en formato ISO 20022 pain.008.001.02.
 */
export function generateSepaXml(input: SepaRemittanceInput): string {
  const validation = validateSepaRemittanceInput(input);
  if (!validation.valid) {
    throw new Error(`Validación SEPA fallida: ${validation.errors.join('; ')}`);
  }

  const { header, transactions } = input;

  const totalCents = transactions.reduce((acc, t) => acc + t.amountCents, 0);
  const totalAmountFormatted = (totalCents / 100).toFixed(2);
  const numberOfTransactions = transactions.length;

  const now = new Date();
  const creationDateTime = now.toISOString().replace(/\.\d{3}Z$/, '');
  const collectionDate = header.collectionDate || new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const cleanCreditorIban = header.creditorIban.replace(/\s+/g, '').toUpperCase();
  const cleanCreditorId = header.creditorId.trim().toUpperCase();
  const cleanCreditorName = sanitizeSepaText(header.creditorName, 70);
  const cleanInitiatingParty = sanitizeSepaText(header.initiatingPartyName || header.creditorName, 70);
  const pmtInfId = `PMT-${header.messageId.slice(0, 20)}-${Date.now().toString().slice(-6)}`;

  let txElements = '';

  for (const tx of transactions) {
    const txAmount = (tx.amountCents / 100).toFixed(2);
    const endToEndId = sanitizeSepaText(tx.endToEndId || `E2E-${tx.feeId.replace(/-/g, '').slice(0, 25)}`, 35);
    const cleanDebtorIban = tx.debtorIban.replace(/\s+/g, '').toUpperCase();
    const cleanDebtorName = sanitizeSepaText(tx.debtorName, 70);
    const cleanMandateId = sanitizeSepaText(tx.mandateId, 35);
    const cleanConcept = sanitizeSepaText(tx.concept || 'Cuota club deportivo', 140);

    txElements += `      <DrctDbtTxInf>
        <PmtId>
          <EndToEndId>${escapeXml(endToEndId)}</EndToEndId>
        </PmtId>
        <InstdAmt Ccy="EUR">${txAmount}</InstdAmt>
        <DrctDbtTx>
          <MndtRltdInf>
            <MndtId>${escapeXml(cleanMandateId)}</MndtId>
            <DtOfSgntr>${escapeXml(tx.mandateDate.trim())}</DtOfSgntr>
          </MndtRltdInf>
        </DrctDbtTx>
        <DbtrAgt>
          <FinInstnId>
            <Othr>
              <Id>NOTPROVIDED</Id>
            </Othr>
          </FinInstnId>
        </DbtrAgt>
        <Dbtr>
          <Nm>${escapeXml(cleanDebtorName)}</Nm>
        </Dbtr>
        <DbtrAcct>
          <Id>
            <IBAN>${escapeXml(cleanDebtorIban)}</IBAN>
          </Id>
        </DbtrAcct>
        <RmtInf>
          <Ustrd>${escapeXml(cleanConcept)}</Ustrd>
        </RmtInf>
      </DrctDbtTxInf>
`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.008.001.02" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <CstmrDrctDbtInitn>
    <GrpHdr>
      <MsgId>${escapeXml(header.messageId.slice(0, 35))}</MsgId>
      <CreDtTm>${creationDateTime}</CreDtTm>
      <NbOfTxs>${numberOfTransactions}</NbOfTxs>
      <CtrlSum>${totalAmountFormatted}</CtrlSum>
      <InitgPty>
        <Nm>${escapeXml(cleanInitiatingParty)}</Nm>
        <Id>
          <OrgId>
            <Othr>
              <Id>${escapeXml(cleanCreditorId)}</Id>
            </Othr>
          </OrgId>
        </Id>
      </InitgPty>
    </GrpHdr>
    <PmtInf>
      <PmtInfId>${escapeXml(pmtInfId)}</PmtInfId>
      <PmtMtd>DD</PmtMtd>
      <NbOfTxs>${numberOfTransactions}</NbOfTxs>
      <CtrlSum>${totalAmountFormatted}</CtrlSum>
      <PmtTpInf>
        <SvcLvl>
          <Cd>SEPA</Cd>
        </SvcLvl>
        <LclInstrm>
          <Cd>CORE</Cd>
        </LclInstrm>
        <SeqTp>RCUR</SeqTp>
      </PmtTpInf>
      <ReqdColltnDt>${escapeXml(collectionDate)}</ReqdColltnDt>
      <Cdtr>
        <Nm>${escapeXml(cleanCreditorName)}</Nm>
      </Cdtr>
      <CdtrAcct>
        <Id>
          <IBAN>${escapeXml(cleanCreditorIban)}</IBAN>
        </Id>
      </CdtrAcct>
      <CdtrAgt>
        <FinInstnId>
          <Othr>
            <Id>NOTPROVIDED</Id>
          </Othr>
        </FinInstnId>
      </CdtrAgt>
      <CdtrSchmeId>
        <Id>
          <PrvtId>
            <Othr>
              <Id>${escapeXml(cleanCreditorId)}</Id>
              <SchmeNm>
                <Prtry>SEPA</Prtry>
              </SchmeNm>
            </Othr>
          </PrvtId>
        </Id>
      </CdtrSchmeId>
${txElements}    </PmtInf>
  </CstmrDrctDbtInitn>
</Document>`;
}
