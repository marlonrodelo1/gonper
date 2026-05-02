import Link from 'next/link';
import { notFound } from 'next/navigation';
import { count, eq } from 'drizzle-orm';

import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { db } from '@/lib/db';
import {
  citas,
  clientes,
  mensajes,
  salones,
  usuariosSalon,
} from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';

import {
  borrarSalon,
  cancelarSuscripcion,
  forzarPlanBasico,
  reactivarSalon,
  suspenderSalon,
} from './actions';
import { ConfirmForm } from './confirm-form';

function formatearFecha(d: Date | null | undefined): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function planPillClasses(plan: string): string {
  if (plan === 'cancelado') {
    return 'bg-terracotta-soft/40 text-terracotta-2 border-terracotta/30';
  }
  if (plan === 'trial') {
    return 'bg-paper text-stone border-line';
  }
  return 'bg-sage-soft/40 text-sage-2 border-sage/30';
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 border-b border-line/60 py-2 last:border-0">
      <div className="text-[11px] uppercase tracking-[0.18em] text-stone/70">
        {label}
      </div>
      <div className="text-[13.5px] text-ink">{value ?? '—'}</div>
    </div>
  );
}

export default async function AdminSalonDetallePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await params;
  const { error } = await searchParams;

  const [salon] = await db
    .select()
    .from(salones)
    .where(eq(salones.id, id))
    .limit(1);

  if (!salon) {
    notFound();
  }

  // Dueños / staff vinculados
  const usuarios = await db
    .select({
      id: usuariosSalon.id,
      authUserId: usuariosSalon.authUserId,
      rol: usuariosSalon.rol,
      createdAt: usuariosSalon.createdAt,
    })
    .from(usuariosSalon)
    .where(eq(usuariosSalon.salonId, salon.id));

  // Hidratar emails desde auth.users vía admin client
  const admin = createAdminClient();
  const usuariosConEmail = await Promise.all(
    usuarios.map(async (u) => {
      try {
        const { data } = await admin.auth.admin.getUserById(u.authUserId);
        return {
          ...u,
          email: data.user?.email ?? null,
        };
      } catch {
        return { ...u, email: null };
      }
    }),
  );

  // Stats rápidas
  const [{ totalCitas }] = await db
    .select({ totalCitas: count(citas.id) })
    .from(citas)
    .where(eq(citas.salonId, salon.id));

  const [{ totalClientes }] = await db
    .select({ totalClientes: count(clientes.id) })
    .from(clientes)
    .where(eq(clientes.salonId, salon.id));

  const [{ totalMensajes }] = await db
    .select({ totalMensajes: count(mensajes.id) })
    .from(mensajes)
    .where(eq(mensajes.salonId, salon.id));

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/salones"
          className="tight inline-flex items-center gap-1 text-[13px] text-stone hover:text-ink"
        >
          ← Volver a salones
        </Link>
        <Link
          href={`/s/${salon.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="tight inline-flex items-center gap-1 text-[12.5px] text-terracotta hover:text-terracotta-2"
        >
          Ver web pública /s/{salon.slug} ↗
        </Link>
      </div>

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="tight text-[28px] font-medium text-ink">
            {salon.nombre}
          </h1>
          <span
            className={`pill inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] capitalize ${planPillClasses(
              salon.plan,
            )}`}
          >
            {salon.plan}
          </span>
          {!salon.activo && (
            <span className="pill inline-flex items-center rounded-full border border-terracotta/30 bg-terracotta-soft/40 px-2.5 py-0.5 text-[11px] uppercase tracking-wider text-terracotta-2">
              Suspendido
            </span>
          )}
        </div>
        <p className="text-[13px] text-stone">
          /{salon.slug} ·{' '}
          <span className="capitalize">{salon.tipoNegocio}</span> · creado{' '}
          {formatearFecha(salon.createdAt)}
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-terracotta/30 bg-terracotta-soft/40 px-4 py-3 text-[13px] text-terracotta-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        {/* Columna izquierda */}
        <div className="flex flex-col gap-6">
          {/* Datos básicos */}
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="tight text-[16px] font-medium text-ink">
                Datos básicos
              </h2>
            </div>
            <div className="flex flex-col">
              <FieldRow label="Nombre" value={salon.nombre} />
              <FieldRow label="Slug" value={salon.slug} />
              <FieldRow
                label="Tipo"
                value={<span className="capitalize">{salon.tipoNegocio}</span>}
              />
              <FieldRow label="Dirección" value={salon.direccion} />
              <FieldRow label="Teléfono" value={salon.telefono} />
              <FieldRow label="Email" value={salon.email} />
              <FieldRow label="Timezone" value={salon.timezone} />
              <FieldRow label="Agente" value={salon.agenteNombre} />
            </div>
          </section>

          {/* Suscripción */}
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="tight text-[16px] font-medium text-ink">
                Suscripción
              </h2>
              <span
                className={`pill inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] capitalize ${planPillClasses(
                  salon.plan,
                )}`}
              >
                {salon.plan}
              </span>
            </div>
            <div className="flex flex-col">
              <FieldRow label="Plan" value={salon.plan} />
              <FieldRow
                label="Trial hasta"
                value={formatearFecha(salon.trialUntil)}
              />
              <FieldRow
                label="Stripe customer"
                value={
                  salon.stripeCustomerId ? (
                    <span className="font-mono text-[12px]">
                      {salon.stripeCustomerId}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
              <FieldRow
                label="Stripe subscr."
                value={
                  salon.stripeSubscriptionId ? (
                    <span className="font-mono text-[12px]">
                      {salon.stripeSubscriptionId}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
            </div>
          </section>

          {/* Dueños / equipo */}
          <section className="card p-5">
            <h2 className="tight mb-3 text-[16px] font-medium text-ink">
              Dueños y equipo ({usuariosConEmail.length})
            </h2>
            {usuariosConEmail.length === 0 ? (
              <p className="text-[13px] text-stone">
                Sin usuarios vinculados. Probable error de onboarding.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-line">
                <div className="grid grid-cols-[1fr_100px_140px] gap-3 border-b border-line bg-cream/40 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] text-stone/70">
                  <div>Email</div>
                  <div>Rol</div>
                  <div>Vinculado</div>
                </div>
                <div className="divide-y divide-line/70">
                  {usuariosConEmail.map((u) => (
                    <div
                      key={u.id}
                      className="grid grid-cols-[1fr_100px_140px] gap-3 px-4 py-2.5 text-[13px] text-ink"
                    >
                      <div className="truncate">{u.email ?? u.authUserId}</div>
                      <div className="capitalize text-stone">{u.rol}</div>
                      <div className="text-[12px] text-stone">
                        {formatearFecha(u.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Estadísticas */}
          <section className="card p-5">
            <h2 className="tight mb-4 text-[16px] font-medium text-ink">
              Estadísticas rápidas
            </h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line bg-paper p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone/70">
                  Citas
                </div>
                <div className="tight mt-1 text-[24px] font-medium text-ink">
                  {totalCitas}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-paper p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone/70">
                  Clientes
                </div>
                <div className="tight mt-1 text-[24px] font-medium text-ink">
                  {totalClientes}
                </div>
              </div>
              <div className="rounded-xl border border-line bg-paper p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-stone/70">
                  Mensajes
                </div>
                <div className="tight mt-1 text-[24px] font-medium text-ink">
                  {totalMensajes}
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Columna derecha — acciones */}
        <aside className="flex flex-col gap-6">
          <section className="card p-5">
            <h2 className="tight mb-1 text-[16px] font-medium text-ink">
              Acciones rápidas
            </h2>
            <p className="mb-4 text-[12px] text-stone">
              Cambios manuales sobre este salón. Algunas acciones son
              destructivas.
            </p>

            <div className="flex flex-col gap-2">
              {salon.activo ? (
                <form action={suspenderSalon}>
                  <input type="hidden" name="salonId" value={salon.id} />
                  <button
                    type="submit"
                    className="tight w-full rounded-full border border-line bg-paper px-4 py-2 text-[13px] text-ink transition hover:bg-cream"
                  >
                    Suspender salón
                  </button>
                </form>
              ) : (
                <form action={reactivarSalon}>
                  <input type="hidden" name="salonId" value={salon.id} />
                  <button
                    type="submit"
                    className="tight w-full rounded-full border border-sage/40 bg-sage-soft/30 px-4 py-2 text-[13px] text-sage-2 transition hover:bg-sage-soft/60"
                  >
                    Reactivar salón
                  </button>
                </form>
              )}

              <form action={forzarPlanBasico}>
                <input type="hidden" name="salonId" value={salon.id} />
                <button
                  type="submit"
                  className="tight w-full rounded-full border border-line bg-paper px-4 py-2 text-[13px] text-ink transition hover:bg-cream"
                >
                  Forzar plan «básico»
                </button>
              </form>

              <form action={cancelarSuscripcion}>
                <input type="hidden" name="salonId" value={salon.id} />
                <button
                  type="submit"
                  className="tight w-full rounded-full border border-line bg-paper px-4 py-2 text-[13px] text-ink transition hover:bg-cream"
                >
                  Cancelar suscripción
                </button>
              </form>

              <div className="my-2 border-t border-line/60" />

              <ConfirmForm
                action={borrarSalon}
                salonId={salon.id}
                confirmMessage={`¿Borrar permanentemente el salón "${salon.nombre}"? Esta acción NO se puede deshacer.`}
                label="Borrar salón"
              />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="tight mb-3 text-[14px] font-medium text-ink">
              Identificadores
            </h2>
            <FieldRow
              label="ID"
              value={
                <span className="font-mono text-[11.5px]">{salon.id}</span>
              }
            />
            <FieldRow
              label="Created"
              value={formatearFecha(salon.createdAt)}
            />
            <FieldRow
              label="Updated"
              value={formatearFecha(salon.updatedAt)}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}
