import Link from 'next/link';

import { Icon } from './icons';
import { categoriaBy, type SalonCard as SalonCardData } from '@/lib/marketplace/query';

type Props = { s: SalonCardData };

/** Oscurece/clarea un hex en una cantidad. Para fondos del banner placeholder. */
function shade(hex: string, amt: number): string {
  const m = hex.replace('#', '');
  const num = parseInt(m, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function SalonCard({ s }: Props) {
  const c = categoriaBy(s.tipoNegocio);
  const initial = s.nombre.charAt(0).toUpperCase();
  const ratingText =
    s.ratingAvg !== null && s.totalResenas > 0
      ? s.ratingAvg.toFixed(1)
      : '—';

  return (
    <Link
      href={`/s/${s.slug}`}
      className="salon-card group block bg-paper border border-line rounded-[24px] overflow-hidden focus:outline-none focus:ring-2 focus:ring-ink/20"
    >
      {/* Banner */}
      <div className="relative" style={{ aspectRatio: '5/3' }}>
        {s.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.bannerUrl}
            alt={s.nombre}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0 banner-pattern"
            style={{
              background: `linear-gradient(135deg, ${c.soft} 0%, ${c.soft} 60%, ${shade(c.soft, -6)} 100%)`,
            }}
          >
            <div className="absolute inset-0 banner-pattern" />
            <div className="absolute inset-0 grid place-items-center">
              <div
                className="font-serif-it select-none"
                style={{
                  fontSize: 'clamp(110px, 18vw, 200px)',
                  color: c.deep,
                  opacity: 0.18,
                  lineHeight: 1,
                }}
              >
                {initial}
              </div>
            </div>
          </div>
        )}
        {/* Categoría chip top-right */}
        <div className="absolute top-3 right-3">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] tight font-medium"
            style={{
              background: 'rgba(251,248,242,0.92)',
              color: c.deep,
              backdropFilter: 'blur(6px)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: c.dot }}
            />
            {c.label}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-3 pb-5 relative">
        {/* Logo solapando */}
        <div
          className="absolute -top-7 left-5 w-14 h-14 rounded-full overflow-hidden border-[3px] border-paper bg-cream-2 shrink-0 grid place-items-center"
          style={{ boxShadow: '0 8px 16px -8px rgba(26,24,21,0.18)' }}
        >
          {s.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={s.logoUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full grid place-items-center font-serif-it text-[24px]"
              style={{ background: c.soft, color: c.deep }}
            >
              {initial}
            </div>
          )}
        </div>

        <div className="pt-7">
          <h3
            className="font-playfair text-ink leading-tight"
            style={{ fontSize: '21px', letterSpacing: '-0.01em' }}
          >
            {s.nombre}
          </h3>
          {s.ciudad && (
            <div className="mt-1 flex items-center gap-1.5 text-[12.5px] text-stone">
              <Icon.Pin width="11" height="11" className="text-stone/70" />
              <span>{s.ciudad}</span>
            </div>
          )}
          {s.descripcionCorta && (
            <p
              className="mt-3 text-[13.5px] text-stone leading-relaxed line-clamp-2"
              style={{ textWrap: 'pretty' }}
            >
              {s.descripcionCorta}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-line/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[13px] tight">
            <Icon.Star
              width="13"
              height="13"
              style={{ color: 'var(--sage-deep)' }}
            />
            <span className="text-ink font-medium">{ratingText}</span>
            {s.totalResenas > 0 && (
              <span className="text-stone/70">({s.totalResenas})</span>
            )}
          </div>
          <span className="card-cta inline-flex items-center gap-1.5 px-4 py-2 rounded-full terra-btn text-[12.5px] font-medium tight">
            Ver salón <Icon.Arrow width="12" height="12" />
          </span>
        </div>
      </div>
    </Link>
  );
}
