import { createClient } from "@/lib/supabase/server";
import { getCurrentSalon } from "@/lib/supabase/get-current-salon";
import { getCurrentSuperAdmin } from "@/lib/auth/super-admin";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import { PanelSidebar } from "./_components/panel-sidebar";
import { TrialBlocker } from "./_components/trial-blocker";
import { OnboardingTour } from "./_components/onboarding-tour";

const PLANES_ACTIVOS = new Set(["basico", "solo", "studio", "pro"]);

function leerEstadoSuscripcion(salon: Record<string, unknown> | null): {
  trialExpirado: boolean;
  planActivo: boolean;
  sinSuscripcion: boolean;
} {
  if (!salon) {
    return { trialExpirado: false, planActivo: false, sinSuscripcion: false };
  }
  const plan = typeof salon.plan === "string" ? salon.plan : null;
  const subscriptionId =
    (salon.stripe_subscription_id as string | null | undefined) ??
    (salon.stripeSubscriptionId as string | null | undefined) ??
    null;
  const trialUntilRaw = salon.trial_until ?? salon.trialUntil ?? null;

  const planActivo = plan != null && PLANES_ACTIVOS.has(plan);
  if (planActivo) {
    return { trialExpirado: false, planActivo: true, sinSuscripcion: false };
  }
  // Sin suscripción Stripe = el dueño aún no completó Checkout.
  // En ese caso bloqueamos siempre (la regla nueva: tarjeta obligatoria).
  const sinSuscripcion = !subscriptionId;
  if (sinSuscripcion) {
    return { trialExpirado: false, planActivo: false, sinSuscripcion: true };
  }
  // Tiene sub_id pero plan != activo (cancelado, impagado, etc.).
  // Mantenemos compat con el modo antiguo "trial expirado por trial_until".
  if (plan === "trial" && trialUntilRaw) {
    const fin =
      trialUntilRaw instanceof Date
        ? trialUntilRaw
        : new Date(String(trialUntilRaw));
    if (!isNaN(fin.getTime())) {
      return {
        trialExpirado: fin.getTime() <= Date.now(),
        planActivo: false,
        sinSuscripcion: false,
      };
    }
  }
  return { trialExpirado: true, planActivo: false, sinSuscripcion: false };
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
  const salonLogoUrl = salon
    ? (typeof salon.logo_url === "string" && salon.logo_url) ||
      (typeof salon.logoUrl === "string" && salon.logoUrl) ||
      null
    : null;

  const { trialExpirado, planActivo, sinSuscripcion } =
    leerEstadoSuscripcion(salon);

  return (
    <div className="flex min-h-screen w-full bg-cream text-ink">
      <PanelSidebar
        userEmail={user?.email ?? null}
        salonNombre={salonNombre}
        salonPlan={salonPlan}
        salonSlug={salonSlug}
        salonLogoUrl={salonLogoUrl}
        isSuperAdmin={superAdmin !== null}
      />
      <main className="min-w-0 flex-1 pt-12 md:pt-0">{children}</main>
      <TrialBlocker
        sinSuscripcion={sinSuscripcion}
        trialExpirado={trialExpirado}
        planActivo={planActivo}
      />
      <Suspense fallback={null}>
        <OnboardingTour />
      </Suspense>
      <Toaster position="top-right" theme="system" />
    </div>
  );
}
