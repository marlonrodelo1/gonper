'use client';

import Link from 'next/link';
import { useRef, useState, type CSSProperties, type MouseEvent } from 'react';

import { Icon } from './icons';
import { SalonSlider } from './salon-slider';
import { categoriaBy, type SalonCard as SalonCardData } from '@/lib/marketplace/categorias';

type Props = {
  s: SalonCardData;
  /** Distancia en km del usuario al salón (si hay geolocalización). */
  distanciaKm?: number | null;
};

/** Oscurece/clarea un hex en una cantidad. Para fondos de placeholder. */
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

const TILT_MAX_DEG = 6;

export function SalonCard({ s, distanciaKm }: Props) {
  const c = categoriaBy(s.tipoNegocio);
  const initial = s.nombre.charAt(0).toUpperCase();
  const ratingText =
    s.ratingAvg !== null && s.totalResenas > 0 ? s.ratingAvg.toFixed(1) : null;

  const cardRef = useRef<HTMLAnchorElement>(null);
  const [tiltStyle, setTiltStyle] = useState<CSSProperties>({});
  const [activeImg, setActiveImg] = useState(0);

  function onMouseMove(e: MouseEvent<HTMLAnchorElement>) {
    if (!cardRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const rotateX = ((y - r.height / 2) / (r.height / 2)) * -TILT_MAX_DEG;
    const rotateY = ((x - r.width / 2) / (r.width / 2)) * TILT_MAX_DEG;
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.12s ease-out',
    });
  }

  function onMouseLeave() {
    setTiltStyle({
      transform:
        'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.4s ease-in-out',
    });
  }

  const tieneImagenes = s.imagenes.length > 0;
  const totalDots = Math.min(s.imagenes.length, 5);

  return (
    <Link
      ref={cardRef}
      href={`/s/${s.slug}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      style={{
        ...tiltStyle,
        transformStyle: 'preserve-3d',
        aspectRatio: '4/3',
      }}
      className="salon-card group relative block w-full overflow-hidden rounded-3xl shadow-lg focus:outline-none focus:ring-2 focus:ring-ink/20"
    >
      {/* Slider o placeholder de fondo */}
      <div
        className="absolute inset-0"
        style={{ transform: 'translateZ(-20px) scale(1.06)' }}
      >
        {tieneImagenes ? (
          <SalonSlider
            images={s.imagenes}
            alt={s.nombre}
            onActiveChange={setActiveImg}
          />
        ) : (
          <div
            className="absolute inset-0 banner-pattern"
            style={{
              background: `linear-gradient(135deg, ${c.soft} 0%, ${c.soft} 60%, ${shade(c.soft, -6)} 100%)`,
            }}
          >
            <div className="absolute inset-0 grid place-items-center">
              <span
                className="font-serif-it select-none"
                style={{
                  fontSize: 'clamp(110px, 22vw, 220px)',
                  color: c.deep,
                  opacity: 0.18,
                  lineHeight: 1,
                }}
              >
                {initial}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Gradient legibilidad */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.45) 75%, rgba(0,0,0,0.78) 100%)',
        }}
      />

      {/* Contenido — flota encima con efecto 3D */}
      <div
        className="absolute inset-0 flex flex-col p-3 sm:p-4"
        style={{ transform: 'translateZ(40px)' }}
      >
        {/* Glassmorphism header: nombre + ciudad + logo */}
        <div
          className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-2.5 sm:p-3 backdrop-blur-md"
          style={{ boxShadow: '0 6px 16px -8px rgba(0,0,0,0.18)' }}
        >
          <div className="min-w-0 flex-1">
            <h3
              className="font-playfair leading-tight text-white truncate"
              style={{ fontSize: '17px', letterSpacing: '-0.01em' }}
            >
              {s.nombre}
            </h3>
            {s.ciudad && (
              <div className="mt-0.5 flex items-center gap-1 text-[11.5px] text-white/80">
                <Icon.Pin width="10" height="10" />
                <span className="truncate">{s.ciudad}</span>
              </div>
            )}
          </div>
          <div
            className="h-9 w-9 shrink-0 overflow-hidden rounded-full grid place-items-center"
            style={{
              background: 'rgba(255,255,255,0.32)',
              backdropFilter: 'saturate(160%) blur(8px)',
              WebkitBackdropFilter: 'saturate(160%) blur(8px)',
              border: '1px solid rgba(255,255,255,0.45)',
            }}
          >
            {s.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.logoUrl}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <span
                className="font-serif-it text-[16px]"
                style={{ color: c.deep }}
              >
                {initial}
              </span>
            )}
          </div>
        </div>

        {/* Chip categoría flotando bajo el header (right) */}
        <div className="mt-2 flex items-start justify-between gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium tight"
            style={{
              background: 'rgba(0,0,0,0.42)',
              backdropFilter: 'saturate(160%) blur(8px)',
              WebkitBackdropFilter: 'saturate(160%) blur(8px)',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#FBF8F2',
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
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-medium tight"
              style={{
                background: 'rgba(0,0,0,0.42)',
                backdropFilter: 'saturate(160%) blur(8px)',
                WebkitBackdropFilter: 'saturate(160%) blur(8px)',
                border: '1px solid rgba(255,255,255,0.18)',
                color: '#FBF8F2',
              }}
            >
              <Icon.Pin width="10" height="10" />
              {formatDistancia(distanciaKm)}
            </span>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Footer: rating + dots */}
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 text-[11.5px] text-white/90 tight">
            {ratingText ? (
              <>
                <Icon.Star
                  width="11"
                  height="11"
                  style={{ color: '#F2C24A' }}
                />
                <span className="font-medium">{ratingText}</span>
                <span className="text-white/65">({s.totalResenas})</span>
              </>
            ) : (
              <span className="text-white/55 text-[10.5px]">
                Sin reseñas aún
              </span>
            )}
          </div>
          {totalDots > 1 && (
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalDots }).map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{
                    width: i === activeImg ? '14px' : '6px',
                    background:
                      i === activeImg
                        ? 'rgba(255,255,255,0.95)'
                        : 'rgba(255,255,255,0.4)',
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
