'use client';

import { useState } from 'react';
import { Icon } from '../_components/icons';

type Props = {
  salonNombre: string;
  salonSlug: string;
  publicUrl: string;
  qrUrl: string;
  qrUrlHighRes: string;
};

export function CompartirCliente({
  salonNombre,
  salonSlug,
  publicUrl,
  qrUrl,
  qrUrlHighRes,
}: Props) {
  const [copied, setCopied] = useState<'url' | 'msg' | null>(null);

  const mensaje = `¡Hola! Te dejo el link para reservar tu cita en *${salonNombre}*: ${publicUrl}\n\nEs muy fácil — eliges servicio, día y hora, y recibes confirmación por email. ¡Pruébalo!`;

  const mensajeEmail = `Hola!\n\nTe paso el link para reservar tu cita en ${salonNombre}: ${publicUrl}\n\nEliges servicio, día y hora, y recibes confirmación por email. Te llevará 30 segundos.\n\nUn abrazo.`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  const mailtoUrl = `mailto:?subject=${encodeURIComponent(
    `Reserva tu cita en ${salonNombre}`,
  )}&body=${encodeURIComponent(mensajeEmail)}`;

  const copy = async (text: string, key: 'url' | 'msg') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1800);
    } catch {
      // fallback silencioso: el botón no muestra confirmación pero no rompe
    }
  };

  const descargarQr = async () => {
    try {
      const res = await fetch(qrUrlHighRes);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `qr-${salonSlug}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      console.error('Error descargando QR', e);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
      {/* Columna izquierda: link + botones de compartir */}
      <div className="flex flex-col gap-4">
        {/* Tu link público */}
        <div className="card p-5 md:p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Tu link público
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="flex-1 truncate rounded-xl border border-line bg-cream-2 px-4 py-3 text-[13.5px] text-ink">
              {publicUrl}
            </code>
            <button
              type="button"
              onClick={() => copy(publicUrl, 'url')}
              className="gloss-btn tight inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13.5px] font-medium"
            >
              {copied === 'url' ? (
                <>
                  <Icon.Check width="14" height="14" />
                  Copiado
                </>
              ) : (
                <>
                  <Icon.Sparkle width="14" height="14" /> Copiar
                </>
              )}
            </button>
          </div>
          <p className="mt-3 text-[12px] text-stone">
            Pega este link en la bio de Instagram, en Google Maps o donde quieras.
            Quien lo abra reserva en 30 segundos.
          </p>
        </div>

        {/* Compartir directo */}
        <div className="card p-5 md:p-6">
          <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Compartir con un cliente
          </div>
          <div className="mt-4 flex flex-col gap-3">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tight flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-4 transition hover:border-line-2 hover:bg-cream"
            >
              <span className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-paper"
                  style={{ background: '#25D366' }}
                  aria-hidden
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="currentColor"
                  >
                    <path d="M20.52 3.45A11.86 11.86 0 0 0 12.07 0C5.5 0 .17 5.34.17 11.91c0 2.1.55 4.16 1.6 5.97L0 24l6.27-1.64a11.86 11.86 0 0 0 5.8 1.49h.01c6.57 0 11.91-5.34 11.91-11.91 0-3.18-1.24-6.17-3.47-8.49zM12.08 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.72.97.99-3.62-.23-.37a9.86 9.86 0 0 1-1.51-5.27c0-5.46 4.44-9.9 9.9-9.9 2.65 0 5.13 1.03 7 2.9a9.84 9.84 0 0 1 2.9 7c0 5.46-4.44 9.88-9.92 9.88zm5.43-7.41c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48a9.07 9.07 0 0 1-1.66-2.07c-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.1 4.5.71.3 1.27.49 1.7.62.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35z" />
                  </svg>
                </span>
                <span className="flex flex-col text-left">
                  <span className="text-[14.5px] font-medium text-ink">
                    Compartir por WhatsApp
                  </span>
                  <span className="text-[12px] text-stone">
                    Mensaje con tu link, listo para enviar
                  </span>
                </span>
              </span>
              <Icon.Arrow width="14" height="14" className="text-stone" />
            </a>

            <a
              href={mailtoUrl}
              className="tight flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-4 transition hover:border-line-2 hover:bg-cream"
            >
              <span className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-paper"
                  style={{ background: '#C5562C' }}
                  aria-hidden
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 7l-10 6L2 7" />
                  </svg>
                </span>
                <span className="flex flex-col text-left">
                  <span className="text-[14.5px] font-medium text-ink">
                    Compartir por email
                  </span>
                  <span className="text-[12px] text-stone">
                    Abre tu cliente de correo con el mensaje
                  </span>
                </span>
              </span>
              <Icon.Arrow width="14" height="14" className="text-stone" />
            </a>

            <button
              type="button"
              onClick={() => copy(mensaje, 'msg')}
              className="tight flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-4 text-left transition hover:border-line-2 hover:bg-cream"
            >
              <span className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-cream"
                  aria-hidden
                >
                  <Icon.Sparkle width="18" height="18" />
                </span>
                <span className="flex flex-col text-left">
                  <span className="text-[14.5px] font-medium text-ink">
                    {copied === 'msg'
                      ? 'Mensaje copiado al portapapeles'
                      : 'Copiar mensaje completo'}
                  </span>
                  <span className="text-[12px] text-stone">
                    Pégalo en Instagram DM, Telegram o donde quieras
                  </span>
                </span>
              </span>
              {copied === 'msg' ? (
                <Icon.Check width="16" height="16" className="text-sage" />
              ) : (
                <Icon.Arrow width="14" height="14" className="text-stone" />
              )}
            </button>
          </div>

          <details className="mt-4 rounded-xl border border-line bg-cream-2 p-4 text-[13px] text-stone">
            <summary className="cursor-pointer font-medium text-ink">
              Ver mensaje pre-formateado
            </summary>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-ink">
              {mensaje}
            </pre>
          </details>
        </div>
      </div>

      {/* Columna derecha: QR */}
      <div className="card flex flex-col items-center gap-4 p-5 text-center md:p-8">
        <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Código QR de tu salón
        </div>
        <div className="rounded-2xl border border-line bg-paper p-4 md:p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrUrl}
            alt={`Código QR para ${salonNombre}`}
            width={320}
            height={320}
            className="h-[280px] w-[280px] md:h-[320px] md:w-[320px]"
          />
        </div>
        <div className="flex flex-col items-center gap-1">
          <p className="text-[14px] font-medium text-ink">{salonNombre}</p>
          <p className="text-[12px] text-stone">{publicUrl}</p>
        </div>
        <button
          type="button"
          onClick={descargarQr}
          className="gloss-btn tight inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium"
        >
          <Icon.Arrow width="14" height="14" /> Descargar QR (PNG)
        </button>
        <p className="max-w-xs text-[12px] text-stone">
          Imprímelo en el mostrador, escaparate o cartas. Quien lo escanea con
          el móvil entra directo a tu web pública para reservar.
        </p>
      </div>
    </div>
  );
}
