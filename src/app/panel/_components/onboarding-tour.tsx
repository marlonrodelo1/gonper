'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'gomper_onboarding_done_v2';

interface Step {
  /** Selector CSS de un elemento con data-tour="...". null = modal centrado sin spotlight. */
  target: string | null;
  badge: string;
  titulo: string;
  cuerpo: string;
  /** Si está, navega a esa ruta antes de mostrar el paso. */
  navigate?: string;
  /** Posición preferida del tooltip respecto al target. */
  side?: 'right' | 'bottom' | 'top' | 'left';
  cta?: { label: string; href: string };
}

const STEPS: Step[] = [
  {
    target: null,
    badge: 'Bienvenido',
    titulo: '¡Tu cuenta está activa!',
    cuerpo:
      '7 días gratis. Hoy 0 € y puedes cancelar antes del día 8 sin coste. Vamos a darte un tour rápido por el panel.',
  },
  {
    target: '[data-tour="nav-hoy"]',
    side: 'right',
    badge: 'Hoy',
    titulo: 'Tu pantalla del día',
    cuerpo:
      'Aquí ves las citas de hoy, KPIs (facturado, no-shows, confirmadas) y un resumen de Juanita. Es la pantalla a la que entrarás cada mañana.',
    navigate: '/panel/hoy',
  },
  {
    target: '[data-tour="nav-agenda"]',
    side: 'right',
    badge: 'Agenda',
    titulo: 'Vista por día y profesional',
    cuerpo:
      'Ves la agenda semanal con todas las citas. Útil para planificar y reordenar.',
  },
  {
    target: '[data-tour="nav-clientes"]',
    side: 'right',
    badge: 'Clientes',
    titulo: 'Tu base de clientes',
    cuerpo:
      'Histórico, número de visitas, no-shows, notas privadas. Cualquier persona que reserve queda guardada aquí.',
  },
  {
    target: '[data-tour="nav-servicios"]',
    side: 'right',
    badge: 'Servicios',
    titulo: 'Catálogo del salón',
    cuerpo:
      'Tu lista de servicios (corte, barba, manicura…) con duración y precio. Te los preparamos al registrarte.',
  },
  {
    target: '[data-tour="nav-web"]',
    side: 'right',
    badge: 'Web del salón',
    titulo: 'Tu web pública',
    cuerpo:
      'Promociones, galería y reseñas se muestran en gestori.es/tu-slug. Edita aquí y verás los cambios en tiempo real.',
  },
  {
    target: '[data-tour="nav-bot"]',
    side: 'right',
    badge: 'Bot Telegram',
    titulo: 'Configura tu bot — paso clave',
    cuerpo:
      'Crea un bot en BotFather, pega el token y queda operativo. Tus clientes reservarán por Telegram 24/7 hablando con Juanita. También puedes hablar tú con tu propio bot como dueño.',
    cta: { label: 'Ir a Bot Telegram', href: '/panel/config/bot' },
  },
  {
    target: '[data-tour="nav-suscripcion"]',
    side: 'right',
    badge: 'Suscripción',
    titulo: 'Tu plan y facturación',
    cuerpo:
      'Aquí gestionas la suscripción: cambias tarjeta, descargas facturas o cancelas cuando quieras.',
  },
  {
    target: null,
    badge: 'Listo',
    titulo: 'A trabajar 💪',
    cuerpo:
      'Si necesitas ayuda escríbenos a hola@gestori.es. Cuando termine tu prueba de 7 días pasarás automáticamente al plan Básico (30 €/mes), salvo que canceles antes.',
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function computeTargetRect(selector: string | null): Rect | null {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function computeTooltipPosition(
  rect: Rect | null,
  side: Step['side'],
  vw: number,
  vh: number,
): { top: number; left: number; width: number; arrow: 'left' | 'top' | 'bottom' | 'right' | null } {
  const TOOLTIP_W = Math.min(360, vw - 24);
  if (!rect) {
    return {
      top: Math.max(24, (vh - 240) / 2),
      left: Math.max(12, (vw - TOOLTIP_W) / 2),
      width: TOOLTIP_W,
      arrow: null,
    };
  }
  const GAP = 14;
  // Si entra a la derecha del target, ahí. Si no, debajo.
  const cabe_a_la_derecha = rect.left + rect.width + GAP + TOOLTIP_W < vw;
  if ((!side || side === 'right') && cabe_a_la_derecha) {
    return {
      top: Math.max(12, Math.min(vh - 200, rect.top - 8)),
      left: rect.left + rect.width + GAP,
      width: TOOLTIP_W,
      arrow: 'left',
    };
  }
  // Por defecto debajo
  return {
    top: Math.min(vh - 200, rect.top + rect.height + GAP),
    left: Math.max(12, Math.min(vw - TOOLTIP_W - 12, rect.left)),
    width: TOOLTIP_W,
    arrow: 'top',
  };
}

export function OnboardingTour() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState(0);
  const [vh, setVh] = useState(0);
  const navegado = useRef<Set<number>>(new Set());

  // Lanzar tour solo desde ?welcome=1
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const yaCompletado = window.localStorage.getItem(STORAGE_KEY) === '1';
    const desdeWelcome = searchParams.get('welcome') === '1';
    if (desdeWelcome && !yaCompletado) {
      setOpen(true);
      setStep(0);
    }
  }, [searchParams]);

  const actual = STEPS[step];

  // Navegación si el paso lo requiere (solo una vez por paso)
  useEffect(() => {
    if (!open) return;
    if (!actual?.navigate) return;
    if (navegado.current.has(step)) return;
    navegado.current.add(step);
    router.push(actual.navigate);
  }, [open, step, actual, router]);

  // Recalcular rect del target cuando cambia el paso o tamaño del viewport
  const refresh = useCallback(() => {
    if (typeof window === 'undefined') return;
    setVw(window.innerWidth);
    setVh(window.innerHeight);
    setRect(computeTargetRect(actual?.target ?? null));
  }, [actual]);

  useLayoutEffect(() => {
    if (!open) return;
    refresh();
    // Reintentamos si el target tarda en montar (p.ej. tras navegar)
    const t1 = window.setTimeout(refresh, 120);
    const t2 = window.setTimeout(refresh, 360);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open, step, refresh]);

  useEffect(() => {
    if (!open) return;
    const onResize = () => refresh();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, refresh]);

  const cerrar = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
    setOpen(false);
  };

  if (!open || !actual) return null;

  const ultimo = step === STEPS.length - 1;
  const primero = step === 0;
  const tooltipPos = computeTooltipPosition(rect, actual.side, vw || 1280, vh || 800);

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
      {/* Spotlight: rect resaltado con halo oscuro alrededor */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-xl ring-2 ring-terracotta/80 transition-all duration-200"
          style={{
            top: rect.top - 4,
            left: rect.left - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            boxShadow:
              '0 0 0 9999px rgba(20,18,16,0.55), 0 0 0 4px rgba(177,72,72,0.25)',
          }}
        />
      ) : (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-ink/55 backdrop-blur-[1px]"
        />
      )}

      {/* Click capture: cualquier click fuera del tooltip va al "siguiente" */}
      <button
        type="button"
        aria-label="Siguiente paso"
        onClick={() => {
          if (ultimo) cerrar();
          else setStep((s) => Math.min(STEPS.length - 1, s + 1));
        }}
        className="absolute inset-0 cursor-default"
      />

      {/* Tooltip */}
      <div
        className="card grain absolute pointer-events-auto"
        style={{
          top: tooltipPos.top,
          left: tooltipPos.left,
          width: tooltipPos.width,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              {actual.badge} · {step + 1}/{STEPS.length}
            </span>
            <button
              type="button"
              onClick={cerrar}
              className="text-[12px] text-stone hover:text-ink"
            >
              Saltar tour
            </button>
          </div>

          <h2 className="tight mt-2 text-[19px] font-medium text-ink">
            {actual.titulo}
          </h2>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-stone">
            {actual.cuerpo}
          </p>

          {actual.cta && (
            <Link
              href={actual.cta.href}
              onClick={cerrar}
              className="mt-3 inline-flex h-8 items-center rounded-full border border-line bg-paper px-3 text-[12px] text-ink hover:bg-cream"
            >
              {actual.cta.label} →
            </Link>
          )}

          <div className="mt-5 flex items-center justify-between gap-3">
            <div className="flex gap-1">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 w-4 rounded-full transition ${
                    i === step
                      ? 'bg-ink'
                      : i < step
                      ? 'bg-ink/40'
                      : 'bg-line'
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              {!primero && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="h-8 rounded-full border border-line bg-paper px-3 text-[12.5px] text-stone hover:bg-cream"
                >
                  Atrás
                </button>
              )}
              {ultimo ? (
                <button
                  type="button"
                  onClick={cerrar}
                  className="gloss-btn tight inline-flex h-8 items-center justify-center rounded-full px-4 text-[12.5px] font-medium"
                >
                  Empezar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setStep((s) => Math.min(STEPS.length - 1, s + 1))
                  }
                  className="gloss-btn tight inline-flex h-8 items-center justify-center rounded-full px-4 text-[12.5px] font-medium"
                >
                  Siguiente
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
