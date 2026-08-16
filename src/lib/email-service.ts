import { Resend } from 'resend';

// Inicializar cliente Resend si la clave existe
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Remitente por defecto (usar dominio verificado o correo por defecto de Resend para pruebas)
const DEFAULT_FROM = process.env.EMAIL_FROM || 'Sporting Saladar <onboarding@resend.dev>';

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
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

    if (!resend) {
      console.info(`[Email MOCK] RESEND_API_KEY no configurada. Simulación de envío a ${recipients.join(', ')}: "${subject}"`);
      return { success: true, mock: true, message: 'Simulado en consola (configura RESEND_API_KEY en .env)' };
    }

    const { data, error } = await resend.emails.send({
      from: DEFAULT_FROM,
      to: recipients,
      subject,
      html,
      replyTo: replyTo || 'info@sportingsaladar.com',
    });

    if (error) {
      console.error('[Email Error] Error enviando email con Resend:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Email OK] Enviado con éxito a ${recipients.join(', ')} (ID: ${data?.id})`);
    return { success: true, data };
  } catch (err: any) {
    console.error('[Email Exception] Error en sendEmail:', err);
    return { success: false, error: err.message || 'Error desconocido al enviar email' };
  }
}

/**
 * Plantilla HTML: Bienvenida y Confirmación de Inscripción de Jugador
 */
export function getPlayerRegistrationEmailHtml(params: {
  playerName: string;
  tutorName?: string;
  category?: string;
  dorsal?: string | number;
  loginUrl?: string;
}): string {
  const { playerName, tutorName, category, dorsal, loginUrl = 'https://app-gestiondeclubes.vercel.app/login' } = params;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <title>Inscripción Confirmada - Sporting Saladar</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
      .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
      .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); color: #ffffff; padding: 36px 30px; text-align: center; }
      .header h1 { margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
      .badge { display: inline-block; background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 4px 12px; border-radius: 999px; margin-bottom: 12px; border: 1px solid rgba(52, 211, 153, 0.3); }
      .content { padding: 32px 30px; }
      .salutation { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
      .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 20px 0; }
      .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
      .row:last-child { border-bottom: none; }
      .label { color: #64748b; font-weight: 600; }
      .value { color: #0f172a; font-weight: 800; }
      .button-container { text-align: center; margin: 30px 0 10px; }
      .button { display: inline-block; background: #059669; color: #ffffff !important; text-decoration: none; font-weight: 800; font-size: 15px; padding: 14px 32px; border-radius: 14px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3); }
      .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <span class="badge">Inscripción Oficial Confirmada</span>
        <h1>Club Sporting Saladar</h1>
      </div>
      <div class="content">
        <div class="salutation">¡Hola, ${tutorName || playerName}! 👋</div>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Nos complace confirmarte que la inscripción para la temporada ha sido registrada exitosamente en nuestro sistema oficial.
        </p>

        <div class="card">
          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase; color: #059669; margin-bottom: 10px;">
            Datos de la Ficha Registrada:
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
            <span class="label">Estado:</span>
            <span class="value" style="color: #059669;">Activo / Formalizado</span>
          </div>
        </div>

        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Ya puedes acceder al <strong>Portal de Familias</strong> para consultar el calendario de entrenamientos, convocatorias de partidos, seguimiento formativo y mensajería del equipo.
        </p>

        <div class="button-container">
          <a href="${loginUrl}" class="button" target="_blank">Acceder al Portal del Club ⚽</a>
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
