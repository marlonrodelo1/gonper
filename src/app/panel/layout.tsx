import { createClient } from "@/lib/supabase/server";
import { getCurrentSalon } from "@/lib/supabase/get-current-salon";
import { getCurrentSuperAdmin } from "@/lib/auth/super-admin";
import { Toaster } from "@/components/ui/sonner";
import { PanelSidebar } from "./_components/panel-sidebar";
import { TrialBlocker } from "./_components/trial-blocker";

const PLANES_ACTIVOS = new Set(["basico", "solo", "studio", "pro"]);

function leerTrialExpirado(salon: Record<string, unknown> | null): {
  trialExpirado: boolean;
  planActivo: boolean;
} {
  if (!salon) return { trialExpirado: false, planActivo: false };
  const plan = typeof salon.plan === "string" ? salon.plan : null;
  const trialUntilRaw = salon.trial_until ?? salon.trialUntil ?? null;
  const planActivo = plan != null && PLANES_ACTIVOS.has(plan);
  if (planActivo) return { trialExpirado: false, planActivo: true };
  if (plan !== "trial") return { trialExpirado: false, planActivo };
  if (!trialUntilRaw) return { trialExpirado: false, planActivo };
  const fin =
    trialUntilRaw instanceof Date ? trialUntilRaw : new Date(String(trialUntilRaw));
  if (isNaN(fin.getTime())) return { trialExpirado: false, planActivo };
  return { trialExpirado: fin.getTime() <= Date.now(), planActivo };
}

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [salon, superAdmin] = await Promise.all([
    getCurrentSalon(),
    getCurrentSuperAdmin(),
  ]);

  const salonNombre =
    salon && typeof salon.nombre === "string" ? salon.nombre : null;
  const salonPlan =
    salon && typeof salon.plan === "string" ? salon.plan : null;
  const salonSlug =
    salon && typeof salon.slug === "string" && salon.slug.length > 0
      ? salon.slug
      : null;

  const { trialExpirado, planActivo } = leerTrialExpirado(salon);

  return (
    <div className="flex min-h-screen w-full bg-cream text-ink">
      <PanelSidebar
        userEmail={user?.email ?? null}
        salonNombre={salonNombre}
        salonPlan={salonPlan}
        salonSlug={salonSlug}
        isSuperAdmin={superAdmin !== null}
      />
      <main className="min-w-0 flex-1 pt-12 md:pt-0">{children}</main>
      <TrialBlocker trialExpirado={trialExpirado} planActivo={planActivo} />
      <Toaster position="top-right" theme="system" />
    </div>
  );
}
