import { createClient } from "@/lib/supabase/server";
import { getCurrentSalon } from "@/lib/supabase/get-current-salon";
import { Toaster } from "@/components/ui/sonner";
import { PanelSidebar } from "./_components/panel-sidebar";

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
  const salonSlug =
    salon && typeof salon.slug === "string" && salon.slug.length > 0
      ? salon.slug
      : null;

  return (
    <div className="flex min-h-screen w-full bg-cream text-ink">
      <PanelSidebar
        userEmail={user?.email ?? null}
        salonNombre={salonNombre}
        salonPlan={salonPlan}
        salonSlug={salonSlug}
      />
      <main className="min-w-0 flex-1 pt-12 md:pt-0">{children}</main>
      <Toaster position="top-right" theme="system" />
    </div>
  );
}
