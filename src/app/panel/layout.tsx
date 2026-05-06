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
import { OnboardingTour } from "./_components/onboarding-tour";

const PLANES_ACTIVOS = new Set(["basico", "solo", "studio", "pro"]);

function leerEstadoSuscripcion(salon: Record<string, unknown> | null): {
  trialExpirado: boolean;
  planActivo: boolean;
  diasRestantesTrial: number | null;
} {
  if (!salon) {
    return { trialExpirado: false, planActivo: false, diasRestantesTrial: null };
  }
  const plan = typeof salon.plan === "string" ? salon.plan : null;
  const trialUntilRaw = salon.trial_until ?? salon.trialUntil ?? null;

  const planActivo = plan != null && PLANES_ACTIVOS.has(plan);
  if (planActivo) {
    return {
      trialExpirado: false,
      planActivo: true,
      diasRestantesTrial: null,
    };
  }

  // Plan no activo: comprobamos trial_until.
  // Sin trial_until ⇒ trial sin caducidad (early adopter); no bloqueamos.
  if (!trialUntilRaw) {
    return {
      trialExpirado: false,
      planActivo: false,
      diasRestantesTrial: null,
    };
  }

  const fin =
    trialUntilRaw instanceof Date
      ? trialUntilRaw
      : new Date(String(trialUntilRaw));

  if (isNaN(fin.getTime())) {
    return {
      trialExpirado: false,
      planActivo: false,
      diasRestantesTrial: null,
    };
  }

  const ahoraMs = Date.now();
  const expirado = fin.getTime() <= ahoraMs;
  const diasRestantes = expirado
    ? 0
    : Math.ceil((fin.getTime() - ahoraMs) / (24 * 60 * 60 * 1000));

  return {
    trialExpirado: expirado,
    planActivo: false,
    diasRestantesTrial: diasRestantes,
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

  const { trialExpirado, planActivo } = leerEstadoSuscripcion(salon);

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
      <main className="min-w-0 flex-1 pt-12 md:pt-0">{children}</main>
      <TrialBlocker
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
