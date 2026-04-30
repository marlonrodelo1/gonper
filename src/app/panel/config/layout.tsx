import Link from 'next/link';
import { Separator } from '@/components/ui/separator';

const tabs = [
  { href: '/panel/config', label: 'Datos del salón', emoji: '🏪', exact: true },
  { href: '/panel/config/agente', label: 'Agente', emoji: '🤖' },
  { href: '/panel/config/bot', label: 'Bot', emoji: '📱' },
  { href: '/panel/config/equipo', label: 'Equipo', emoji: '👥' },
  { href: '/panel/config/horario', label: 'Horario', emoji: '🕒' },
  { href: '/panel/config/cierres', label: 'Cierres', emoji: '🌴' },
  { href: '/panel/config/suscripcion', label: 'Suscripción', emoji: '💳' },
];

export default function ConfigLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Datos de tu salón, equipo, agente, horario y cierres.
        </p>
      </div>

      <nav className="flex flex-wrap gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 border-b-2 border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors -mb-px"
          >
            <span className="mr-2">{t.emoji}</span>
            {t.label}
          </Link>
        ))}
      </nav>

      <Separator className="hidden" />

      <div>{children}</div>
    </div>
  );
}
