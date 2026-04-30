import { Icon } from './icons';
import type { Salon } from '@/lib/db/schema';

export type HorarioSemana = {
  dia: number; // 0=Dom..6=Sab
  tramos: { inicio: string; fin: string }[];
};

const NOMBRES_DIA_LARGO: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
  0: 'Domingo',
};

function formatHora(hhmmss: string): string {
  return hhmmss.slice(0, 5);
}

function tramosTexto(tramos: { inicio: string; fin: string }[]): string {
  if (tramos.length === 0) return 'Cerrado';
  return tramos.map((t) => `${formatHora(t.inicio)} — ${formatHora(t.fin)}`).join(' · ');
}

type Props = {
  salon: Salon;
  horariosSemana: HorarioSemana[];
  diaActual: number; // 0=Dom..6=Sab
};

export function Ubicacion({ salon, horariosSemana, diaActual }: Props) {
  const direccion = salon.direccion ?? '';
  const partes = direccion.split(',').map((s) => s.trim()).filter(Boolean);
  const calle = partes[0] || direccion || 'Dirección no disponible';
  const ciudad = partes.slice(1).join(', ') || '';

  const orden = [1, 2, 3, 4, 5, 6, 0];
  const filas = orden.map((d) => {
    const found = horariosSemana.find((h) => h.dia === d);
    return { dia: d, tramos: found?.tramos ?? [] };
  });

  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-[1200px]">
        <div
          className="reveal grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-6 items-stretch"
        >
          {/* Info card */}
          <div className="bg-paper border border-line rounded-3xl p-8 flex flex-col gap-7">
            <div>
              <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-3">
                Visítanos
              </div>
              <h2
                className="tight font-medium text-ink"
                style={{ fontSize: 'clamp(28px,3.4vw,40px)', lineHeight: 1.05 }}
              >
                {calle}
                {ciudad && (
                  <>
                    <br />
                    <span className="font-serif-it text-stone">{ciudad}</span>
                  </>
                )}
              </h2>
            </div>

            <div className="border-t border-line pt-6">
              <div className="text-[11px] uppercase tracking-[0.2em] text-stone/80 mb-3">
                Horario
              </div>
              <ul className="flex flex-col gap-2 text-[14px]">
                {filas.map((f) => {
                  const esHoy = f.dia === diaActual;
                  const cerrado = f.tramos.length === 0;
                  return (
                    <li key={f.dia} className="flex justify-between">
                      <span className={esHoy ? 'text-ink font-medium' : 'text-stone'}>
                        {NOMBRES_DIA_LARGO[f.dia]}
                        {esHoy && (
                          <span className="text-sage-deep text-[11px] ml-2">· Hoy</span>
                        )}
                      </span>
                      <span className={cerrado ? 'text-stone/50' : 'text-ink tight'}>
                        {tramosTexto(f.tramos)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="border-t border-line pt-6 flex flex-col gap-3">
              {salon.telefono && (
                <a
                  href={`tel:${salon.telefono}`}
                  className="flex items-center gap-3 text-[14px] text-ink hover:text-gomper-accent transition"
                >
                  <span className="w-9 h-9 rounded-full bg-cream-2 grid place-items-center">
                    <Icon.Phone width="14" height="14" />
                  </span>
                  {salon.telefono}
                </a>
              )}
              {salon.telefono && (
                <a
                  href={`https://wa.me/${salon.telefono.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 text-[14px] text-ink hover:text-gomper-accent transition"
                >
                  <span className="w-9 h-9 rounded-full bg-cream-2 grid place-items-center">
                    <Icon.Whatsapp width="14" height="14" />
                  </span>
                  WhatsApp
                </a>
              )}
              {salon.email && (
                <a
                  href={`mailto:${salon.email}`}
                  className="flex items-center gap-3 text-[14px] text-ink hover:text-gomper-accent transition"
                >
                  <span className="w-9 h-9 rounded-full bg-cream-2 grid place-items-center">
                    <Icon.Instagram width="14" height="14" />
                  </span>
                  {salon.email}
                </a>
              )}
            </div>
          </div>

          {/* Map */}
          <div
            className="rounded-3xl overflow-hidden border border-line map-dotted relative"
            style={{ minHeight: '420px' }}
          >
            <svg
              viewBox="0 0 600 420"
              className="absolute inset-0 w-full h-full"
              preserveAspectRatio="none"
            >
              <path d="M0,80 L600,120" stroke="rgba(107,99,86,0.18)" strokeWidth="14" fill="none" />
              <path d="M0,260 L600,240" stroke="rgba(107,99,86,0.18)" strokeWidth="20" fill="none" />
              <path d="M150,0 L170,420" stroke="rgba(107,99,86,0.18)" strokeWidth="12" fill="none" />
              <path d="M420,0 L400,420" stroke="rgba(107,99,86,0.18)" strokeWidth="16" fill="none" />
              <path d="M0,360 L600,380" stroke="rgba(107,99,86,0.12)" strokeWidth="6" fill="none" />
              <rect x="180" y="280" width="200" height="90" rx="8" fill="rgba(139,157,122,0.18)" />
              <text
                x="280"
                y="332"
                textAnchor="middle"
                fill="#6B7C5A"
                fontFamily="Geist"
                fontSize="11"
                letterSpacing="2"
                fontWeight="500"
              >
                PARQUE GARCÍA SANABRIA
              </text>
            </svg>

            <div
              className="absolute"
              style={{ top: '42%', left: '52%', transform: 'translate(-50%,-100%)' }}
            >
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-full grid place-items-center"
                  style={{ background: 'var(--gomper-accent-2)' }}
                >
                  <Icon.Sparkle width="22" height="22" className="text-paper" />
                </div>
                <div
                  className="absolute top-full left-1/2 -translate-x-1/2 -translate-y-1 w-3 h-3 rotate-45"
                  style={{ background: 'var(--gomper-accent-2)' }}
                ></div>
                <div
                  className="absolute inset-0 rounded-full live-dot"
                  style={{ background: 'var(--gomper-accent-2)', opacity: 0.4 }}
                ></div>
              </div>
              <div className="mt-5 px-3 py-2 rounded-xl bg-paper border border-line shadow-lg text-[12px] tight text-ink whitespace-nowrap absolute left-1/2 -translate-x-1/2">
                {salon.nombre}
              </div>
            </div>

            <a
              href={
                direccion
                  ? `https://maps.google.com/?q=${encodeURIComponent(direccion)}`
                  : 'https://maps.google.com'
              }
              target="_blank"
              rel="noreferrer"
              className="absolute bottom-5 right-5 px-4 py-2.5 rounded-full bg-paper border border-line text-[13px] tight text-ink hover:bg-cream transition flex items-center gap-2 shadow-md"
            >
              <Icon.Pin width="13" height="13" className="text-gomper-accent" /> Cómo llegar
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
