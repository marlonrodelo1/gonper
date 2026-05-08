import { createClient } from "@/lib/supabase/server";
import { getCurrentSalon } from "@/lib/supabase/get-current-salon";
import { getCurrentSuperAdmin } from "@/lib/auth/super-admin";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import { countDistinct, and, eq, gte } from "drizzle-orm";
import { db } from "@/lib/db";
import { mensajes } from "@/lib/db/schema";
import { PanelSidebar } from "./_components/panel-sidebar";
import { TrialBlocker } from "./_components/trial-blocker";
import { TrialBanner } from "./_components/trial-banner";
import { OnboardingTour } from "./_components/onboarding-tour";
import { OnboardingChecklist } from "./_components/onboarding-checklist";
import { computeOnboardingSteps } from "@/lib/onboarding/compute-steps";

const PLANES_ACTIVOS = new Set(["basico", "solo", "studio", "pro"]);

function leerEstadoSuscripcion(salon: Record<string, unknown> | null): {
  trialExpirado: boolean;
  planActivo: boolean;
  sinSuscripcion: boolean;
  diasRestantesTrial: number | null;
} {
  if (!salon) {
    return {
      trialExpirado: false,
      planActivo: false,
      sinSuscripcion: false,
      diasRestantesTrial: null,
    };
  }
  const plan = typeof salon.plan === "string" ? salon.plan : null;
  const subscriptionId =
    (salon.stripe_subscription_id as string | null | undefined) ??
    (salon.stripeSubscriptionId as string | null | undefined) ??
    null;
  const trialUntilRaw = salon.trial_until ?? salon.trialUntil ?? null;

  // Plan ya activo (Stripe pagando) → libre.
  const planActivo = plan != null && PLANES_ACTIVOS.has(plan);
  if (planActivo) {
    return {
      trialExpirado: false,
      planActivo: true,
      sinSuscripcion: false,
      diasRestantesTrial: null,
    };
  }

  // Plan trial: NO bloquear mientras `trial_until` esté en el futuro.
  // Esto incluye trial sin tarjeta (sin subscriptionId) y trial Stripe.
  if (plan === "trial" && trialUntilRaw) {
    const fin =
      trialUntilRaw instanceof Date
        ? trialUntilRaw
        : new Date(String(trialUntilRaw));
    if (!isNaN(fin.getTime())) {
      const ms = fin.getTime() - Date.now();
      const expirado = ms <= 0;
      const dias = expirado ? 0 : Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
      return {
        trialExpirado: expirado,
        planActivo: false,
        sinSuscripcion: false,
        diasRestantesTrial: expirado ? 0 : dias,
      };
    }
  }

  // Sin trial válido y sin Stripe activo → bloquear (caso edge: trial expirado
  // sin trial_until válido o cuenta vieja sin migrar).
  return {
    trialExpirado: true,
    planActivo: false,
    sinSuscripcion: !subscriptionId,
    diasRestantesTrial: 0,
  };
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

  const { trialExpirado, planActivo, sinSuscripcion, diasRestantesTrial } =
    leerEstadoSuscripcion(salon);

  // Conversaciones únicas iniciadas hoy (cuenta sesiones distintas en `mensajes`).
  // Si algo falla, default 0 — no debe romper el layout.
  const salonId =
    salon && typeof salon.id === "string" ? salon.id : null;
  let conversacionesHoy = 0;
  if (salonId) {
    try {
      const inicioDia = new Date();
      inicioDia.setHours(0, 0, 0, 0);
      const [row] = await db
        .select({ value: countDistinct(mensajes.sessionId) })
        .from(mensajes)
        .where(
          and(
            eq(mensajes.salonId, salonId),
            gte(mensajes.createdAt, inicioDia),
          ),
        );
      conversacionesHoy = Number(row?.value ?? 0);
    } catch (err) {
      console.warn("[panel/layout] conversaciones hoy:", err);
    }
  }

  // Pasos pendientes para el checklist flotante. Si algo falla, no
  // mostramos nada — no debe romper el layout.
  let onboardingSteps: Awaited<
    ReturnType<typeof computeOnboardingSteps>
  > | null = null;
  if (salon && salonId) {
    try {
      onboardingSteps = await computeOnboardingSteps({
        id: salonId,
        direccion: (salon.direccion as string | null | undefined) ?? null,
        telefono: (salon.telefono as string | null | undefined) ?? null,
        logoUrl:
          (salon.logo_url as string | null | undefined) ??
          (salon.logoUrl as string | null | undefined) ??
          null,
        bannerUrl:
          (salon.banner_url as string | null | undefined) ??
          (salon.bannerUrl as string | null | undefined) ??
          null,
        agenteNombre:
          (salon.agente_nombre as string | null | undefined) ??
          (salon.agenteNombre as string | null | undefined) ??
          null,
        telegramChatIdDueno:
          (salon.telegram_chat_id_dueno as string | null | undefined) ??
          (salon.telegramChatIdDueno as string | null | undefined) ??
          null,
      });
    } catch (err) {
      console.warn("[panel/layout] onboarding steps:", err);
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-cream text-ink">
      <PanelSidebar
        userEmail={user?.email ?? null}
        salonNombre={salonNombre}
        salonPlan={salonPlan}
        salonSlug={salonSlug}
        salonLogoUrl={salonLogoUrl}
        isSuperAdmin={superAdmin !== null}
        conversacionesHoy={conversacionesHoy}
      />
      <main className="min-w-0 flex-1 pt-12 md:pt-0">
        {diasRestantesTrial !== null && diasRestantesTrial > 0 && diasRestantesTrial <= 7 && (
          <TrialBanner diasRestantes={diasRestantesTrial} />
        )}
        {children}
      </main>
      <TrialBlocker
        sinSuscripcion={sinSuscripcion}
        trialExpirado={trialExpirado}
        planActivo={planActivo}
      />
      <Suspense fallback={null}>
        <OnboardingTour />
      </Suspense>
      {onboardingSteps && !planActivo && !trialExpirado && (
        <OnboardingChecklist steps={onboardingSteps} />
      )}
      <Toaster position="top-right" theme="system" />
    </div>
  );
}
