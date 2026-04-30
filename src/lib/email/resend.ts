import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.RESEND_FROM_EMAIL || 'Gomper <onboarding@resend.dev>';

let _resend: Resend | null = null;
function getClient(): Resend | null {
  if (!apiKey) return null;
  if (!_resend) _resend = new Resend(apiKey);
  return _resend;
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
