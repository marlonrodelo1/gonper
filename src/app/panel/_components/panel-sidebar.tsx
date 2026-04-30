'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: '/panel/hoy', label: 'Hoy', icon: '📅' },
  { href: '/panel/agenda', label: 'Agenda', icon: '📆' },
  { href: '/panel/clientes', label: 'Clientes', icon: '👥' },
  { href: '/panel/servicios', label: 'Servicios', icon: '✂️' },
  { href: '/panel/stats', label: 'Stats', icon: '📊' },
  { href: '/panel/config', label: 'Config', icon: '⚙️' },
];

export type PanelSidebarProps = {
  userEmail: string | null;
  salonNombre: string | null;
  salonPlan: string | null;
  salonSlug: string | null;
};

export function PanelSidebar({
  userEmail,
  salonNombre,
  salonPlan,
  salonSlug,
}: PanelSidebarProps) {
  const [abierto, setAbierto] = useState(false);

  const cerrar = () => setAbierto(false);

  return (
    <>
      {/* Botón hamburguesa - solo mobile */}
      <button
        type="button"
        aria-label="Abrir menú"
        onClick={() => setAbierto(true)}
        className="fixed top-3 left-3 z-40 inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white p-2 text-zinc-700 shadow-sm md:hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      </button>

      {/* Overlay - solo mobile cuando está abierto */}
      <div
        onClick={cerrar}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${
          abierto
            ? 'pointer-events-auto opacity-100'
            : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 transition-transform duration-200 md:static md:translate-x-0 dark:border-zinc-800 dark:bg-zinc-900 ${
          abierto ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-start justify-between px-6 py-6">
          <div className="flex flex-col">
            <Link
              href="/panel/hoy"
              onClick={cerrar}
              className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent"
            >
              Gomper
            </Link>
            {salonNombre && (
              <div className="mt-3 flex flex-col gap-1.5">
                <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {salonNombre}
                </span>
                {salonPlan && (
                  <Badge
                    variant="secondary"
                    className="w-fit bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
                  >
                    {salonPlan}
                  </Badge>
                )}
              </div>
            )}
          </div>
          {/* Botón cerrar - solo mobile */}
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={cerrar}
            className="-mr-2 rounded-md p-1 text-zinc-500 hover:bg-zinc-200/60 md:hidden dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <Separator />
        <nav className="flex flex-col gap-1 px-3 py-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={cerrar}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200/60 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
          {salonSlug && (
            <Link
              href={`/s/${salonSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={cerrar}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200/60 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <span className="text-base">🌐</span>
              <span>Mi web pública</span>
            </Link>
          )}
        </nav>
        <div className="flex-1" />
        {userEmail && (
          <div className="flex flex-col gap-2 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {userEmail}
            </span>
            <form action="/auth/sign-out" method="POST">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
              >
                🚪 Salir
              </Button>
            </form>
          </div>
        )}
      </aside>
    </>
  );
}
