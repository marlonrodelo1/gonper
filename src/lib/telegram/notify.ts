/**
 * Helpers para enviar notificaciones por Telegram al dueño del salón.
 * Tolerantes a fallos: si el envío falla, sólo logueamos. NUNCA romper el
 * flujo principal (creación de cita, etc.) por un fallo del bot.
 */

const ORIGEN_LABEL: Record<string, string> = {
  telegram: '💬 Telegram',
  whatsapp: '📱 WhatsApp',
  web: '🌐 Web pública',
  manual: '✍️ Panel',
  dueno: '👤 Dueño',
};

interface NotifNuevaCitaParams {
  /** Token del bot del salón (requerido — sin esto no se notifica). */
  botToken: string | null | undefined;
  /** chat_id del dueño en Telegram (vinculado con /start CODIGO). */
  duenoChatId: string | null | undefined;
  /** Datos para el mensaje. */
  salonNombre: string;
  clienteNombre: string;
  servicioNombre: string;
  profesionalNombre: string;
  inicioIso: string;
  precioEur: number | string;
  origen: string;
  timezone?: string;
}

function formateaFechaHora(iso: string, tz: string): string {
  const fecha = new Date(iso);
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
  return `${fechaFmt} a las ${horaFmt}`;
}

/**
 * Avisa al dueño por Telegram de que tiene una cita nueva. Si no hay
 * bot_token o el dueño no está vinculado (chat_id), no hace nada.
 *
 * Devuelve true si el mensaje se envió OK, false si no se intentó o falló.
 * NUNCA lanza — los errores se logean.
 */
export async function notificarDuenoNuevaCita(
  p: NotifNuevaCitaParams,
): Promise<boolean> {
  if (!p.botToken || !p.duenoChatId) {
    return false;
  }

  const tz = p.timezone || 'Europe/Madrid';
  const cuando = formateaFechaHora(p.inicioIso, tz);
  const origenLabel = ORIGEN_LABEL[p.origen] ?? p.origen;
  const precio = Number(p.precioEur || 0);
  const precioFmt = precio > 0 ? ` · ${precio.toFixed(2)} €` : '';

  const texto = [
    `🗓️ *Nueva cita en ${escapeMd(p.salonNombre)}*`,
    '',
    `👤 *${escapeMd(p.clienteNombre)}*`,
    `✂️ ${escapeMd(p.servicioNombre)}${precioFmt}`,
    `👥 con ${escapeMd(p.profesionalNombre)}`,
    `📅 ${escapeMd(cuando)}`,
    '',
    `Origen: ${origenLabel}`,
  ].join('\n');

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${p.botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: p.duenoChatId,
          text: texto,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      console.warn('[notify:dueno] Telegram respondió no-OK', res.status, t);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[notify:dueno] error enviando Telegram', err);
    return false;
  }
}

/**
 * Markdown legacy de Telegram tiene caracteres especiales que conviene
 * escapar para que no se rompa el formato (cliente puede tener "_" en su
 * nombre, etc.).
 */
function escapeMd(s: string): string {
  return String(s).replace(/([_*`[\]])/g, '\\$1');
}
