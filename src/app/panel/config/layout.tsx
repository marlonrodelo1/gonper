'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Orden por prioridad de uso. "Reservas" es el hub unificado; el resto
// son las pantallas detalladas accesibles desde aquí.
const tabs = [
  { href: '/panel/config/reservas', label: 'Reservas' },
  { href: '/panel/config', label: 'Datos del salón', exact: true },
  { href: '/panel/config/web', label: 'Web (logo y banner)' },
  { href: '/panel/config/horario', label: 'Horario' },
  { href: '/panel/config/equipo', label: 'Equipo' },
  { href: '/panel/config/agente', label: 'Agente' },
  { href: '/panel/config/bot', label: 'Bot' },
  { href: '/panel/config/cierres', label: 'Cierres' },
  { href: '/panel/config/farmasi', label: 'Farmasi' },
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
        <h1 className="tight text-[22px] font-medium text-ink md:text-[28px]">
          Configuración
        </h1>
        <p className="font-serif-it text-[15px] text-stone/70">
          ajustes del salón
        </p>
      </header>

      {/* Tabs:
          - Mobile: scroll horizontal con snap + fade derecho (pill redonda
            con flex-wrap se rompía visualmente en 3 filas).
          - Desktop (md+): inline-flex centrado como pill única clásica. */}
      <nav
        className="-mx-4 flex items-center gap-1 overflow-x-auto rounded-none border-y border-line bg-paper px-4 py-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] [-webkit-mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent)] md:mx-0 md:inline-flex md:w-fit md:max-w-full md:flex-wrap md:overflow-visible md:rounded-full md:border md:p-1 md:[mask-image:none] md:[-webkit-mask-image:none]"
      >
        {tabs.map((t) => {
          const active = t.exact
            ? pathname === t.href
            : pathname === t.href || pathname.startsWith(t.href + '/');
          return (
            <Link
              key={t.href}
              href={t.href}
              className={
                'tight shrink-0 snap-start rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ' +
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
