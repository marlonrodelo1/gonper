'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const tabs = [
  { href: '/panel/config', label: 'Datos del salón', exact: true },
  { href: '/panel/config/agente', label: 'Agente' },
  { href: '/panel/config/bot', label: 'Bot' },
  { href: '/panel/config/equipo', label: 'Equipo' },
  { href: '/panel/config/horario', label: 'Horario' },
  { href: '/panel/config/cierres', label: 'Cierres' },
  { href: '/panel/config/suscripcion', label: 'Suscripción' },
];

export default function ConfigLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-col gap-1.5">
        <h1 className="tight text-[28px] font-medium text-ink">
          Configuración
        </h1>
        <p className="font-serif-it text-[15px] text-stone/70">
          ajustes del salón
        </p>
      </header>

      <nav className="inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full border border-line bg-paper p-1">
        {tabs.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(t.href + '/');
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                'tight rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ' +
                (active
                  ? 'bg-ink text-cream'
                  : 'text-stone hover:text-ink')
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
