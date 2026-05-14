import type { MarcaPublica } from '@/lib/marcas/query';

type Props = {
  marcas: MarcaPublica[];
};

/**
 * Marquee horizontal infinito con los logos de las marcas activas.
 * Se duplica el array para que el loop sea visualmente continuo.
 *
 * Sin librerías ni JS. Animación CSS pura.
 */
export function MarcasSlider({ marcas }: Props) {
  if (marcas.length === 0) return null;

  const dobles = [...marcas, ...marcas];

  return (
    <section className="py-16 sm:py-20 px-6 bg-cream-2 border-y border-line/60">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal text-center mb-10">
          <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-3">
            Marcas con las que ya trabajamos
          </div>
          <h2
            className="tight font-medium text-ink mb-4"
            style={{ fontSize: 'clamp(28px,3.6vw,42px)', lineHeight: 1.15 }}
          >
            Vende productos profesionales{' '}
            <span className="font-serif-it">sin stock, sin riesgo</span>
          </h2>
          <p className="text-[14.5px] text-stone max-w-[560px] mx-auto leading-relaxed">
            Tu salón activa los productos de cada marca. Nosotros cobramos al
            cliente y la marca envía directo. Tú recibes tu comisión en cada
            venta, sin almacenar nada.
          </p>
        </div>

        <div className="marcas-marquee reveal" data-delay="100">
          <div className="marcas-marquee-track">
            {dobles.map((m, i) => (
              <div
                key={`${m.slug}-${i}`}
                className="marcas-marquee-item shrink-0 mx-6 sm:mx-10 flex items-center justify-center"
                aria-hidden={i >= marcas.length ? 'true' : undefined}
              >
                {m.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.logoUrl}
                    alt={m.nombre}
                    className="h-12 sm:h-16 w-auto object-contain opacity-80 hover:opacity-100 transition"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-[18px] sm:text-[22px] font-serif-it text-stone/70">
                    {m.nombre}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .marcas-marquee {
          overflow: hidden;
          mask-image: linear-gradient(
            to right,
            transparent 0,
            black 80px,
            black calc(100% - 80px),
            transparent 100%
          );
          -webkit-mask-image: linear-gradient(
            to right,
            transparent 0,
            black 80px,
            black calc(100% - 80px),
            transparent 100%
          );
        }
        .marcas-marquee-track {
          display: flex;
          width: max-content;
          animation: marcas-scroll 28s linear infinite;
        }
        .marcas-marquee:hover .marcas-marquee-track {
          animation-play-state: paused;
        }
        @keyframes marcas-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marcas-marquee-track {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}
