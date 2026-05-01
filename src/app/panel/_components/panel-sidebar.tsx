'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from './icons';

export type PanelSidebarProps = {
  userEmail: string | null;
  salonNombre: string | null;
  salonPlan: string | null;
  salonSlug: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactNode;
};

const navOperacion: NavItem[] = [
  { href: '/panel/hoy', label: 'Hoy', icon: Icon.Home },
  { href: '/panel/agenda', label: 'Agenda', icon: Icon.Cal },
  { href: '/panel/citas/nueva', label: 'Citas', icon: Icon.Cal },
  { href: '/panel/conversaciones', label: 'Conversaciones', icon: Icon.Chat },
  { href: '/panel/clientes', label: 'Clientes', icon: Icon.Users },
  { href: '/panel/servicios', label: 'Servicios', icon: Icon.Scissors },
  { href: '/panel/stats', label: 'Métricas', icon: Icon.Chart },
];

const navWeb: NavItem[] = [
  { href: '/panel/promociones', label: 'Promociones', icon: Icon.Sparkle },
  { href: '/panel/galeria', label: 'Galería', icon: Icon.Sparkle },
  { href: '/panel/resenas', label: 'Reseñas', icon: Icon.Sparkle },
];

const navConfig: NavItem[] = [
  { href: '/panel/config', label: 'Perfil del salón', icon: Icon.Sett },
  { href: '/panel/config/equipo', label: 'Equipo', icon: Icon.Sett },
  { href: '/panel/config/agente', label: 'Agente · Juanita', icon: Icon.Sett },
  { href: '/panel/config/horario', label: 'Horario', icon: Icon.Sett },
  { href: '/panel/config/bot', label: 'Bot Telegram', icon: Icon.Sett },
];

export function PanelSidebar({
  userEmail,
  salonNombre,
  salonSlug,
}: PanelSidebarProps) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  const initial = (salonNombre ?? 'G').trim().charAt(0).toUpperCase() || 'G';

  const isActive = (href: string) => {
    if (href === '/panel/hoy') return pathname === '/panel/hoy';
    return pathname === href || pathname.startsWith(`${href}/`);
  };

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
            href="/panel/hoy"
            onClick={cerrar}
            className="flex items-center gap-2.5"
          >
            <Icon.Logo width="22" height="22" className="text-ink" />
            <span className="tight text-[17px] font-medium text-ink">
              Gomper
            </span>
          </Link>
          <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-stone/70">
            Beta
          </span>
        </div>

        {/* Salón switcher (placeholder visual) */}
        <div className="mx-3 flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper px-3 py-2.5 hover:border-line-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-terracotta to-[#A8451F] text-[12px] font-medium text-paper">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="tight truncate text-[13px] font-medium text-ink">
              {salonNombre ?? 'Tu salón'}
            </div>
            <div className="truncate text-[11px] text-stone">
              gomper.es/{salonSlug ?? '—'}
            </div>
          </div>
          <Icon.Caret width="14" height="14" className="text-stone" />
        </div>

        {/* Nav scroll-area */}
        <div className="nice-scroll flex-1 overflow-y-auto">
          {/* Operación */}
          <nav className="mt-6 flex flex-col gap-0.5 px-3">
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

            {/* Web del salón */}
            <div className="mt-4 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-stone/60">
              Web del salón
            </div>
            {navWeb.map((it) => {
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
                  <span className={active ? 'text-cream' : 'text-terracotta'}>
                    <IconCmp width="18" height="18" />
                  </span>
                  <span className="tight">{it.label}</span>
                </Link>
              );
            })}

            {/* Configuración */}
            <div className="mt-4 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-stone/60">
              Configuración
            </div>
            {navConfig.map((it) => {
              const active = isActive(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={cerrar}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] transition ${
                    active
                      ? 'bg-ink text-cream'
                      : 'text-stone hover:bg-paper hover:text-ink'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      active ? 'bg-cream' : 'bg-stone/40'
                    }`}
                  />
                  <span className="tight">{it.label}</span>
                </Link>
              );
            })}

            {/* Mi web pública */}
            {salonSlug && (
              <Link
                href={`/s/${salonSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={cerrar}
                className="mt-3 flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] text-stone transition hover:bg-paper hover:text-ink"
              >
                <Icon.Sparkle width="14" height="14" className="text-terracotta" />
                <span className="tight">Mi web pública</span>
                <Icon.Arrow
                  width="11"
                  height="11"
                  className="ml-auto text-stone/60"
                />
              </Link>
            )}
          </nav>
        </div>

        {/* Footer card: Juanita atendiendo */}
        <div className="p-3">
          <div className="card grain p-4">
            <div className="mb-2 flex items-center gap-2">
              <span className="pulse-soft h-2 w-2 rounded-full bg-sage" />
              <span className="text-[11px] uppercase tracking-[0.18em] text-stone">
                Juanita
              </span>
              <span className="ml-auto font-mono text-[10px] text-stone/60">
                v2.4
              </span>
            </div>
            <div className="tight text-[13px] font-medium text-ink">
              Atendiendo en Telegram
            </div>
            {/* TODO: leer estos números de tabla mensajes (conversaciones hoy / errores) */}
            <div className="mt-0.5 text-[11px] text-stone">
              12 conversaciones hoy · 0 errores
            </div>
            <Link
              href="/panel/config/agente"
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] text-terracotta hover:text-terracotta-2"
            >
              Configurar agente <Icon.Arrow width="11" height="11" />
            </Link>
          </div>
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
