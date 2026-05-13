import Link from 'next/link';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones, usuariosSalon } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/(auth)/actions';
import { Icon } from '@/app/panel/_components/icons';
import { StripeConnectCard } from '@/components/panel/stripe-connect-card';

const PLAN_LABELS: Record<string, string> = {
  trial: 'Prueba gratis',
  basico: 'Básico · 30€/mes',
  solo: 'Solo · 30€/mes',
  studio: 'Studio',
  pro: 'Pro',
};

const ROL_LABELS: Record<string, string> = {
  dueno: 'Dueño',
  admin: 'Administrador',
  empleado: 'Empleado',
};

function fmtFecha(d: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

export default async function CuentaPage({
  searchParams,
}: {
  searchParams: Promise<{ connect?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
          <h1 className="tight text-[24px] font-medium text-ink">
            No has iniciado sesión
          </h1>
          <Link
            href="/login"
            className="gloss-btn tight inline-flex rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  // Buscar el salón asociado al usuario
  const [vinculo] = await db
    .select({
      rol: usuariosSalon.rol,
      createdAt: usuariosSalon.createdAt,
      salonId: salones.id,
      salonNombre: salones.nombre,
      salonSlug: salones.slug,
      salonPlan: salones.plan,
      salonLogoUrl: salones.logoUrl,
      stripeConnectAccountId: salones.stripeConnectAccountId,
      stripeConnectOnboarded: salones.stripeConnectOnboarded,
    })
    .from(usuariosSalon)
    .innerJoin(salones, eq(salones.id, usuariosSalon.salonId))
    .where(eq(usuariosSalon.authUserId, user.id))
    .limit(1);

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const fullName =
    typeof meta.full_name === 'string'
      ? meta.full_name
      : typeof meta.name === 'string'
        ? meta.name
        : '';
  const nombreCorto = fullName?.split(' ')[0] ?? '';
  const inicial = (fullName || user.email || 'M').trim().charAt(0).toUpperCase();
  const fechaAlta = user.created_at ? new Date(user.created_at) : null;
  const ultimaSesion = user.last_sign_in_at
    ? new Date(user.last_sign_in_at)
    : null;
  const planLabel = vinculo
    ? PLAN_LABELS[vinculo.salonPlan] ?? vinculo.salonPlan
    : null;
  const rolLabel = vinculo
    ? ROL_LABELS[vinculo.rol] ?? vinculo.rol
    : null;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-col gap-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Mi cuenta
        </p>
        <h1 className="tight text-[26px] font-medium text-ink md:text-[30px]">
          {nombreCorto ? (
            <>
              Hola, <span className="font-serif-it">{nombreCorto}</span>
            </>
          ) : (
            'Tu cuenta'
          )}
        </h1>
        <p className="text-[13.5px] text-stone">
          Datos del usuario con el que has iniciado sesión y vínculo con tu salón.
        </p>
      </header>

      {/* ============================================
          PERFIL
          ============================================ */}
      <section className="card flex flex-col gap-5 p-5 md:p-7">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Perfil
          </span>
          <h2 className="tight text-[19px] font-medium text-ink">
            Tus datos personales
          </h2>
        </header>

        <div className="flex items-center gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-[26px] font-medium text-paper"
            style={{
              background: 'linear-gradient(135deg, var(--terracotta), var(--terracotta-2))',
            }}
          >
            {inicial}
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="tight text-[18px] font-medium text-ink">
              {fullName || (user.email?.split('@')[0] ?? 'Usuario')}
            </div>
            <div className="text-[13px] text-stone">{user.email}</div>
          </div>
        </div>

        <div className="card-tight flex flex-col divide-y divide-line/70 overflow-hidden p-0">
          <Field label="Email" value={user.email ?? '—'} />
          <Field label="Nombre completo" value={fullName || '—'} />
          <Field
            label="Cuenta creada"
            value={fechaAlta ? fmtFecha(fechaAlta) : '—'}
          />
          <Field
            label="Última sesión"
            value={ultimaSesion ? fmtFecha(ultimaSesion) : '—'}
          />
          <Field label="ID de usuario" value={user.id} mono />
        </div>

        <p className="text-[12px] text-stone/80">
          Para cambiar el email o nombre, contacta con soporte.
        </p>
      </section>

      {/* ============================================
          SALÓN VINCULADO
          ============================================ */}
      {vinculo ? (
        <section className="card flex flex-col gap-4 p-5 md:p-7">
          <header className="flex flex-col gap-1">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Salón
            </span>
            <h2 className="tight text-[19px] font-medium text-ink">
              {vinculo.salonNombre}
            </h2>
          </header>

          <div className="flex items-center gap-3">
            {vinculo.salonLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={vinculo.salonLogoUrl}
                alt={vinculo.salonNombre}
                className="h-12 w-12 rounded-lg border border-line object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-cream-2 text-[16px] font-medium text-ink">
                {vinculo.salonNombre.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <a
                href={`https://gonperstudio.shop/s/${vinculo.salonSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tight text-[14px] font-medium text-terracotta hover:text-terracotta-2"
              >
                gonperstudio.shop/s/{vinculo.salonSlug} ↗
              </a>
              <span className="text-[12px] text-stone">
                Web pública del salón
              </span>
            </div>
          </div>

          <div className="card-tight flex flex-col divide-y divide-line/70 overflow-hidden p-0">
            <Field label="Tu rol" value={rolLabel ?? '—'} />
            <Field label="Plan" value={planLabel ?? '—'} />
            <Field
              label="Vinculado desde"
              value={fmtFecha(new Date(vinculo.createdAt))}
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Link
              href="/panel/config"
              className="tight inline-flex items-center gap-2 rounded-full border border-line bg-paper px-4 py-2 text-[13px] font-medium text-ink hover:bg-cream"
            >
              <Icon.Sett width="14" height="14" />
              Configuración del salón
            </Link>
            <Link
              href="/panel/config/suscripcion"
              className="tight inline-flex items-center rounded-full border border-line bg-paper px-4 py-2 text-[13px] font-medium text-ink hover:bg-cream"
            >
              Suscripción
            </Link>
          </div>
        </section>
      ) : (
        <section className="card flex flex-col items-start gap-3 p-6">
          <h2 className="tight text-[18px] font-medium text-ink">
            Aún no tienes salón
          </h2>
          <p className="text-[13.5px] text-stone">
            Tu cuenta está creada pero todavía no hay un salón asociado.
          </p>
        </section>
      )}

      {/* ============================================
          STRIPE CONNECT (cobros B2C de productos)
          ============================================ */}
      {vinculo && (
        <StripeConnectCard
          hasAccount={!!vinculo.stripeConnectAccountId}
          onboarded={vinculo.stripeConnectOnboarded}
          justReturned={sp.connect === 'ok'}
        />
      )}

      {/* ============================================
          SESIÓN
          ============================================ */}
      <section className="card flex flex-col gap-3 p-5 md:p-7">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Sesión
          </span>
          <h2 className="tight text-[18px] font-medium text-ink">
            Cerrar sesión
          </h2>
          <p className="text-[13px] text-stone">
            Te llevaremos a la página de inicio. Volverás a entrar con tu email
            cuando quieras.
          </p>
        </header>
        <form action={signOut} className="flex">
          <button
            type="submit"
            className="tight inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-medium transition"
            style={{
              borderColor: 'rgba(177,72,72,0.4)',
              color: '#7C2E2E',
              background: '#F1D6D6',
            }}
          >
            Cerrar sesión
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-[12px] uppercase tracking-[0.16em] text-stone/70">
        {label}
      </span>
      <span
        className={`text-right text-[13.5px] ${
          mono ? 'font-mono text-[12px]' : 'font-medium'
        } text-ink truncate max-w-[60%]`}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}
