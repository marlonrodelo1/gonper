import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/server";
import { getCurrentSalon } from "@/lib/supabase/get-current-salon";

const navItems = [
  { href: "/panel/hoy", label: "Hoy", icon: "📅" },
  { href: "/panel/agenda", label: "Agenda", icon: "📆" },
  { href: "/panel/clientes", label: "Clientes", icon: "👥" },
  { href: "/panel/servicios", label: "Servicios", icon: "✂️" },
  { href: "/panel/stats", label: "Stats", icon: "📊" },
  { href: "/panel/config", label: "Config", icon: "⚙️" },
];

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const salon = await getCurrentSalon();

  const salonNombre =
    salon && typeof salon.nombre === "string" ? salon.nombre : null;
  const salonPlan =
    salon && typeof salon.plan === "string" ? salon.plan : null;

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
        <Separator />
        <nav className="flex flex-col gap-1 px-3 py-3">
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
        <div className="flex-1" />
        {user && (
          <div className="flex flex-col gap-2 border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
            <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
              {user.email}
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
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
