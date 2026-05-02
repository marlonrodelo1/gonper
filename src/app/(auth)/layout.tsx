import type { ReactNode } from 'react';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            'radial-gradient(120% 80% at 0% 0%, var(--terracotta-soft) 0%, transparent 55%), radial-gradient(120% 80% at 100% 100%, var(--sage-soft) 0%, transparent 55%)',
        }}
      />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-5 py-12">
        <Link
          href="/"
          className="mb-8 flex items-center gap-2 text-stone hover:text-ink"
          aria-label="Volver a inicio"
        >
          <span className="tight font-serif-it text-[34px] leading-none text-ink">
            Gomper
          </span>
        </Link>

        <div className="card grain w-full px-6 py-7 sm:px-8 sm:py-9">
          {children}
        </div>

        <p className="mt-6 text-center text-[12px] text-stone">
          ¿Problemas para entrar? Escríbenos a{' '}
          <a
            href="mailto:hola@gestori.es"
            className="text-terracotta hover:text-terracotta-2"
          >
            hola@gestori.es
          </a>
        </p>
      </div>
    </div>
  );
}
