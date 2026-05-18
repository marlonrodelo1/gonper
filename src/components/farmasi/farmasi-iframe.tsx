import Link from 'next/link';

type Props = {
  /** Username Farmasi del BI dueño de la tienda (la URL será farmasi.es/{username}). */
  username: string;
  /** Nombre que se muestra en la barra superior (ej: "Mi Salón" o "Gonper Studio"). */
  titulo: string;
  /** href para el botón "Volver". Por defecto "/" (landing). */
  volverHref?: string;
  /** Texto del botón "Volver". */
  volverLabel?: string;
};

/**
 * Renderiza la tienda Farmasi de un BI dentro de Gonper en un iframe a
 * pantalla completa con una barra superior fija.
 *
 * El iframe NO tiene sandbox para que farmasi.es pueda usar scripts,
 * cookies y formularios normalmente (carrito, login, checkout).
 *
 * Riesgos asumidos:
 * - Doble carga (Gonper + Farmasi).
 * - Cliente puede ver su sesión Farmasi previa dentro del iframe.
 * - Si Farmasi.es añade X-Frame-Options en el futuro, el iframe queda
 *   en blanco. Verificado el 2026-05-18: actualmente no lo tienen.
 */
export function FarmasiIframe({
  username,
  titulo,
  volverHref = '/',
  volverLabel = 'Volver',
}: Props) {
  const src = `https://www.farmasi.es/${encodeURIComponent(username)}`;

  return (
    <div className="bg-cream text-ink flex h-screen w-screen flex-col overflow-hidden">
      {/* Barra superior fija: identifica que sigues en Gonper */}
      <header
        className="flex shrink-0 items-center justify-between gap-3 border-b border-line bg-paper/95 px-4 py-2.5 backdrop-blur"
        style={{ minHeight: 52 }}
      >
        <Link
          href={volverHref}
          className="tight inline-flex items-center gap-1.5 rounded-full border border-line bg-cream/70 px-3 py-1.5 text-[12.5px] font-medium text-ink transition hover:bg-cream"
        >
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="M11 6l-6 6 6 6" />
          </svg>
          {volverLabel}
        </Link>

        <div className="flex min-w-0 flex-col items-center text-center">
          <span className="text-[10.5px] uppercase tracking-[0.22em] text-stone/70">
            Tienda Farmasi
          </span>
          <span className="tight max-w-[60vw] truncate text-[13.5px] font-medium text-ink">
            {titulo}
          </span>
        </div>

        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Abrir en una pestaña nueva"
          className="tight inline-flex items-center gap-1.5 rounded-full border border-line bg-cream/70 px-3 py-1.5 text-[12.5px] font-medium text-ink transition hover:bg-cream"
        >
          <span className="hidden sm:inline">Abrir aparte</span>
          <svg
            viewBox="0 0 24 24"
            width="13"
            height="13"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M7 17L17 7" />
            <path d="M8 7h9v9" />
          </svg>
        </a>
      </header>

      <iframe
        src={src}
        title={`Tienda Farmasi · ${titulo}`}
        className="min-h-0 w-full flex-1 border-0"
        loading="eager"
        referrerPolicy="no-referrer-when-downgrade"
        allow="payment; clipboard-read; clipboard-write"
      />
    </div>
  );
}
