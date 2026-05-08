'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export type OnboardingStep = {
  id:
    | 'datos'
    | 'servicios'
    | 'horario'
    | 'galeria'
    | 'identidad'
    | 'equipo'
    | 'asistente';
  label: string;
  hint: string;
  href: string;
  done: boolean;
};

type Props = {
  steps: OnboardingStep[];
};

const MIN_KEY = 'gestori_onboarding_minimized_v1';

/**
 * Checklist flotante en la esquina inferior derecha del panel.
 * Visible siempre que falten pasos por completar; desaparece sola
 * cuando todos los pasos están done. El usuario puede minimizarla
 * a una pill compacta (preferencia local en localStorage).
 */
export function OnboardingChecklist({ steps }: Props) {
  const completados = steps.filter((s) => s.done).length;
  const total = steps.length;
  const allDone = completados === total;

  const [minimized, setMinimized] = useState(false);
  const [hidratado, setHidratado] = useState(false);

  // Hidratar desde localStorage para evitar hydration mismatch.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(MIN_KEY);
    if (stored === '1') setMinimized(true);
    setHidratado(true);
  }, []);

  function toggleMinimized(next: boolean) {
    setMinimized(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(MIN_KEY, next ? '1' : '0');
    }
  }

  if (allDone) return null;
  if (!hidratado) return null;

  const pct = Math.round((completados / total) * 100);

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => toggleMinimized(false)}
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-line bg-paper px-3 py-2 text-[12.5px] font-medium text-ink shadow-lg transition hover:border-line-2 hover:shadow-xl"
        aria-label="Mostrar checklist de configuración"
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: 'var(--gestori-accent)' }}
        />
        <span>
          Configura tu salón · {completados}/{total}
        </span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-4 right-4 z-40 w-[260px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-line bg-paper shadow-[0_15px_40px_-15px_rgba(26,24,21,0.25)]"
      role="region"
      aria-label="Checklist de configuración del salón"
    >
      <div className="flex items-center gap-2 border-b border-line/70 bg-cream/40 px-3 py-2">
        <div className="flex-1 leading-tight">
          <div className="text-[9.5px] uppercase tracking-[0.18em] text-stone/70">
            Configuración
          </div>
          <div className="tight mt-0.5 text-[12px] font-medium text-ink">
            {completados} de {total} listos
          </div>
        </div>
        <button
          type="button"
          onClick={() => toggleMinimized(true)}
          className="rounded-full p-1 text-stone transition hover:bg-line/40 hover:text-ink"
          aria-label="Minimizar checklist"
          title="Minimizar"
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 12h12" />
          </svg>
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="px-3 pt-2">
        <div className="h-1 w-full overflow-hidden rounded-full bg-line/40">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              backgroundColor: 'var(--gestori-accent)',
            }}
          />
        </div>
      </div>

      {/* Lista de pasos — versión compacta */}
      <ul className="flex flex-col px-1 py-1">
        {steps.map((s) => (
          <li key={s.id}>
            <Link
              href={s.href}
              className={`group flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition hover:bg-cream/60 ${
                s.done ? 'text-stone' : 'text-ink'
              }`}
              title={s.hint}
            >
              <span
                className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${
                  s.done
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'border border-line bg-paper'
                }`}
                aria-hidden
              >
                {s.done && (
                  <svg viewBox="0 0 24 24" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7" />
                  </svg>
                )}
              </span>
              <span
                className={`flex-1 truncate font-medium ${s.done ? 'line-through opacity-60' : ''}`}
              >
                {s.label}
              </span>
              {!s.done && (
                <span
                  className="text-[11px] text-stone transition group-hover:text-ink"
                  aria-hidden
                >
                  →
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
