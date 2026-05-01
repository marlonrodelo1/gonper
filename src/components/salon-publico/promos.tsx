import { Icon } from './icons';
import type { Promocion } from '@/lib/db/schema';

type Props = {
  agenteNombre: string;
  promociones: Promocion[];
};

const eurFmt = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2,
});

function formatEur(valor: string | null | undefined): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  if (Number.isNaN(n)) return null;
  // Si es entero, sin decimales; si no, dos decimales.
  if (Number.isInteger(n)) {
    return `${n}€`;
  }
  return eurFmt.format(n);
}

const validaHastaFmt = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
});

function formatValidaHasta(valor: string | null | undefined): string | null {
  if (!valor) return null;
  // valida_hasta viene como 'YYYY-MM-DD' (date). Construimos en local sin TZ shift.
  const partes = valor.split('-');
  if (partes.length !== 3) return null;
  const [y, m, d] = partes.map(Number);
  if (!y || !m || !d) return null;
  const fecha = new Date(y, m - 1, d);
  if (Number.isNaN(fecha.getTime())) return null;
  return `Hasta ${validaHastaFmt.format(fecha)}`;
}

export function Promos({ agenteNombre, promociones }: Props) {
  if (promociones.length === 0) return null;

  return (
    <section className="py-20 px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-3">Promociones</div>
            <h2 className="tight font-medium text-ink" style={{ fontSize: 'clamp(32px,4vw,46px)', lineHeight: 1 }}>
              Ofertas <span className="font-serif-it">de la semana</span>
            </h2>
          </div>
          <div className="text-[13px] text-stone max-w-[320px]">
            Descuentos válidos solo reservando online. Cuéntale a {agenteNombre} al confirmar.
          </div>
        </div>

        <div className="reveal grid grid-cols-1 md:grid-cols-3 gap-4" data-delay="80">
          {promociones.map((p) => {
            const precio = formatEur(p.precioEur);
            const precioAnterior = formatEur(p.precioAnteriorEur);
            const validaHasta = formatValidaHasta(
              p.validaHasta as unknown as string | null,
            );
            const nota = validaHasta ?? p.descripcion;
            return (
              <div
                key={p.id}
                className="promo-glow rounded-3xl border border-line p-6 flex flex-col gap-4 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  {p.tag ? (
                    <span className="text-[11px] uppercase tracking-[0.2em] text-stone">
                      {p.tag}
                    </span>
                  ) : (
                    <span />
                  )}
                  {p.descuentoLabel ? (
                    <span
                      className="px-2.5 py-1 rounded-full text-[11px] font-medium"
                      style={{ background: 'var(--ink)', color: 'var(--paper)' }}
                    >
                      {p.descuentoLabel}
                    </span>
                  ) : null}
                </div>
                <div className="text-ink tight font-medium" style={{ fontSize: '24px', lineHeight: 1.1 }}>
                  {p.titulo}
                </div>
                {precio || precioAnterior ? (
                  <div className="flex items-baseline gap-2">
                    {precio ? (
                      <span
                        className="text-gomper-accent tight font-medium"
                        style={{ fontSize: '32px' }}
                      >
                        {precio}
                      </span>
                    ) : null}
                    {precioAnterior ? (
                      <span className="text-stone/60 line-through text-[14px]">
                        {precioAnterior}
                      </span>
                    ) : null}
                  </div>
                ) : null}
                {nota ? (
                  <div className="text-[12px] text-stone">{nota}</div>
                ) : null}
                <a
                  href="#reservar"
                  className="mt-2 self-start text-[13px] font-medium text-ink hover:text-gomper-accent flex items-center gap-1.5 transition"
                >
                  Aprovechar <Icon.Arrow width="13" height="13" />
                </a>
                <div
                  className="absolute -bottom-12 -right-12 w-40 h-40 rounded-full opacity-30"
                  style={{
                    background:
                      'radial-gradient(circle, var(--gomper-accent-soft) 0%, transparent 70%)',
                  }}
                ></div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
