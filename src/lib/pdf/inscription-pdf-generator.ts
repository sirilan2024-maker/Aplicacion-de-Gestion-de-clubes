import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export interface InscriptionPdfData {
  player: {
    id: string;
    firstName: string;
    lastName: string;
    dni?: string | null;
    birthDate?: string | null;
    category?: string | null;
    phone?: string | null;
    email?: string | null;
    sip?: string | null;
    address?: string | null;
    registrationStatus?: string | null;
    createdAt?: string | null;
  };
  tutor?: {
    name?: string | null;
    dni?: string | null;
    phone?: string | null;
    email?: string | null;
    relation?: string | null;
  };
  health?: {
    allergies?: string | null;
    conditions?: string | null;
    notes?: string | null;
  };
  apparel?: {
    itemName: string;
    size: string;
  }[];
  payment?: {
    method?: string | null;
    totalAmount?: number | null;
    baseTotal?: number | null;
    isRenewal?: boolean;
    isReserved?: boolean;
    reservationAmount?: number;
    remainingAmount?: number;
    status?: string | null;
    iban?: string | null;
  };
}

export async function generateInscriptionPdfBuffer(data: InscriptionPdfData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size: 595x842 pt
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Color Palette
  const primaryColor = rgb(0.01, 0.52, 0.78); // Sporting Saladar Blue (#0284c7)
  const darkNavy = rgb(0.06, 0.09, 0.16);     // #101828
  const grayBorder = rgb(0.85, 0.88, 0.92);
  const lightBg = rgb(0.96, 0.97, 0.98);
  const darkText = rgb(0.12, 0.16, 0.23);

  // Try embedding club crest image if file exists
  try {
    const crestPath = path.join(process.cwd(), 'public', 'escudo-saladar.jpg');
    if (fs.existsSync(crestPath)) {
      const crestBytes = fs.readFileSync(crestPath);
      const crestImage = await pdfDoc.embedJpg(crestBytes);
      page.drawImage(crestImage, {
        x: 40,
        y: height - 85,
        width: 55,
        height: 55,
      });
    }
  } catch (e) {
    console.warn('[inscription-pdf-generator] Could not embed crest image:', e);
  }

  // Header Title
  page.drawText('CLUB SPORTING SALADAR', {
    x: 105,
    y: height - 50,
    size: 20,
    font: boldFont,
    color: primaryColor,
  });

  page.drawText('DOCUMENTO OFICIAL DE INSCRIPCIÓN Y REGISTRO DE JUGADOR', {
    x: 105,
    y: height - 68,
    size: 9,
    font: boldFont,
    color: darkNavy,
  });

  const formattedDate = data.player.createdAt
    ? new Date(data.player.createdAt).toLocaleDateString('es-ES')
    : new Date().toLocaleDateString('es-ES');

  page.drawText(`Fecha de registro: ${formattedDate}`, {
    x: width - 170,
    y: height - 48,
    size: 9,
    font,
    color: darkText,
  });

  page.drawText(`ID Ficha: ${data.player.id.slice(0, 8).toUpperCase()}`, {
    x: width - 170,
    y: height - 62,
    size: 8,
    font,
    color: darkText,
  });

  // Top Header Separator Line
  page.drawLine({
    start: { x: 40, y: height - 95 },
    end: { x: width - 40, y: height - 95 },
    thickness: 1.5,
    color: primaryColor,
  });

  let currentY = height - 120;

  const drawSectionHeader = (title: string, yPos: number) => {
    page.drawRectangle({
      x: 40,
      y: yPos - 4,
      width: width - 80,
      height: 20,
      color: primaryColor,
    });
    page.drawText(title.toUpperCase(), {
      x: 48,
      y: yPos + 1,
      size: 10,
      font: boldFont,
      color: rgb(1, 1, 1),
    });
    return yPos - 30;
  };

  const drawField = (label: string, value: string | undefined | null, x: number, y: number, fontRef = font) => {
    const safeValue = value && value.trim() ? value : '---';
    page.drawText(`${label}:`, {
      x,
      y,
      size: 9,
      font: boldFont,
      color: darkNavy,
    });
    page.drawText(safeValue, {
      x: x + (label.length * 5.2) + 12,
      y,
      size: 9,
      font: fontRef,
      color: darkText,
    });
  };

  // SECTION 1: DATOS DEL JUGADOR
  currentY = drawSectionHeader('1. Datos Personales del Jugador', currentY);

  page.drawRectangle({
    x: 40,
    y: currentY - 55,
    width: width - 80,
    height: 70,
    color: lightBg,
    borderColor: grayBorder,
    borderWidth: 1,
  });

  const fullPlayerName = `${data.player.firstName} ${data.player.lastName}`.trim();
  drawField('Nombre completo', fullPlayerName, 50, currentY);
  drawField('DNI / NIE', data.player.dni, 340, currentY);

  currentY -= 20;
  drawField('Fecha Nacimiento', data.player.birthDate, 50, currentY);
  drawField('Categoría / Posición', data.player.category, 340, currentY);

  currentY -= 20;
  drawField('Teléfono de Contacto', data.player.phone, 50, currentY);
  drawField('SIP / Nº Sanitario', data.player.sip, 340, currentY);

  currentY -= 35;

  // SECTION 2: DATOS DEL TUTOR / PADRE / MADRE
  currentY = drawSectionHeader('2. Datos del Tutor Legal y Emergencia', currentY);

  page.drawRectangle({
    x: 40,
    y: currentY - 35,
    width: width - 80,
    height: 50,
    color: lightBg,
    borderColor: grayBorder,
    borderWidth: 1,
  });

  const tutorName = data.tutor?.name || 'Tutor registrado en la plataforma';
  drawField('Nombre del Tutor', tutorName, 50, currentY);
  drawField('DNI del Tutor', data.tutor?.dni, 340, currentY);

  currentY -= 20;
  drawField('Teléfono Emergencia', data.tutor?.phone || data.player.phone, 50, currentY);
  drawField('Correo Electrónico', data.tutor?.email || data.player.email, 340, currentY);

  currentY -= 35;

  // SECTION 3: SALUD Y OBSERVACIONES MÉDICAS
  currentY = drawSectionHeader('3. Información de Salud y Alergias', currentY);

  page.drawRectangle({
    x: 40,
    y: currentY - 35,
    width: width - 80,
    height: 50,
    color: lightBg,
    borderColor: grayBorder,
    borderWidth: 1,
  });

  drawField('Alergias / Intolerancias', data.health?.allergies || 'Ninguna registrada', 50, currentY);
  currentY -= 20;
  drawField('Condiciones / Notas Médicas', data.health?.conditions || data.health?.notes || 'Sin observaciones médicas', 50, currentY);

  currentY -= 35;

  // SECTION 4: TALLAS DE UTILLERÍA Y EQUIPACIÓN
  currentY = drawSectionHeader('4. Tallas de Equipación y Utillería Solicitada', currentY);

  const apparelItems = data.apparel && data.apparel.length > 0
    ? data.apparel
    : [
        { itemName: 'Camiseta de Juego', size: 'Por definir' },
        { itemName: 'Pantalón de Juego', size: 'Por definir' },
        { itemName: 'Sudadera / Abrigo', size: 'Por definir' },
      ];

  const apparelBoxHeight = Math.max(40, apparelItems.length * 16 + 15);
  page.drawRectangle({
    x: 40,
    y: currentY - apparelBoxHeight + 15,
    width: width - 80,
    height: apparelBoxHeight,
    color: lightBg,
    borderColor: grayBorder,
    borderWidth: 1,
  });

  let apparelY = currentY;
  apparelItems.forEach((item, index) => {
    const xPos = index % 2 === 0 ? 50 : 320;
    if (index % 2 === 0 && index > 0) apparelY -= 18;
    drawField(item.itemName, item.size, xPos, apparelY);
  });

  currentY -= apparelBoxHeight + 20;

  // SECTION 5: FORMA DE PAGO Y TARIFA
  currentY = drawSectionHeader('5. Modalidad de Pago y Estado de Cuota', currentY);

  page.drawRectangle({
    x: 40,
    y: currentY - 35,
    width: width - 80,
    height: 50,
    color: lightBg,
    borderColor: grayBorder,
    borderWidth: 1,
  });

  const paymentMethodLabel = data.payment?.method === 'sepa'
    ? 'Domiciliación Bancaria (SEPA)'
    : data.payment?.method === 'stripe' || data.payment?.method === 'card'
    ? 'Tarjeta Bancaria / Online'
    : 'Transferencia / Efectivo';

  const isRenewal = data.payment?.isRenewal;
  const baseTotal = data.payment?.baseTotal || data.payment?.totalAmount || (isRenewal ? 195 : 250);
  const isReserved = Boolean(data.payment?.isReserved);
  const remaining = isReserved ? Math.max(0, baseTotal - 50) : baseTotal;

  const amountStr = isReserved
    ? `${baseTotal} € (${isRenewal ? 'Renovación' : 'Alta'}) - 50 € Reserva = ${remaining} €`
    : `${baseTotal} € (${isRenewal ? 'Renovación' : 'Alta'})`;

  const statusStr = data.player.registrationStatus === 'formalized'
    ? 'Formalizada y Aprobada'
    : data.player.registrationStatus === 'pending_payment'
    ? 'Pendiente de Pago'
    : 'En revisión por el club';

  drawField('Forma de Pago', paymentMethodLabel, 50, currentY);
  drawField('Desglose Cuota', amountStr, 270, currentY);

  currentY -= 20;
  drawField('Estado de Inscripción', statusStr, 50, currentY);
  if (data.payment?.iban) {
    drawField('Cuenta IBAN', `**** **** ${data.payment.iban.slice(-4)}`, 340, currentY);
  }

  currentY -= 40;

  // SECTION 6: DECLARACIÓN Y CONSENTIMIENTO RGPD
  page.drawRectangle({
    x: 40,
    y: currentY - 95,
    width: width - 80,
    height: 105,
    color: rgb(0.98, 0.99, 1),
    borderColor: primaryColor,
    borderWidth: 1,
  });

  page.drawText('DECLARACIÓN DE CONSENTIMIENTO Y PROTECCIÓN DE DATOS (RGPD)', {
    x: 48,
    y: currentY - 5,
    size: 8.5,
    font: boldFont,
    color: primaryColor,
  });

  const legalText = [
    'El tutor legal o jugador mayor de edad declara que todos los datos facilitados en este formulario son ciertos',
    'y autoriza al CLUB SPORTING SALADAR al tratamiento de los mismos para la gestión deportiva, médica y administrativa,',
    'así como la publicación de imágenes deportivas en los canales oficiales del club según lo establecido en el Reglamento',
    'General de Protección de Datos (RGPD UE 2016/679) y la LOPDGDD 3/2018. Puede ejercitar sus derechos de acceso,',
    'rectificación, supresión y oposición dirigiendo una solicitud por escrito a info@clubsportingsaladar.com.'
  ];

  let textY = currentY - 20;
  legalText.forEach(line => {
    page.drawText(line, {
      x: 48,
      y: textY,
      size: 7.5,
      font,
      color: darkText,
    });
    textY -= 11;
  });

  // Footer text
  page.drawText('Documento generado electrónicamente por la Plataforma Oficial del Club Sporting Saladar.', {
    x: 40,
    y: 25,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText(`Página 1 de 1`, {
    x: width - 90,
    y: 25,
    size: 8,
    font,
    color: rgb(0.5, 0.5, 0.5),
  });

  return await pdfDoc.save();
}

/**
 * Generates a compiled PDF containing all inscription sheets for a batch of players
 */
export async function generateBatchInscriptionsPdfBuffer(dataList: InscriptionPdfData[]): Promise<Uint8Array> {
  const mergedPdf = await PDFDocument.create();

  for (const data of dataList) {
    const singlePdfBytes = await generateInscriptionPdfBuffer(data);
    const singlePdf = await PDFDocument.load(singlePdfBytes);
    const copiedPages = await mergedPdf.copyPages(singlePdf, singlePdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}
