'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from '../../panel/_components/icons';

export type AdminSidebarProps = {
  userEmail: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactNode;
};

const navOperacion: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: Icon.Home },
  { href: '/admin/salones', label: 'Salones', icon: Icon.Scissors },
  { href: '/admin/usuarios', label: 'Usuarios', icon: Icon.Users },
  { href: '/admin/leads', label: 'Leads', icon: Icon.Chat },
];

export function AdminSidebar({ userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const isNuevoActive = pathname === '/admin/salones/nuevo';

  return (
    <>
      {/* Botón hamburguesa - solo mobile */}
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={() => setAbierto(true)}
        className="fixed top-3 left-3 z-40 inline-flex items-center justify-center rounded-md border border-line bg-paper p-2 text-stone shadow-sm md:hidden"
      >
        <Icon.Menu width="20" height="20" />
      </button>

      {/* Overlay - solo mobile */}
      <div
        onClick={cerrar}
        aria-hidden
        className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity md:hidden ${
          abierto
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-line bg-cream transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          abierto ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-6 pt-6 pb-5">
          <Link
            href="/admin"
            onClick={cerrar}
            className="flex items-center gap-2.5"
          >
            <Icon.Logo width="22" height="22" className="text-ink" />
            <span className="tight text-[17px] font-medium text-ink">
              Gomper · Admin
            </span>
          </Link>
          <span className="ml-auto rounded-full bg-sage-soft px-2 py-0.5 text-[9px] font-medium tracking-[0.14em] text-ink uppercase">
            Super
          </span>
        </div>

        {/* Nav scroll-area */}
        <div className="nice-scroll flex-1 overflow-y-auto">
          {/* Operación */}
          <nav className="mt-2 flex flex-col gap-0.5 px-3">
            <div className="px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-stone/60">
              Operación
            </div>
            {navOperacion.map((it) => {
              const active = isActive(it.href);
              const IconCmp = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={cerrar}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition ${
                    active
                      ? 'bg-ink text-cream'
                      : 'text-stone hover:bg-paper hover:text-ink'
                  }`}
                >
                  <span className={active ? 'text-cream' : ''}>
                    <IconCmp width="18" height="18" />
                  </span>
                  <span className="tight">{it.label}</span>
                </Link>
              );
            })}

            {/* Crear */}
            <div className="mt-4 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-stone/60">
              Crear
            </div>
            <Link
              href="/admin/salones/nuevo"
              onClick={cerrar}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] transition ${
                isNuevoActive
                  ? 'bg-ink text-cream'
                  : 'accent-btn tight text-cream'
              }`}
            >
              <Icon.Plus width="16" height="16" />
              <span className="tight">Nuevo salón</span>
            </Link>

            {/* Volver al panel del dueño */}
            <Link
              href="/panel/hoy"
              onClick={cerrar}
              className="mt-6 flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-stone transition hover:bg-paper hover:text-ink"
            >
              <Icon.Arrow
                width="13"
                height="13"
                className="rotate-180 text-stone/70"
              />
              <span className="tight">Volver al panel del dueño</span>
            </Link>
          </nav>
        </div>

        {/* Footer user */}
        {userEmail && (
          <div className="flex flex-col gap-2 border-t border-line px-4 py-3">
            <span className="truncate text-[11px] text-stone">{userEmail}</span>
            <form action="/auth/sign-out" method="POST">
              <button
                type="submit"
                className="tight w-full rounded-lg px-2 py-1.5 text-left text-[12px] text-stone transition hover:bg-paper hover:text-ink"
              >
                Salir
              </button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
}
