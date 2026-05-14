import Link from 'next/link';

type Props = {
  slug: string;
  agenteNombre: string;
  tieneTienda: boolean;
};

export function TiendaBanner({ slug, agenteNombre, tieneTienda }: Props) {
  if (!tieneTienda) return null;

  return (
    <section className="px-6 pt-16 sm:pt-20">
      <div className="mx-auto max-w-[1200px]">
        <div
          className="reveal relative overflow-hidden rounded-3xl border border-line bg-paper px-6 py-7 sm:px-10 sm:py-9"
        >
          <div
            className="absolute -bottom-16 -right-16 w-56 h-56 rounded-full opacity-40 pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, var(--gestori-accent-soft) 0%, transparent 70%)',
            }}
          />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              <span
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full grid place-items-center text-gestori-accent shrink-0"
                style={{ background: 'var(--gestori-accent-soft)' }}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="22"
                  height="22"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 7h12l-1 13H7L6 7z" />
                  <path d="M9 7a3 3 0 016 0" />
                </svg>
              </span>
              <div className="min-w-0">
                <div className="text-[12.5px] uppercase tracking-[0.22em] text-stone/80 mb-1.5">
                  Tienda online
                </div>
                <h3
                  className="tight font-medium text-ink"
                  style={{ fontSize: 'clamp(22px,2.6vw,28px)', lineHeight: 1.15 }}
                >
                  Llévate los productos{' '}
                  <span className="font-serif-it">que usamos contigo</span>
                </h3>
                <p className="mt-2 text-[13.5px] text-stone max-w-[460px]">
                  Cosmética y cuidado profesional, con recogida en el salón o
                  envío a domicilio. Pregunta a {agenteNombre} si necesitas un
                  consejo antes de comprar.
                </p>
              </div>
            </div>

            <Link
              href={`/s/${slug}/tienda`}
              className="self-start sm:self-center inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-[13.5px] font-medium tight text-paper transition hover:scale-[1.02] shrink-0"
              style={{
                background:
                  'linear-gradient(180deg, var(--gestori-accent) 0%, var(--gestori-accent-2) 100%)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.25), 0 10px 25px -10px var(--gestori-accent-2)',
              }}
            >
              Visitar tienda online
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
                <path d="M5 12h14" />
                <path d="M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
