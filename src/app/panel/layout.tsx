import Link from "next/link";

const navItems = [
  { href: "/panel/hoy", label: "Hoy", icon: "📅" },
  { href: "/panel/agenda", label: "Agenda", icon: "🗓️" },
  { href: "/panel/clientes", label: "Clientes", icon: "👥" },
  { href: "/panel/servicios", label: "Servicios", icon: "✂️" },
  { href: "/panel/stats", label: "Stats", icon: "📊" },
  { href: "/panel/config", label: "Config", icon: "⚙️" },
];

export default function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full">
      <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="px-6 py-6">
          <Link
            href="/panel/hoy"
            className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent"
          >
            Gomper
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-200/60 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-zinc-200 px-6 py-4 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Gomper · v0.1
        </div>
      </aside>
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
