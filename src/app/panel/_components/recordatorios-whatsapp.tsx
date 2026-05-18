import { buildWhatsAppLink } from '@/lib/whatsapp/numero';

/**
 * Item de recordatorio: cita en las próximas 2 h con un cliente que
 * tiene teléfono guardado. Cada uno se renderiza con un botón que abre
 * WhatsApp ya rellenado con destinatario + mensaje — el dueño solo
 * pulsa "Enviar" en la app de WhatsApp. NO es envío automático real
 * (eso requiere WhatsApp Business API). Es semi-automático: 1 toque
 * y enviado.
 */
export type RecordatorioCita = {
  citaId: string;
  clienteNombre: string;
  clienteTelefono: string | null;
  servicioNombre: string;
  profesionalNombre: string;
  horaTexto: string; // "16:30"
  salonNombre: string;
};

type Props = {
  citas: RecordatorioCita[];
};

export function RecordatoriosWhatsApp({ citas }: Props) {
  // Si no hay citas próximas o ninguna tiene teléfono válido, no renderizamos
  // nada (no ensuciamos la home con un widget vacío).
  const items = citas
    .map((c) => {
      const primerNombre = c.clienteNombre.split(' ')[0] ?? c.clienteNombre;
      const mensaje =
        `Hola ${primerNombre}! 👋 Te recuerdo que tienes tu reserva en ` +
        `${c.salonNombre} hoy a las ${c.horaTexto} para ${c.servicioNombre} ` +
        `con ${c.profesionalNombre}. ¡Te esperamos!`;
      const link = buildWhatsAppLink(c.clienteTelefono, mensaje);
      return { ...c, link };
    })
    .filter((c) => c.link !== null);

  if (items.length === 0) return null;

  return (
    <section
      className="card flex flex-col overflow-hidden"
      aria-labelledby="recordatorios-wa-title"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-cream/30 px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ background: 'rgba(37,211,102,0.15)', color: '#1F8C4D' }}
            aria-hidden
          >
            {/* WhatsApp glyph simplificado */}
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
              <path d="M19.05 4.91A9.82 9.82 0 0012.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 004.78 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.02zM12.04 20.13h-.01a8.18 8.18 0 01-4.17-1.14l-.3-.18-3.11.82.83-3.04-.2-.31a8.21 8.21 0 01-1.25-4.37c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.41a8.18 8.18 0 012.41 5.83c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.18-.54.06-.25-.12-1.04-.39-1.99-1.23-.74-.66-1.23-1.47-1.37-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.55.12.17 1.73 2.65 4.2 3.72.59.25 1.05.4 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.67-1.17.21-.58.21-1.07.14-1.17-.06-.1-.22-.16-.47-.28z" />
            </svg>
          </span>
          <div>
            <h2
              id="recordatorios-wa-title"
              className="tight text-[15px] font-medium text-ink"
            >
              Recordatorios WhatsApp
            </h2>
            <p className="text-[11.5px] text-stone">
              Citas en las próximas 2 horas · 1 toque y enviado
            </p>
          </div>
        </div>
        <span className="tabular text-[12px] font-medium text-stone">
          {items.length} pendiente{items.length === 1 ? '' : 's'}
        </span>
      </header>

      <ul className="divide-y divide-line/70">
        {items.map((item) => (
          <li
            key={item.citaId}
            className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="tight flex items-baseline gap-2 text-[14px] font-medium text-ink">
                <span className="tabular shrink-0 text-stone">
                  {item.horaTexto}
                </span>
                <span className="truncate">{item.clienteNombre}</span>
              </div>
              <div className="mt-0.5 truncate text-[12.5px] text-stone">
                {item.servicioNombre} · {item.profesionalNombre}
                {item.clienteTelefono ? ` · ${item.clienteTelefono}` : ''}
              </div>
            </div>
            <a
              href={item.link!}
              target="_blank"
              rel="noopener noreferrer"
              className="tight inline-flex shrink-0 items-center justify-center gap-1.5 self-stretch rounded-full px-4 py-2 text-[12.5px] font-medium text-paper transition hover:scale-[1.02] active:scale-[0.97] sm:self-auto"
              style={{
                background:
                  'linear-gradient(180deg, #25D366 0%, #1F8C4D 100%)',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 16px -8px rgba(31,140,77,0.4)',
              }}
            >
              <svg
                viewBox="0 0 24 24"
                width="13"
                height="13"
                fill="currentColor"
                aria-hidden
              >
                <path d="M19.05 4.91A9.82 9.82 0 0012.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.46 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 004.78 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.02zM12.04 20.13h-.01a8.18 8.18 0 01-4.17-1.14l-.3-.18-3.11.82.83-3.04-.2-.31a8.21 8.21 0 01-1.25-4.37c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.41a8.18 8.18 0 012.41 5.83c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.78.97-.14.17-.29.18-.54.06-.25-.12-1.04-.39-1.99-1.23-.74-.66-1.23-1.47-1.37-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05 0 1.21.88 2.38 1 2.55.12.17 1.73 2.65 4.2 3.72.59.25 1.05.4 1.4.52.59.19 1.12.16 1.55.1.47-.07 1.47-.6 1.67-1.17.21-.58.21-1.07.14-1.17-.06-.1-.22-.16-.47-.28z" />
              </svg>
              Recordar por WhatsApp
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
