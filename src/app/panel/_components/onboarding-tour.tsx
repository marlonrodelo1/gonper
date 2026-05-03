'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'gomper_onboarding_done_v1';

interface Step {
  badge: string;
  titulo: string;
  cuerpo: string;
  cta?: { label: string; href: string };
}

const STEPS: Step[] = [
  {
    badge: 'Paso 1 · Bienvenido',
    titulo: '¡Tu cuenta ya está activa!',
    cuerpo:
      'Tienes 7 días gratis. Hoy no te hemos cobrado nada y, si cancelas antes del día 8, tampoco habrá cargo. Cancelas cuando quieras desde Suscripción.',
  },
  {
    badge: 'Paso 2 · Tu día',
    titulo: 'Pantalla "Hoy"',
    cuerpo:
      'Aquí ves de un vistazo las citas de hoy, los KPIs (facturado, no-shows, confirmadas) y un resumen de Juanita, tu agente IA. Es la pantalla a la que entrarás cada mañana.',
  },
  {
    badge: 'Paso 3 · Tu agenda',
    titulo: 'Reservas y profesionales',
    cuerpo:
      'En Reservas tienes la agenda completa por día y profesional. En Equipo añades a tus profesionales con sus horarios y servicios.',
  },
  {
    badge: 'Paso 4 · Tu bot',
    titulo: 'Configura el bot de Telegram',
    cuerpo:
      'Crea un bot en BotFather, pega aquí el token y queda operativo en segundos. Tus clientes reservarán por Telegram 24/7 hablando con Juanita.',
    cta: { label: 'Ir a configuración del bot', href: '/panel/config/bot' },
  },
  {
    badge: 'Paso 5 · Tu web pública',
    titulo: 'Web del salón en gestori.es/tu-slug',
    cuerpo:
      'Tienes una web pública lista con tus servicios, horarios y un chat IA para que cualquiera reserve sin instalar nada. Personalízala desde Configuración → Web.',
  },
  {
    badge: 'Paso 6 · Listo',
    titulo: 'A trabajar 💪',
    cuerpo:
      'Si necesitas ayuda escríbenos a hola@gestori.es. Cuando termine tu prueba de 7 días pasarás automáticamente al plan Básico (30 €/mes), salvo que canceles antes.',
  },
];

export function OnboardingTour() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Sólo se muestra si:
    //  a) la URL trae ?welcome=1 (vienen de Stripe Checkout return), o
    //  b) ya entraron por welcome=1 antes y no terminaron el tour (resume).
    const yaCompletado = window.localStorage.getItem(STORAGE_KEY) === '1';
    const desdeWelcome = searchParams.get('welcome') === '1';
    if (desdeWelcome && !yaCompletado) {
      setOpen(true);
      setStep(0);
    }
  }, [searchParams]);

  function cerrar() {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, '1');
    }
    setOpen(false);
  }

  if (!open) return null;

  const actual = STEPS[step];
  const ultimo = step === STEPS.length - 1;
  const primero = step === 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-titulo"
    >
      <div className="card grain mx-3 w-full max-w-lg p-6 sm:p-7">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            {actual.badge}
          </span>
          <button
            type="button"
            onClick={cerrar}
            className="text-[12px] text-stone hover:text-ink"
          >
            Saltar
          </button>
        </div>

        <h2
          id="onboarding-titulo"
          className="tight mt-3 text-[22px] font-medium text-ink"
        >
          {actual.titulo}
        </h2>
        <p className="mt-2 text-[14px] leading-relaxed text-stone">
          {actual.cuerpo}
        </p>

        {actual.cta && (
          <Link
            href={actual.cta.href}
            onClick={cerrar}
            className="mt-4 inline-flex h-9 items-center rounded-full border border-line bg-paper px-4 text-[12.5px] text-ink hover:bg-cream"
          >
            {actual.cta.label} →
          </Link>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <div className="flex gap-1">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 w-6 rounded-full transition ${
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
                className="h-9 rounded-full border border-line bg-paper px-4 text-[13px] text-stone hover:bg-cream"
              >
                Atrás
              </button>
            )}
            {ultimo ? (
              <button
                type="button"
                onClick={cerrar}
                className="gloss-btn tight inline-flex h-9 items-center justify-center rounded-full px-5 text-[13px] font-medium"
              >
                Empezar
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                className="gloss-btn tight inline-flex h-9 items-center justify-center rounded-full px-5 text-[13px] font-medium"
              >
                Siguiente
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
