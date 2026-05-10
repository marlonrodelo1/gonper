import Link from 'next/link';

import { Icon } from './icons';
import { categoriaBy, type SalonCard as SalonCardData } from '@/lib/marketplace/categorias';

type Props = {
  s: SalonCardData;
  /** Distancia en km del usuario al salón (si hay geolocalización). */
  distanciaKm?: number | null;
};

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

function formatDistancia(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export function SalonCard({ s, distanciaKm }: Props) {
  const c = categoriaBy(s.tipoNegocio);
  const initial = s.nombre.charAt(0).toUpperCase();
  const ratingText =
    s.ratingAvg !== null && s.totalResenas > 0 ? s.ratingAvg.toFixed(1) : null;

  return (
    <Link
      href={`/s/${s.slug}`}
      className="salon-card group relative block overflow-hidden rounded-[22px] focus:outline-none focus:ring-2 focus:ring-ink/20"
      style={{ aspectRatio: '16/9' }}
    >
      {/* Banner ocupa toda la card */}
      <div className="absolute inset-0">
        {s.bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.bannerUrl}
            alt={s.nombre}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div
            className="absolute inset-0 banner-pattern"
            style={{
              background: `linear-gradient(135deg, ${c.soft} 0%, ${c.soft} 60%, ${shade(c.soft, -6)} 100%)`,
            }}
          >
            <div className="absolute inset-0 grid place-items-center">
              <div
                className="font-serif-it select-none"
                style={{
                  fontSize: 'clamp(110px, 22vw, 220px)',
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
      </div>

      {/* Gradient legibilidad — oscurece la mitad inferior */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0) 35%, rgba(0,0,0,0.35) 65%, rgba(0,0,0,0.78) 100%)',
        }}
      />

      {/* Top-left: logo glassmorphism */}
      <div
        className="absolute left-3 top-3 h-10 w-10 overflow-hidden rounded-full grid place-items-center"
        style={{
          background: 'rgba(255,255,255,0.28)',
          backdropFilter: 'saturate(160%) blur(10px)',
          WebkitBackdropFilter: 'saturate(160%) blur(10px)',
          border: '1px solid rgba(255,255,255,0.45)',
          boxShadow: '0 6px 16px -6px rgba(0,0,0,0.25)',
        }}
      >
        {s.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.logoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span
            className="font-serif-it text-[18px]"
            style={{ color: c.deep }}
          >
            {initial}
          </span>
        )}
      </div>

      {/* Top-right: chips glassmorphism (categoría + distancia opcional) */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] tight font-medium"
          style={{
            background: 'rgba(255,255,255,0.32)',
            backdropFilter: 'saturate(160%) blur(10px)',
            WebkitBackdropFilter: 'saturate(160%) blur(10px)',
            border: '1px solid rgba(255,255,255,0.5)',
            color: '#1A1815',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: c.dot }}
          />
          {c.label}
        </span>
        {distanciaKm !== null && distanciaKm !== undefined && (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] tight font-medium"
            style={{
              background: 'rgba(0,0,0,0.42)',
              backdropFilter: 'saturate(160%) blur(10px)',
              WebkitBackdropFilter: 'saturate(160%) blur(10px)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#FBF8F2',
            }}
          >
            <Icon.Pin width="11" height="11" />
            {formatDistancia(distanciaKm)}
          </span>
        )}
      </div>

      {/* Bottom: nombre + ciudad + rating + CTA, todo sobre el gradient */}
      <div className="absolute bottom-0 left-0 right-0 p-4 text-paper">
        <h3
          className="font-playfair leading-tight"
          style={{
            fontSize: '20px',
            letterSpacing: '-0.01em',
            textShadow: '0 1px 6px rgba(0,0,0,0.45)',
          }}
        >
          {s.nombre}
        </h3>
        {s.ciudad && (
          <div className="mt-0.5 flex items-center gap-1 text-[12px] text-paper/85">
            <Icon.Pin width="11" height="11" />
            <span className="truncate">{s.ciudad}</span>
          </div>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 text-[12.5px] tight">
            {ratingText ? (
              <>
                <Icon.Star
                  width="12"
                  height="12"
                  style={{ color: '#F2C24A' }}
                />
                <span className="font-medium">{ratingText}</span>
                <span className="text-paper/65">({s.totalResenas})</span>
              </>
            ) : (
              <span className="text-paper/55 text-[11.5px]">Sin reseñas aún</span>
            )}
          </div>
          <span className="card-cta inline-flex items-center gap-1 px-3 py-1.5 rounded-full terra-btn text-[11.5px] font-medium tight">
            Ver salón <Icon.Arrow width="11" height="11" />
          </span>
        </div>
      </div>
    </Link>
  );
}
