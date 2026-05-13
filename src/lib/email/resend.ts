import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_EMAIL || 'Gonper Studio <hola@gonperstudio.shop>';
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://gonperstudio.shop';

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
          <div style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:${COLOR_STONE}">Gonper Studio</div>
        </td></tr>
        ${opts.cuerpoHtml}
        <tr><td style="padding:24px 32px 28px;border-top:1px solid ${COLOR_LINE}">
          <p style="margin:0;font-size:12px;color:${COLOR_STONE};line-height:1.5">
            <a href="${siteUrl}" style="color:${COLOR_TERRACOTTA};text-decoration:none">gonperstudio.shop</a>
            · Tu asistente digital para salones.
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

function botonSecundarioHtml(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:${COLOR_PAPER};color:${COLOR_INK};text-decoration:none;font-size:15px;font-weight:500;padding:13px 23px;border-radius:999px;border:1px solid ${COLOR_LINE}">${escapeHtml(label)}</a>`;
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
  const subject = `Ya estás dentro, ${params.salonNombre}`;
  const panelUrl = `${siteUrl}/panel/hoy`;
  const compartirUrl = `${siteUrl}/panel/compartir`;
  const telegramUrl = `${siteUrl}/panel/config/bot`;
  const publicUrl = `${siteUrl}/s/${params.salonSlug}`;
  const cuerpoHtml = `
    <tr><td style="padding:8px 32px 16px">
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:500;line-height:1.2;color:${COLOR_INK}">
        Ya estás dentro
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${COLOR_INK}">
        Bienvenido a Gonper Studio, <strong>${escapeHtml(params.salonNombre)}</strong>.
        Tu cuenta está activa con 30 días gratis. A partir de ahora vas a llevar
        tu negocio desde el móvil — sin abrir el ordenador.
      </p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:${COLOR_STONE}">
        Tres pasos para empezar a recibir reservas hoy:
      </p>
      <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;line-height:1.75;color:${COLOR_INK}">
        <li><strong>Configura tus servicios y horarios</strong> en el panel (5 minutos).</li>
        <li><strong>Conecta Telegram</strong> para que tu asistente IA te avise de cada reserva en el móvil. Es gratis y se hace en 1 minuto.</li>
        <li><strong>Comparte tu link</strong> por WhatsApp, Instagram o pega el QR en el mostrador. Tus clientes reservan solos.</li>
      </ol>
      <div style="margin:0 0 12px">
        ${botonHtml('Abrir mi panel', panelUrl)}
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0">
        <tr>
          <td style="padding:0 8px 8px 0">${botonSecundarioHtml('Conectar Telegram', telegramUrl)}</td>
          <td style="padding:0 0 8px 0">${botonSecundarioHtml('Compartir mi tienda', compartirUrl)}</td>
        </tr>
      </table>
      <p style="margin:20px 0 0;font-size:13px;color:${COLOR_STONE}">
        Tu web pública ya está activa:<br/>
        <a href="${publicUrl}" style="color:${COLOR_TERRACOTTA};text-decoration:none">${escapeHtml(publicUrl)}</a>
      </p>
    </td></tr>
  `;
  return sendTemplate({
    to: params.to,
    subject,
    html: layout({ titulo: subject, cuerpoHtml }),
  });
}

export async function enviarConfirmacionReserva(params: {
  to: string;
  citaId: string;
  clienteNombre: string;
  salonNombre: string;
  salonSlug: string;
  salonDireccion: string | null;
  salonTelefono: string | null;
  inicioIso: string;
  servicioNombre: string;
  duracionMin: number;
  profesionalNombre: string;
  precioEur: number | string;
  timezone?: string;
}): Promise<EmailResult> {
  const tz = params.timezone || 'Europe/Madrid';
  const fecha = new Date(params.inicioIso);
  const fechaFmt = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: tz,
  }).format(fecha);
  const horaFmt = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  }).format(fecha);
  const precioNum = Number(params.precioEur || 0);
  const precioFmt = precioNum > 0 ? `${precioNum.toFixed(2).replace(/\.00$/, '')} €` : '—';

  // Token cancelar firmado (por si quiere anular antes del recordatorio)
  const { signCitaToken } = await import('@/lib/citas/token');
  const cancelarUrl = `${siteUrl}/x/${signCitaToken(params.citaId, 'cancelar')}`;

  const direccion = params.salonDireccion ? escapeHtml(params.salonDireccion) : '';
  const mapsUrl = params.salonDireccion
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(params.salonDireccion)}`
    : null;
  const salonUrl = `${siteUrl}/s/${params.salonSlug}`;

  // Link "Añadir a Google Calendar" — formato YYYYMMDDTHHmmssZ (UTC)
  const inicioUtc = fecha;
  const finUtc = new Date(inicioUtc.getTime() + params.duracionMin * 60_000);
  const fmtCal = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const calDescripcion = [
    `Servicio: ${params.servicioNombre}`,
    `Profesional: ${params.profesionalNombre}`,
    precioNum > 0 ? `Precio: ${precioFmt}` : null,
    `Reservado en ${salonUrl}`,
  ]
    .filter(Boolean)
    .join('\\n');
  const googleCalParams = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${params.servicioNombre} en ${params.salonNombre}`,
    dates: `${fmtCal(inicioUtc)}/${fmtCal(finUtc)}`,
    details: calDescripcion,
    location: params.salonDireccion ?? params.salonNombre,
  });
  const googleCalUrl = `https://calendar.google.com/calendar/render?${googleCalParams.toString()}`;

  const subject = `✅ Cita confirmada en ${params.salonNombre} — ${fechaFmt} a las ${horaFmt}`;

  const cuerpoHtml = `
    <tr><td style="padding:8px 32px 16px">
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;line-height:1.2;color:${COLOR_INK}">
        Tu cita está reservada
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${COLOR_INK}">
        Hola ${escapeHtml(params.clienteNombre.split(' ')[0] ?? params.clienteNombre)}, hemos guardado tu cita en
        <strong>${escapeHtml(params.salonNombre)}</strong>:
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;font-size:14px;color:${COLOR_INK}">
        <tr><td style="padding:4px 0;color:${COLOR_STONE};width:120px">📅 Fecha</td><td style="padding:4px 0"><strong>${escapeHtml(fechaFmt)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:${COLOR_STONE}">⏰ Hora</td><td style="padding:4px 0"><strong>${escapeHtml(horaFmt)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:${COLOR_STONE}">✂️ Servicio</td><td style="padding:4px 0">${escapeHtml(params.servicioNombre)} (${params.duracionMin} min)</td></tr>
        <tr><td style="padding:4px 0;color:${COLOR_STONE}">👤 Con</td><td style="padding:4px 0">${escapeHtml(params.profesionalNombre)}</td></tr>
        <tr><td style="padding:4px 0;color:${COLOR_STONE}">💶 Precio</td><td style="padding:4px 0">${precioFmt}</td></tr>
        ${direccion ? `<tr><td style="padding:4px 0;color:${COLOR_STONE}">📍 Lugar</td><td style="padding:4px 0">${direccion}</td></tr>` : ''}
        ${params.salonTelefono ? `<tr><td style="padding:4px 0;color:${COLOR_STONE}">📞 Teléfono</td><td style="padding:4px 0">${escapeHtml(params.salonTelefono)}</td></tr>` : ''}
      </table>

      <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:${COLOR_STONE}">
        Te enviaremos un recordatorio dos horas antes para confirmar tu asistencia.
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px">
        <tr>
          <td style="padding:0 8px 8px 0">${botonHtml('📅 Añadir a Google Calendar', googleCalUrl)}</td>
          ${mapsUrl ? `<td style="padding:0 8px 8px 0">${botonSecundarioHtml('Cómo llegar', mapsUrl)}</td>` : ''}
        </tr>
        <tr>
          <td style="padding:0 0 8px 0" colspan="2">${botonSecundarioHtml('Cancelar cita', cancelarUrl)}</td>
        </tr>
      </table>

      <p style="margin:16px 0 0;font-size:12.5px;line-height:1.55;color:${COLOR_STONE}">
        Web del salón: <a href="${salonUrl}" style="color:${COLOR_TERRACOTTA};text-decoration:none">${escapeHtml(salonUrl)}</a>
      </p>
    </td></tr>
  `;

  return sendTemplate({
    to: params.to,
    subject,
    html: layout({ titulo: subject, cuerpoHtml }),
  });
}

export async function enviarTrialVencido(params: {
  to: string;
  salonNombre: string;
}): Promise<EmailResult> {
  const subject = `Tu prueba en Gonper Studio ha terminado`;
  const panelUrl = `${siteUrl}/panel/config/suscripcion`;
  const cuerpoHtml = `
    <tr><td style="padding:8px 32px 16px">
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:500;line-height:1.2;color:${COLOR_INK}">
        Tu prueba ha terminado
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${COLOR_INK}">
        Hola, ${escapeHtml(params.salonNombre)}.
        Tus 30 días gratis han acabado. Hemos pausado el acceso al panel
        para que puedas decidir con calma.
      </p>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.55;color:${COLOR_STONE}">
        Tus datos están a salvo. Cuando añadas tu tarjeta, recuperas el
        acceso al instante y todo sigue funcionando: clientes, citas,
        configuración del agente. Plan Básico 30€/mes, sin permanencia.
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

export async function enviarRecordatorioTrialAcaba(params: {
  to: string;
  salonNombre: string;
  diasRestantes: number;
}): Promise<EmailResult> {
  const dias = Math.max(0, Math.floor(params.diasRestantes));
  const subject =
    dias <= 0
      ? `Tu prueba en Gonper Studio acaba hoy`
      : `Quedan ${dias} día${dias === 1 ? '' : 's'} de prueba en Gonper Studio`;
  const panelUrl = `${siteUrl}/panel/configuracion`;
  const cuerpoHtml = `
    <tr><td style="padding:8px 32px 16px">
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:500;line-height:1.2;color:${COLOR_INK}">
        ${dias <= 0 ? 'Tu prueba acaba hoy' : `Quedan ${dias} día${dias === 1 ? '' : 's'}`}
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${COLOR_INK}">
        Hola, ${escapeHtml(params.salonNombre)}.
        Tu periodo de prueba en Gonper Studio está a punto de terminar.
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

export async function enviarRecordatorioCita(params: {
  to: string;
  citaId: string;
  clienteNombre: string;
  salonNombre: string;
  salonSlug: string;
  inicioIso: string;
  servicioNombre: string;
  duracionMin: number;
  profesionalNombre: string;
  timezone?: string;
}): Promise<EmailResult> {
  const tz = params.timezone || 'Europe/Madrid';
  const fecha = new Date(params.inicioIso);
  const fechaFmt = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: tz,
  }).format(fecha);
  const horaFmt = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: tz,
  }).format(fecha);

  // Tokens firmados con HMAC para confirmar/cancelar desde email
  const { signCitaToken } = await import('@/lib/citas/token');
  const confirmarUrl = `${siteUrl}/c/${signCitaToken(params.citaId, 'confirmar')}`;
  const cancelarUrl = `${siteUrl}/x/${signCitaToken(params.citaId, 'cancelar')}`;

  const subject = `¿Confirmas tu cita en ${params.salonNombre}?`;
  const cuerpoHtml = `
    <tr><td style="padding:8px 32px 16px">
      <h1 style="margin:0 0 12px;font-size:24px;font-weight:500;line-height:1.2;color:${COLOR_INK}">
        ¿Confirmas tu cita?
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${COLOR_INK}">
        Hola ${escapeHtml(params.clienteNombre.split(' ')[0] ?? params.clienteNombre)}, tu cita en
        <strong>${escapeHtml(params.salonNombre)}</strong> es en aproximadamente 2 horas.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;font-size:14px;color:${COLOR_INK}">
        <tr><td style="padding:4px 0;color:${COLOR_STONE};width:120px">📅 Fecha</td><td style="padding:4px 0"><strong>${escapeHtml(fechaFmt)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:${COLOR_STONE}">⏰ Hora</td><td style="padding:4px 0"><strong>${escapeHtml(horaFmt)}</strong></td></tr>
        <tr><td style="padding:4px 0;color:${COLOR_STONE}">✂️ Servicio</td><td style="padding:4px 0">${escapeHtml(params.servicioNombre)} (${params.duracionMin} min)</td></tr>
        <tr><td style="padding:4px 0;color:${COLOR_STONE}">👤 Con</td><td style="padding:4px 0">${escapeHtml(params.profesionalNombre)}</td></tr>
      </table>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.55;color:${COLOR_INK}">
        <strong>Por favor, confirma si vas a asistir.</strong> Así sabemos que cuentes con la cita y no se la damos a nadie más.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 8px">
        <tr>
          <td style="padding:0 8px 8px 0">${botonHtml('Sí, confirmo', confirmarUrl)}</td>
          <td style="padding:0 0 8px 0">${botonSecundarioHtml('No podré ir', cancelarUrl)}</td>
        </tr>
      </table>
      <p style="margin:8px 0 0;font-size:12px;line-height:1.55;color:${COLOR_STONE}">
        Si tienes problemas con los botones, contacta directamente con el salón.
      </p>
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
  const subject = `Suscripción activa en Gonper Studio`;
  const panelUrl = `${siteUrl}/panel/hoy`;
  const cuerpoHtml = `
    <tr><td style="padding:8px 32px 16px">
      <h1 style="margin:0 0 12px;font-size:26px;font-weight:500;line-height:1.2;color:${COLOR_INK}">
        Suscripción confirmada
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.55;color:${COLOR_INK}">
        Gracias por confiar en Gonper Studio, ${escapeHtml(params.salonNombre)}.
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
