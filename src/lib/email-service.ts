import nodemailer from 'nodemailer';
import { Resend } from 'resend';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Obtener transportador SMTP configurado
 */
function getSmtpTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: user.trim(),
        pass: pass.trim().replace(/\s+/g, ''), // Eliminar posibles espacios de contraseñas de app de Google
      },
    });
  }

  return null;
}

/**
 * Función centralizada para enviar emails transaccionales
 */
export async function sendEmail({ to, subject, html, replyTo }: SendEmailParams) {
  try {
    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to];
    if (recipients.length === 0) {
      console.warn('[Email] No se especificaron destinatarios.');
      return { success: false, error: 'No recipients provided' };
    }

    const defaultReplyTo = process.env.EMAIL_REPLY_TO?.trim();

    // 1. Intentar envío prioritario por SMTP / Gmail del Club si está configurado
    const smtpTransporter = getSmtpTransporter();
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;

    if (smtpTransporter && smtpUser) {
      console.log(`[Email SMTP] Enviando vía SMTP (${smtpUser}) a: ${recipients.join(', ')}`);
      const fromName = process.env.EMAIL_FROM_NAME || 'Sporting Saladar';
      const effectiveReplyTo = replyTo || defaultReplyTo || smtpUser.trim();

      const info = await smtpTransporter.sendMail({
        from: `"${fromName}" <${smtpUser.trim()}>`,
        to: recipients.join(', '),
        subject,
        html,
        replyTo: effectiveReplyTo,
      });

      console.log(`[Email SMTP OK] Enviado con éxito. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, provider: 'smtp' };
    }

    // 2. Fallback a Resend si la clave existe
    const resendApiKey = process.env.RESEND_API_KEY?.trim();
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      const fromAddress = process.env.EMAIL_FROM || 'Sporting Saladar <onboarding@resend.dev>';
      const effectiveReplyTo = replyTo || defaultReplyTo;

      console.log(`[Email Resend] Enviando vía Resend a: ${recipients.join(', ')}`);
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: recipients,
        subject,
        html,
        replyTo: effectiveReplyTo,
      });

      if (error) {
        console.error('[Email Resend Error]:', error);
        return { success: false, error: error.message };
      }

      console.log(`[Email Resend OK] ID: ${data?.id}`);
      return { success: true, data, provider: 'resend' };
    }

    console.warn(`[Email MOCK] Sin proveedor configurado. Simulación a ${recipients.join(', ')}: "${subject}"`);
    return { success: false, mock: true, error: 'Configura SMTP_USER y SMTP_PASS en .env para activar el correo' };
  } catch (err: any) {
    console.error('[Email Exception]:', err);
    return { success: false, error: err.message || 'Error al enviar email' };
  }
}

export interface RegistrationFeeItem {
  id?: string;
  concept: string;
  amountCents: number;
  amountPaidCents: number;
  status: string;
  dueDate?: string | null;
  installmentNumber?: number;
  totalInstallments?: number;
}

export interface RegistrationPaymentSummary {
  totalAmountCents: number;
  totalPaidCents: number;
  totalPendingCents: number;
  paymentMethod: string;
  paymentPlan: string;
  fees: RegistrationFeeItem[];
  paymentReference?: string;
  clubIban?: string | null;
}

export interface PlayerRegistrationEmailParams {
  playerName: string;
  tutorName?: string;
  category?: string;
  dorsal?: string | number;
  loginUrl?: string;
  paymentSummary?: RegistrationPaymentSummary;
}

function formatCentsToEur(cents: number): string {
  const eur = (cents || 0) / 100;
  return eur.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatFeeDate(dateStr?: string | null): string {
  if (!dateStr) return 'Por determinar';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

/**
 * Plantilla HTML: Bienvenida y Confirmación de Inscripción de Jugador
 * Informa del registro oficial, estado económico real de las cuotas y acceso al portal.
 */
export function getPlayerRegistrationEmailHtml(params: PlayerRegistrationEmailParams): string {
  const {
    playerName,
    tutorName,
    category,
    dorsal,
    loginUrl = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/login` : 'https://app.clubsportingsaladar.com/login',
    paymentSummary,
  } = params;

  const hasFees = paymentSummary && Array.isArray(paymentSummary.fees) && paymentSummary.fees.length > 0;
  const isTransfer = paymentSummary?.paymentMethod?.toLowerCase().includes('transferencia');
  const isFractional = paymentSummary?.paymentPlan === 'Fraccionado' || (paymentSummary?.fees && paymentSummary.fees.length > 1);

  // Renderizado dinámico de la sección económica
  let paymentDetailsHtml = '';

  if (!paymentSummary || !hasFees) {
    paymentDetailsHtml = `
      <div class="row">
        <span class="label">Modalidad:</span>
        <span class="value">Inscripción sin cuota inicial / Gestión directa con el club</span>
      </div>
    `;
  } else {
    // 1. Resumen de totales
    paymentDetailsHtml += `
      <div class="row">
        <span class="label">Total Inscripción:</span>
        <span class="value">${formatCentsToEur(paymentSummary.totalAmountCents)}</span>
      </div>
      <div class="row">
        <span class="label">Abonado:</span>
        <span class="value" style="color: ${paymentSummary.totalPaidCents > 0 ? '#059669' : '#64748b'};">${formatCentsToEur(paymentSummary.totalPaidCents)}</span>
      </div>
      <div class="row">
        <span class="label">Pendiente:</span>
        <span class="value" style="color: ${paymentSummary.totalPendingCents > 0 ? '#d97706' : '#059669'};">${formatCentsToEur(paymentSummary.totalPendingCents)}</span>
      </div>
      <div class="row">
        <span class="label">Modalidad elegida:</span>
        <span class="value">${paymentSummary.paymentPlan || (isFractional ? 'Fraccionado' : 'Pago Único')} (${paymentSummary.paymentMethod})</span>
      </div>
    `;

    // 2. Desglose de cuotas individuales
    if (paymentSummary.fees.length > 0) {
      paymentDetailsHtml += `
        <div style="margin-top: 14px; padding-top: 10px; border-top: 1px solid #e2e8f0;">
          <div style="font-size: 11.5px; font-weight: 800; text-transform: uppercase; color: #475569; margin-bottom: 8px;">
            Desglose de Cuotas:
          </div>
      `;

      paymentSummary.fees.forEach((fee, idx) => {
        const isPaid = fee.status === 'pagado' || (fee.amountPaidCents >= fee.amountCents && fee.amountCents > 0);
        const statusLabel = isPaid ? 'PAGADA' : (fee.status === 'pdte_verif' ? 'PDTE. VERIFICACIÓN' : 'PENDIENTE');
        const statusColor = isPaid ? '#059669' : (fee.status === 'pdte_verif' ? '#2563eb' : '#d97706');
        const cuotaNumber = fee.installmentNumber || idx + 1;
        const totalNum = fee.totalInstallments || paymentSummary.fees.length;

        paymentDetailsHtml += `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; margin-bottom: 8px; font-size: 13px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span style="font-weight: 700; color: #0f172a;">
                ${totalNum > 1 ? `Cuota ${cuotaNumber} de ${totalNum}` : 'Cuota Única'}
              </span>
              <span style="font-weight: 800; color: ${statusColor}; font-size: 11px; padding: 2px 8px; background: ${isPaid ? '#ecfdf5' : '#fffbeb'}; border-radius: 6px; border: 1px solid ${statusColor}40;">
                ${statusLabel}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 12px;">
              <span>Importe: <strong style="color: #0f172a;">${formatCentsToEur(fee.amountCents)}</strong></span>
              ${fee.dueDate ? `<span>Vencimiento: ${formatFeeDate(fee.dueDate)}</span>` : ''}
            </div>
          </div>
        `;
      });

      paymentDetailsHtml += `</div>`;
    }

    // 3. Nota específica para pago fraccionado (segunda cuota)
    if (isFractional && paymentSummary.fees.length > 1) {
      paymentDetailsHtml += `
        <div style="background: #eff6ff; border-left: 3px solid #3b82f6; border-radius: 0 8px 8px 0; padding: 10px 12px; margin-top: 10px; font-size: 12px; line-height: 1.5; color: #1e40af;">
          <strong>Información de Cuota 2:</strong> La segunda cuota está prevista para el vencimiento correspondiente y se intentará cobrar automáticamente mediante el método de pago autorizado.
        </div>
      `;
    }

    // 4. Caja especial para Transferencia Bancaria
    if (isTransfer) {
      paymentDetailsHtml += `
        <div style="background: #fefce8; border: 1px solid #fef08a; border-radius: 12px; padding: 14px; margin-top: 14px;">
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #854d0e; margin-bottom: 8px;">
            🏦 Instrucciones para Transferencia Bancaria
          </div>
          ${paymentSummary.clubIban ? `
            <div style="margin-bottom: 6px; font-size: 13px;">
              <span style="color: #713f12; font-weight: 600;">IBAN del Club:</span><br>
              <strong style="font-family: monospace; font-size: 14px; color: #0f172a; letter-spacing: 0.5px;">${paymentSummary.clubIban}</strong>
            </div>
          ` : ''}
          ${paymentSummary.paymentReference ? `
            <div style="margin-bottom: 6px; font-size: 13px;">
              <span style="color: #713f12; font-weight: 600;">Concepto / Referencia obligatorio:</span><br>
              <strong style="font-family: monospace; font-size: 14px; color: #1e3a8a; background: #e0e7ff; padding: 2px 6px; border-radius: 4px;">${paymentSummary.paymentReference}</strong>
            </div>
          ` : ''}
          <div style="font-size: 12px; color: #854d0e; line-height: 1.4; margin-top: 6px;">
            Por favor, realiza la transferencia indicando la referencia exacta en el concepto para que Secretaría pueda conciliar tu ingreso.
          </div>
        </div>
      `;
    }
  }

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Inscripción Registrada - Sporting Saladar</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
      .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: #ffffff; padding: 36px 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
      .badge { display: inline-block; background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; margin-bottom: 12px; border: 1px solid rgba(52, 211, 153, 0.3); }
      .content { padding: 32px 30px; }
      .salutation { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
      .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px 20px; margin: 18px 0; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 13.5px; }
      .row:last-child { border-bottom: none; }
      .label { color: #64748b; font-weight: 600; }
      .value { color: #0f172a; font-weight: 800; text-align: right; }
      .button-container { text-align: center; margin: 28px 0 14px; }
      .button { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); }
      .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <span class="badge">Inscripción Registrada Correctamente</span>
        <h1>Club Sporting Saladar</h1>
      </div>
      <div class="content">
        <div class="salutation">¡Hola, ${tutorName || playerName}! 👋</div>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 18px;">
          Te confirmamos que la ficha de inscripción de <strong>${playerName}</strong> para la temporada ha sido registrada correctamente en el sistema oficial del club.
        </p>

        <!-- Bloque 1: Ficha del Jugador -->
        <div class="card">
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #059669; margin-bottom: 10px;">
            📋 Datos de la Ficha:
          </div>
          <div class="row">
            <span class="label">Jugador/a:</span>
            <span class="value">${playerName}</span>
          </div>
          ${category ? `
          <div class="row">
            <span class="label">Categoría:</span>
            <span class="value">${category}</span>
          </div>` : ''}
          ${dorsal ? `
          <div class="row">
            <span class="label">Dorsal Asignado:</span>
            <span class="value">#${dorsal}</span>
          </div>` : ''}
          <div class="row">
            <span class="label">Estado de la Ficha:</span>
            <span class="value" style="color: #059669;">Registrada / En trámite administrativo</span>
          </div>
        </div>

        <!-- Bloque 2: Estado del Pago y Cuotas -->
        <div class="card">
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #2563eb; margin-bottom: 10px;">
            💳 Estado de tu Pago:
          </div>
          ${paymentDetailsHtml}
        </div>

        <!-- Bloque 3: Acceso al Portal de Familias -->
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px 20px; margin: 18px 0;">
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; margin-bottom: 8px;">
            📱 Acceso al Portal de Familias:
          </div>
          <p style="font-size: 13.5px; line-height: 1.5; color: #475569; margin: 0 0 10px 0;">
            Ya puedes acceder al portal para consultar el calendario de entrenamientos, convocatorias de partidos, recibos de cuotas y comunicados del equipo.
          </p>
          <div style="font-size: 12.5px; color: #64748b; background: #ffffff; padding: 8px 12px; border-radius: 8px; border: 1px solid #e2e8f0;">
            Accede con tu <strong>correo electrónico</strong> y la <strong>contraseña</strong> elegida durante el registro.
          </div>
        </div>

        <div class="button-container">
          <a href="${loginUrl}" class="button" target="_blank">Acceder al Portal de Familias ⚽</a>
        </div>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Sporting Saladar Club de Fútbol. Todos los derechos reservados.<br>
        Este correo ha sido generado automáticamente por la plataforma del club.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Plantilla HTML: Nuevo Mensaje o Aviso de Equipo
 */
export function getTeamMessageEmailHtml(params: {
  senderName: string;
  senderRole?: string;
  teamName: string;
  messageContent: string;
  viewUrl?: string;
}): string {
  const { senderName, senderRole = 'Cuerpo Técnico', teamName, messageContent, viewUrl = 'https://app-gestiondeclubes.vercel.app/dashboard/mensajes' } = params;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Nuevo Aviso del Equipo - Sporting Saladar</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
      .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 32px 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
      .badge { display: inline-block; background: rgba(99, 102, 241, 0.25); color: #c7d2fe; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; margin-bottom: 10px; border: 1px solid rgba(199, 210, 254, 0.3); }
      .content { padding: 32px 30px; }
      .message-box { background: #f1f5f9; border-left: 4px solid #6366f1; border-radius: 0 16px 16px 0; padding: 20px; margin: 20px 0; font-size: 14.5px; line-height: 1.7; color: #1e293b; }
      .sender-info { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; font-size: 13px; color: #64748b; font-weight: 700; }
      .button-container { text-align: center; margin: 28px 0 10px; }
      .button { display: inline-block; background: #4f46e5; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14px; padding: 13px 28px; border-radius: 14px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3); }
      .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <span class="badge">📢 Nuevo Aviso de Equipo</span>
        <h1>${teamName}</h1>
      </div>
      <div class="content">
        <div class="sender-info">
          💬 Publicado por: <strong style="color: #0f172a; margin-left: 4px;">${senderName}</strong> (${senderRole})
        </div>

        <div class="message-box">
          ${messageContent.replace(/\n/g, '<br>')}
        </div>

        <p style="font-size: 13px; line-height: 1.5; color: #64748b; margin-top: 20px;">
          Puedes responder a este mensaje o ver todos los comunicados del equipo directamente desde la app.
        </p>

        <div class="button-container">
          <a href="${viewUrl}" class="button" target="_blank">Abrir Mensajes en la App 📱</a>
        </div>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Sporting Saladar. Notificación de mensajería interna.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Plantilla HTML: Convocatoria de Partido
 */
export function getConvocationEmailHtml(params: {
  playerName: string;
  teamName: string;
  rivalName: string;
  date: string;
  time?: string;
  location?: string;
  meetingTime?: string;
  notes?: string;
  viewUrl?: string;
}): string {
  const {
    playerName,
    teamName,
    rivalName,
    date,
    time = 'Por confirmar',
    location = 'Por determinar',
    meetingTime,
    notes,
    viewUrl = 'https://app-gestiondeclubes.vercel.app/dashboard/matches'
  } = params;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Convocatoria de Partido - Sporting Saladar</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
      .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: #ffffff; padding: 36px 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
      .badge { display: inline-block; background: rgba(59, 130, 246, 0.25); color: #93c5fd; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; margin-bottom: 12px; border: 1px solid rgba(147, 197, 253, 0.3); }
      .content { padding: 32px 30px; }
      .salutation { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
      .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 20px 0; }
      .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
      .row:last-child { border-bottom: none; }
      .label { color: #64748b; font-weight: 600; }
      .value { color: #0f172a; font-weight: 800; text-align: right; }
      .button-container { text-align: center; margin: 30px 0 10px; }
      .button { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
      .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <span class="badge">⚽ Oficial: Convocatoria de Partido</span>
        <h1>${teamName} vs ${rivalName}</h1>
      </div>
      <div class="content">
        <div class="salutation">¡Hola! 👋</div>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          <strong>${playerName}</strong> ha sido convocado/a para disputar el próximo encuentro oficial.
        </p>

        <div class="card">
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #2563eb; margin-bottom: 10px;">
            Detalles de la Convocatoria:
          </div>
          <div class="row">
            <span class="label">Jugador/a:</span>
            <span class="value">${playerName}</span>
          </div>
          <div class="row">
            <span class="label">Equipo:</span>
            <span class="value">${teamName}</span>
          </div>
          <div class="row">
            <span class="label">Rival:</span>
            <span class="value">${rivalName}</span>
          </div>
          <div class="row">
            <span class="label">Fecha del Partido:</span>
            <span class="value">${date}</span>
          </div>
          <div class="row">
            <span class="label">Hora de Inicio:</span>
            <span class="value">${time}</span>
          </div>
          ${meetingTime ? `
          <div class="row">
            <span class="label">Hora de Citación:</span>
            <span class="value" style="color: #2563eb;">${meetingTime}</span>
          </div>` : ''}
          <div class="row">
            <span class="label">Lugar / Campo:</span>
            <span class="value">${location}</span>
          </div>
        </div>

        ${notes ? `
        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 0 12px 12px 0; padding: 14px; margin: 15px 0; font-size: 13.5px; color: #1e3a8a;">
          <strong>Instrucciones del Cuerpo Técnico:</strong><br>${notes.replace(/\n/g, '<br>')}
        </div>` : ''}

        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Por favor, accede a la aplicación para confirmar o justificar la asistencia lo antes posible.
        </p>

        <div class="button-container">
          <a href="${viewUrl}" class="button" target="_blank">Confirmar Asistencia en la App 📲</a>
        </div>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Sporting Saladar Club de Fútbol. Convocatoria generada automáticamente.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Plantilla HTML: Recordatorio 24h de Evento / Entrenamiento
 */
export function getEventReminderEmailHtml(params: {
  playerName?: string;
  title: string;
  eventType: string;
  date: string;
  time?: string;
  location?: string;
  viewUrl?: string;
}): string {
  const {
    playerName,
    title,
    eventType,
    date,
    time = 'Por confirmar',
    location = 'Instalaciones del Club',
    viewUrl = 'https://app-gestiondeclubes.vercel.app/dashboard'
  } = params;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Recordatorio: ${title} - Sporting Saladar</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
      .header { background: linear-gradient(135deg, #064e3b 0%, #065f46 100%); color: #ffffff; padding: 32px 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
      .badge { display: inline-block; background: rgba(52, 211, 153, 0.25); color: #a7f3d0; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; margin-bottom: 10px; border: 1px solid rgba(167, 243, 208, 0.3); }
      .content { padding: 32px 30px; }
      .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 20px 0; }
      .row { display: flex; justify-content: space-between; padding: 7px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
      .row:last-child { border-bottom: none; }
      .label { color: #64748b; font-weight: 600; }
      .value { color: #0f172a; font-weight: 800; text-align: right; }
      .button-container { text-align: center; margin: 28px 0 10px; }
      .button { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14px; padding: 13px 28px; border-radius: 14px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); }
      .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <span class="badge">⏰ Recordatorio (Próximas 24 Horas)</span>
        <h1>${title}</h1>
      </div>
      <div class="content">
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          ${playerName ? `Hola, te recordamos la cita programada para <strong>${playerName}</strong>:` : 'Te recordamos la siguiente actividad programada en el club:'}
        </p>

        <div class="card">
          <div class="row">
            <span class="label">Tipo de Actividad:</span>
            <span class="value">${eventType}</span>
          </div>
          <div class="row">
            <span class="label">Fecha:</span>
            <span class="value">${date}</span>
          </div>
          <div class="row">
            <span class="label">Horario:</span>
            <span class="value">${time}</span>
          </div>
          <div class="row">
            <span class="label">Ubicación:</span>
            <span class="value">${location}</span>
          </div>
        </div>

        <p style="font-size: 13.5px; line-height: 1.5; color: #64748b;">
          Recuerda ser puntual y llevar la indumentaria oficial correspondiente. Si tienes cualquier inconveniente de asistencia, por favor regístralo en la app.
        </p>

        <div class="button-container">
          <a href="${viewUrl}" class="button" target="_blank">Ver Detalles en la App 📲</a>
        </div>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Sporting Saladar. Recordatorio automático de calendario.
      </div>
    </div>
  </body>
  </html>
  `;
}

/**
 * Plantilla HTML: Alerta General / Comunicado Oficial
 */
export function getGeneralAlertEmailHtml(params: {
  title: string;
  content: string;
  senderName?: string;
  viewUrl?: string;
}): string {
  const {
    title,
    content,
    senderName = 'Dirección Deportiva',
    viewUrl = 'https://app-gestiondeclubes.vercel.app/dashboard'
  } = params;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>${title} - Sporting Saladar</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
      .header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: #ffffff; padding: 32px 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
      .badge { display: inline-block; background: rgba(245, 158, 11, 0.25); color: #fde68a; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; margin-bottom: 10px; border: 1px solid rgba(253, 230, 138, 0.3); }
      .content { padding: 32px 30px; }
      .message-box { background: #f8fafc; border-left: 4px solid #f59e0b; border-radius: 0 16px 16px 0; padding: 20px; margin: 20px 0; font-size: 14.5px; line-height: 1.7; color: #1e293b; }
      .button-container { text-align: center; margin: 28px 0 10px; }
      .button { display: inline-block; background: #0f172a; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 14px; padding: 13px 28px; border-radius: 14px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.3); }
      .footer { background: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <span class="badge">📢 Comunicado Oficial</span>
        <h1>${title}</h1>
      </div>
      <div class="content">
        <div style="font-size: 13px; color: #64748b; font-weight: 700; margin-bottom: 12px;">
          Emitido por: <strong>${senderName}</strong>
        </div>

        <div class="message-box">
          ${content.replace(/\n/g, '<br>')}
        </div>

        <div class="button-container">
          <a href="${viewUrl}" class="button" target="_blank">Acceder a la Plataforma 📲</a>
        </div>
      </div>
      <div class="footer">
        © ${new Date().getFullYear()} Sporting Saladar Club de Fútbol.
      </div>
    </div>
  </body>
  </html>
  `;
}
