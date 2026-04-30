'use client';

import { useMemo, useState } from 'react';
import { Icon } from './icons';

export type ServicioReal = {
  id: string;
  nombre: string;
  duracionMin: number;
  precioEur: string;
  descripcion: string | null;
  activo: boolean;
};

type Props = {
  servicios: ServicioReal[];
  agenteNombre: string;
  onPick?: (servicioId: string) => void;
};

type CatKey = 'manicura' | 'pedicura' | 'nailart' | 'corte' | 'otros';

const CAT_LABELS: Record<CatKey, string> = {
  manicura: 'Manicura',
  pedicura: 'Pedicura',
  nailart: 'Nail Art',
  corte: 'Corte y barba',
  otros: 'Otros',
};

const CAT_ORDER: CatKey[] = ['manicura', 'pedicura', 'nailart', 'corte', 'otros'];

function categorize(s: ServicioReal): CatKey {
  const n = s.nombre.toLowerCase();
  if (n.includes('manicura')) return 'manicura';
  if (n.includes('pedicura')) return 'pedicura';
  if (n.includes('nail') || n.includes('uña')) return 'nailart';
  if (n.includes('corte') || n.includes('barba') || n.includes('afeitado')) return 'corte';
  return 'otros';
}

function formatPrecio(eur: string): string {
  const n = Number(eur);
  if (!Number.isFinite(n)) return `${eur}€`;
  return Number.isInteger(n) ? `${n}€` : `${n.toFixed(2).replace(/\.00$/, '')}€`;
}

function formatDuracion(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

export function Servicios({ servicios, agenteNombre, onPick }: Props) {
  const groups = useMemo(() => {
    const map = new Map<CatKey, ServicioReal[]>();
    for (const s of servicios) {
      const k = categorize(s);
      const arr = map.get(k) ?? [];
      arr.push(s);
      map.set(k, arr);
    }
    return CAT_ORDER.filter((k) => (map.get(k)?.length ?? 0) > 0).map((k) => ({
      key: k,
      label: CAT_LABELS[k],
      items: map.get(k)!,
    }));
  }, [servicios]);

  const [cat, setCat] = useState<CatKey>(groups[0]?.key ?? 'otros');
  const visible = groups.find((g) => g.key === cat)?.items ?? [];
  const showTabs = groups.length > 1;

  const handlePick = (id: string) => {
    if (onPick) onPick(id);
    if (typeof document !== 'undefined') {
      document.getElementById('reservar')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  return (
    <section id="servicios" className="py-20 px-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal flex items-end justify-between gap-6 flex-wrap mb-10">
          <div>
            <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-3">
              Servicios
            </div>
            <h2
              className="tight font-medium text-ink"
              style={{ fontSize: 'clamp(36px,5vw,56px)', lineHeight: 1 }}
            >
              Carta del <span className="font-serif-it">studio</span>
            </h2>
          </div>
          <div className="text-[13px] text-stone max-w-[360px] leading-relaxed">
            Si tienes dudas, escribe a {agenteNombre} y te aconseja.
          </div>
        </div>

        {showTabs && (
          <div className="reveal flex flex-wrap gap-2 mb-8">
            {groups.map((g) => (
              <button
                key={g.key}
                onClick={() => setCat(g.key)}
                className={`px-5 py-2.5 rounded-full text-[13.5px] tight transition border ${
                  cat === g.key
                    ? 'bg-ink text-paper border-ink'
                    : 'bg-paper text-stone border-line hover:text-ink hover:border-line-2'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        )}

        {visible.length === 0 ? (
          <div className="text-[14px] text-stone bg-paper border border-line rounded-3xl p-8 text-center">
            Aún no hay servicios publicados.
          </div>
        ) : (
          <div
            className="reveal divide-y divide-line border border-line rounded-3xl overflow-hidden bg-paper"
            data-delay="100"
          >
            {visible.map((s) => (
              <button
                key={s.id}
                onClick={() => handlePick(s.id)}
                className="w-full text-left p-6 sm:p-7 flex items-center gap-6 hover:bg-cream/60 transition group"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-ink tight font-medium" style={{ fontSize: '19px' }}>
                    {s.nombre}
                  </div>
                  {s.descripcion && (
                    <div className="text-[13px] text-stone mt-1">{s.descripcion}</div>
                  )}
                  <div className="flex items-center gap-2 mt-2 text-[12px] text-stone/80">
                    <Icon.Clock width="12" height="12" />
                    <span>{formatDuracion(s.duracionMin)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-5 shrink-0">
                  <div
                    className="text-gomper-accent tight font-medium"
                    style={{ fontSize: '22px' }}
                  >
                    {formatPrecio(s.precioEur)}
                  </div>
                  <span className="hidden sm:flex w-10 h-10 rounded-full border border-line items-center justify-center text-stone group-hover:border-ink group-hover:text-ink group-hover:bg-cream transition">
                    <Icon.Arrow width="14" height="14" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
