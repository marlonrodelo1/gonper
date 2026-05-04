'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Icon } from './icons';
import { GonperLogo, GonperMark } from '@/components/brand/gonper-logo';

export type PanelSidebarProps = {
  userEmail: string | null;
  salonNombre: string | null;
  salonPlan: string | null;
  salonSlug: string | null;
  isSuperAdmin?: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: (p: React.SVGProps<SVGSVGElement>) => React.ReactNode;
  /** Identificador opcional para anclar pasos del tour (data-tour). */
  tour?: string;
  /**
   * Prefijo alternativo para considerar el item activo. Útil cuando el
   * link lleva a una sub-ruta (p.ej. /panel/config/reservas) pero quieres
   * que aparezca activo en cualquier /panel/config/*.
   */
  activeMatch?: string;
};

const navOperacion: NavItem[] = [
  { href: '/panel/hoy', label: 'Hoy', icon: Icon.Home, tour: 'nav-hoy' },
  { href: '/panel/agenda', label: 'Agenda', icon: Icon.Cal, tour: 'nav-agenda' },
  { href: '/panel/citas/nueva', label: 'Nueva cita', icon: Icon.Cal },
  { href: '/panel/conversaciones', label: 'Conversaciones', icon: Icon.Chat },
  { href: '/panel/clientes', label: 'Clientes', icon: Icon.Users, tour: 'nav-clientes' },
  { href: '/panel/servicios', label: 'Servicios', icon: Icon.Scissors, tour: 'nav-servicios' },
  { href: '/panel/stats', label: 'Métricas', icon: Icon.Chart },
];

const navWeb: NavItem[] = [
  { href: '/panel/promociones', label: 'Promociones', icon: Icon.Sparkle },
  { href: '/panel/galeria', label: 'Galería', icon: Icon.Sparkle },
  { href: '/panel/resenas', label: 'Reseñas', icon: Icon.Sparkle },
];

// Una sola entrada en sidebar — el detalle (Datos, Agente, Bot, Equipo,
// Horario, Cierres, Suscripción) vive en las tabs horizontales del
// layout de /panel/config para no duplicar.
const navConfig: NavItem[] = [
  {
    href: '/panel/config/reservas',
    label: 'Configuración',
    icon: Icon.Sett,
    tour: 'nav-config',
    activeMatch: '/panel/config',
  },
];

export function PanelSidebar({
  userEmail,
  salonNombre,
  salonSlug,
  isSuperAdmin = false,
}: PanelSidebarProps) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const cerrar = () => setAbierto(false);

  const initial = (salonNombre ?? 'G').trim().charAt(0).toUpperCase() || 'G';

  const isActive = (item: NavItem) => {
    const match = item.activeMatch ?? item.href;
    if (match === '/panel/hoy') return pathname === '/panel/hoy';
    return pathname === match || pathname.startsWith(`${match}/`);
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
            <GonperMark size={26} />
            <GonperLogo size={20} tag={null} color="#1A1815" />
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
              const active = isActive(it);
              const IconCmp = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={cerrar}
                  data-tour={it.tour}
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
            <div
              data-tour="nav-web"
              className="mt-4 px-3 py-2 text-[10px] uppercase tracking-[0.22em] text-stone/60"
            >
              Web del salón
            </div>
            {navWeb.map((it) => {
              const active = isActive(it);
              const IconCmp = it.icon;
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={cerrar}
                  data-tour={it.tour}
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
              const active = isActive(it);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={cerrar}
                  data-tour={it.tour}
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
            {isSuperAdmin && (
              <a
                href="https://admin.gestori.es"
                target="_blank"
                rel="noopener noreferrer"
                onClick={cerrar}
                className="tight flex items-center justify-between gap-2 rounded-lg border border-sage/40 bg-sage-soft/60 px-3 py-2 text-[12px] text-sage-deep transition hover:bg-sage-soft"
              >
                <span className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-sage" />
                  Panel super admin
                </span>
                <Icon.Arrow width="11" height="11" />
              </a>
            )}
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
