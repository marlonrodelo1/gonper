import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_EMAIL || 'Gomper <hola@gestori.es>';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gestori.es';

let _resend: Resend | null = null;
function getClient(): Resend | null {
  if (!apiKey) return null;
  if (!_resend) _resend = new Resend(apiKey);
  return _resend;
}

/** Devuelve el cliente Resend compartido (o null si falta RESEND_API_KEY). */
export function getResendClient(): Resend | null {
  return getClient();
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

/**
 * Envía un email. Si RESEND_API_KEY no está configurada, hace log y devuelve null
 * (no lanza error). Esto permite que el deploy no se rompa por falta de la key
 * y los flujos críticos (reserva, etc.) continúen.
 */
export async function sendEmail(params: SendEmailParams): Promise<string | null> {
  const client = getClient();
  if (!client) {
    console.log('[email:noop]', { to: params.to, subject: params.subject });
    return null;
  }
  try {
    const { data, error } = await client.emails.send({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    });
    if (error) {
      console.error('[email:error]', error);
      return null;
    }
    return data?.id ?? null;
  } catch (err) {
    console.error('[email:throw]', err);
    return null;
  }
}

// ============================================
// Helpers de plantillas (paleta cream)
// ============================================
const COLOR_BG = '#F7F3EC';
const COLOR_PAPER = '#FBF8F2';
const COLOR_INK = '#1A1815';
const COLOR_STONE = '#6B6356';
const COLOR_TERRACOTTA = '#C5562C';
const COLOR_LINE = '#E5DFD3';

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function layout(opts: { titulo: string; cuerpoHtml: string }): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<title>${escapeHtml(opts.titulo)}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:${COLOR_INK}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLOR_BG};padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="560" cellspacing="0" cellpadding="0" border="0" style="background:${COLOR_PAPER};border:1px solid ${COLOR_LINE};border-radius:16px;overflow:hidden">
        <tr><td style="padding:32px 32px 8px">
          <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:${COLOR_STONE}">Gomper</div>
        </td></tr>
        ${opts.cuerpoHtml}
        <tr><td style="padding:24px 32px 28px;border-top:1px solid ${COLOR_LINE}">
          <p style="margin:0;font-size:12px;color:${COLOR_STONE};line-height:1.5">
            <a href="${siteUrl}" style="color:${COLOR_TERRACOTTA};text-decoration:none">gestori.es</a>
            · Tu recepcionista digital para salones.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function botonHtml(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${COLOR_TERRACOTTA};color:#ffffff;text-decoration:none;font-size:15px;font-weight:500;padding:14px 24px;border-radius:999px">${escapeHtml(label)}</a>`;
}

// ============================================
// Emails transaccionales del onboarding
// ============================================
export interface EmailResult {
  ok: boolean;
  error?: string;
}

async function sendTemplate(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailResult> {
  const client = getClient();
  if (!client) {
    return { ok: false, error: 'RESEND_API_KEY no configurado' };
  }
  try {
    const { data, error } = await client.emails.send({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    if (error) {
      console.error('[email:error]', error);
      return { ok: false, error: error.message ?? 'Error enviando email' };
    }
    return { ok: !!data?.id, error: data?.id ? undefined : 'Sin id de envío' };
  } catch (err) {
    console.error('[email:throw]', err);
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return { ok: false, error: message };
  }
}

export async function enviarEmailBienvenida(params: {
  to: string;
  salonNombre: string;
  salonSlug: string;
}): Promise<EmailResult> {
  const subject = `Bienvenido a Gomper, ${params.salonNombre}`;
  const panelUrl = `${siteUrl}/panel/hoy`;
  const publicUrl = `${siteUrl}/s/${params.salonSlug}`;
  const cuerpoHtml = `
    <tr><td style="padding:8px 32px 16px">
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:500;line-height:1.2;color:${COLOR_INK}">
        Bienvenido a Gomper
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${COLOR_INK}">
        Acabas de crear el salón <strong>${escapeHtml(params.salonNombre)}</strong>.
        Tienes 7 días de prueba gratis para configurarlo todo y dejar que Juanita
        atienda tus reservas 24/7.
      </p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:${COLOR_STONE}">
        Tres cosas rápidas que recomendamos hacer ahora:
      </p>
      <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.7;color:${COLOR_INK}">
        <li>Revisa los servicios y precios precargados.</li>
        <li>Ajusta tus horarios reales en <em>Configuración</em>.</li>
        <li>Conecta tu bot de Telegram para empezar a recibir reservas.</li>
      </ol>
      <div style="margin:0 0 12px">
        ${botonHtml('Abrir mi panel', panelUrl)}
      </div>
      <p style="margin:16px 0 0;font-size:13px;color:${COLOR_STONE}">
        Tu web pública: <a href="${publicUrl}" style="color:${COLOR_TERRACOTTA};text-decoration:none">${escapeHtml(publicUrl)}</a>
      </p>
    </td></tr>
  `;
  return sendTemplate({
    to: params.to,
    subject,
    html: layout({ titulo: subject, cuerpoHtml }),
  });
}

export async function enviarRecordatorioTrialAcaba(params: {
  to: string;
  salonNombre: string;
  diasRestantes: number;
}): Promise<EmailResult> {
  const dias = Math.max(0, Math.floor(params.diasRestantes));
  const subject =
    dias <= 0
      ? `Tu prueba en Gomper acaba hoy`
      : `Quedan ${dias} día${dias === 1 ? '' : 's'} de prueba en Gomper`;
  const panelUrl = `${siteUrl}/panel/configuracion`;
  const cuerpoHtml = `
    <tr><td style="padding:8px 32px 16px">
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:500;line-height:1.2;color:${COLOR_INK}">
        ${dias <= 0 ? 'Tu prueba acaba hoy' : `Quedan ${dias} día${dias === 1 ? '' : 's'}`}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${COLOR_INK}">
        Hola, ${escapeHtml(params.salonNombre)}.
        Tu periodo de prueba en Gomper está a punto de terminar.
      </p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:${COLOR_STONE}">
        Activa el plan por 30€/mes para no perder las reservas, los clientes
        ni la configuración que ya has hecho.
      </p>
      <div>${botonHtml('Activar mi plan', panelUrl)}</div>
    </td></tr>
  `;
  return sendTemplate({
    to: params.to,
    subject,
    html: layout({ titulo: subject, cuerpoHtml }),
  });
}

export async function enviarConfirmacionSuscripcion(params: {
  to: string;
  salonNombre: string;
}): Promise<EmailResult> {
  const subject = `Suscripción activa en Gomper`;
  const panelUrl = `${siteUrl}/panel/hoy`;
  const cuerpoHtml = `
    <tr><td style="padding:8px 32px 16px">
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:500;line-height:1.2;color:${COLOR_INK}">
        Suscripción confirmada
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${COLOR_INK}">
        Gracias por confiar en Gomper, ${escapeHtml(params.salonNombre)}.
        Tu plan de 30€/mes está activo y no perderás ningún dato.
      </p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:${COLOR_STONE}">
        Recibirás la factura mensual en este mismo email. Puedes gestionar
        o cancelar la suscripción cuando quieras desde el panel.
      </p>
      <div>${botonHtml('Ir al panel', panelUrl)}</div>
    </td></tr>
  `;
  return sendTemplate({
    to: params.to,
    subject,
    html: layout({ titulo: subject, cuerpoHtml }),
  });
}
