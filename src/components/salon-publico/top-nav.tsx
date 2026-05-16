'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Icon } from './icons';

type Props = {
  salonNombre: string;
  logoUrl?: string | null;
  /** Slug del salón. Si estamos en una subruta (/s/[slug]/tienda, etc.) lo
   * usamos para construir href absolutos a /s/[slug]#anchor en lugar de
   * anchors locales que no existen en esa página. */
  salonSlug?: string | null;
};

export function TopNav({ salonNombre, logoUrl, salonSlug }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Estamos en una subruta del salón (ej. /s/[slug]/tienda) cuando hay slug
  // y el pathname no es exactamente /s/[slug]. En ese caso, los anchors
  // del nav deben apuntar a la página principal del salón.
  const enSubruta = Boolean(
    salonSlug && pathname && pathname !== `/s/${salonSlug}`,
  );
  const anchorBase = enSubruta && salonSlug ? `/s/${salonSlug}` : '';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { l: 'Servicios', h: `${anchorBase}#servicios` },
    { l: 'Galería', h: `${anchorBase}#galeria` },
    { l: 'Equipo', h: `${anchorBase}#equipo` },
    { l: 'Reservar', h: `${anchorBase}#reservar` },
  ];

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-4 pt-4 sm:pt-5">
        <header
          className={`floating-nav pointer-events-auto mx-auto w-full max-w-[920px] flex items-center justify-between gap-2 transition-all duration-300 ${scrolled ? 'is-scrolled' : ''}`}
          style={{ padding: '8px 8px 8px 18px', borderRadius: '999px' }}
        >
          {enSubruta && salonSlug ? (
            <Link
              href={`/s/${salonSlug}`}
              scroll={true}
              className="flex items-center gap-2.5 text-ink shrink-0 pr-2"
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={salonNombre}
                  className="h-8 w-8 rounded-full object-cover border border-line"
                />
              ) : (
                <span
                  className="w-7 h-7 rounded-full grid place-items-center"
                  style={{ background: 'var(--gestori-accent-soft)' }}
                >
                  <Icon.Sparkle width="14" height="14" className="text-gestori-accent" />
                </span>
              )}
              <span className="text-[16px] tight font-medium">{salonNombre}</span>
            </Link>
          ) : (
            <a href="#" className="flex items-center gap-2.5 text-ink shrink-0 pr-2">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={salonNombre}
                  className="h-8 w-8 rounded-full object-cover border border-line"
                />
              ) : (
                <span
                  className="w-7 h-7 rounded-full grid place-items-center"
                  style={{ background: 'var(--gestori-accent-soft)' }}
                >
                  <Icon.Sparkle width="14" height="14" className="text-gestori-accent" />
                </span>
              )}
              <span className="text-[16px] tight font-medium">{salonNombre}</span>
            </a>
          )}
          <nav className="hidden lg:flex items-center gap-1 text-[13.5px] text-stone">
            {links.map((l) =>
              enSubruta ? (
                <Link
                  key={l.h}
                  href={l.h}
                  scroll={true}
                  className="px-3 py-1.5 rounded-full hover:bg-ink/[0.05] hover:text-ink transition-colors"
                >
                  {l.l}
                </Link>
              ) : (
                <a
                  key={l.h}
                  href={l.h}
                  className="px-3 py-1.5 rounded-full hover:bg-ink/[0.05] hover:text-ink transition-colors"
                >
                  {l.l}
                </a>
              ),
            )}
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            {enSubruta ? (
              <Link
                href={`${anchorBase}#reservar`}
                scroll={true}
                className="text-[12.5px] font-medium px-4 py-2 rounded-full accent-btn"
              >
                Reservar
              </Link>
            ) : (
              <a
                href="#reservar"
                className="text-[12.5px] font-medium px-4 py-2 rounded-full accent-btn"
              >
                Reservar
              </a>
            )}
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menú"
              className="lg:hidden h-9 w-9 grid place-items-center rounded-full border border-line/80 bg-white/60 text-ink"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              >
                {open ? (
                  <>
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </>
                ) : (
                  <>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </header>
      </div>
      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm"></div>
        <div
          className="absolute top-[88px] left-4 right-4 bg-cream/95 backdrop-blur-xl border border-line rounded-2xl p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)]"
          onClick={(e) => e.stopPropagation()}
        >
          {links.map((l) =>
            enSubruta ? (
              <Link
                key={l.h}
                href={l.h}
                scroll={true}
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-xl text-[15px] text-ink hover:bg-ink/[0.05] flex items-center justify-between"
              >
                <span>{l.l}</span>
                <Icon.Arrow width="14" height="14" />
              </Link>
            ) : (
              <a
                key={l.h}
                href={l.h}
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-xl text-[15px] text-ink hover:bg-ink/[0.05] flex items-center justify-between"
              >
                <span>{l.l}</span>
                <Icon.Arrow width="14" height="14" />
              </a>
            ),
          )}
        </div>
      </div>
    </>
  );
}
