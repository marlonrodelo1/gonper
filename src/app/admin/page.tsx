import Link from 'next/link';
import { count, countDistinct, desc, eq, inArray, or } from 'drizzle-orm';

import { db } from '@/lib/db';
import { leads, salones, usuariosSalon } from '@/lib/db/schema';
import { requireSuperAdmin } from '@/lib/auth/super-admin';

import { PanelTopbar } from '../panel/_components/panel-topbar';

const TIMEZONE = 'Europe/Madrid';

function formatearFechaTopbar(): string {
  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIMEZONE,
  }).format(new Date());
  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

function formatearFechaCorta(fecha: Date): string {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: TIMEZONE,
  }).format(fecha);
}

const PLANES_PAGANDO = ['basico', 'solo', 'studio', 'pro'] as const;

export default async function AdminDashboardPage() {
  await requireSuperAdmin();

  const [
    totalSalonesRows,
    enTrialRows,
    pagandoRows,
    canceladosRows,
    usuariosRows,
    leadsSinConvertirRows,
    ultimosSalones,
    ultimosLeads,
  ] = await Promise.all([
    db.select({ value: count() }).from(salones),
    db
      .select({ value: count() })
      .from(salones)
      .where(eq(salones.plan, 'trial')),
    db
      .select({ value: count() })
      .from(salones)
      .where(inArray(salones.plan, [...PLANES_PAGANDO])),
    db
      .select({ value: count() })
      .from(salones)
      .where(or(eq(salones.plan, 'cancelado'), eq(salones.activo, false))),
    db
      .select({ value: countDistinct(usuariosSalon.authUserId) })
      .from(usuariosSalon),
    db
      .select({ value: count() })
      .from(leads)
      .where(eq(leads.convertido, false)),
    db
      .select({
        id: salones.id,
        slug: salones.slug,
        nombre: salones.nombre,
        tipoNegocio: salones.tipoNegocio,
        plan: salones.plan,
        createdAt: salones.createdAt,
      })
      .from(salones)
      .orderBy(desc(salones.createdAt))
      .limit(5),
    db
      .select({
        id: leads.id,
        email: leads.email,
        nombre: leads.nombre,
        tipoNegocio: leads.tipoNegocio,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(5),
  ]);

  const totalSalones = totalSalonesRows[0]?.value ?? 0;
  const enTrial = enTrialRows[0]?.value ?? 0;
  const pagando = pagandoRows[0]?.value ?? 0;
  const cancelados = canceladosRows[0]?.value ?? 0;
  const usuariosTotales = usuariosRows[0]?.value ?? 0;
  const leadsSinConvertir = leadsSinConvertirRows[0]?.value ?? 0;

  const fechaTopbar = formatearFechaTopbar();

  type Kpi = {
    label: string;
    value: number;
    foot?: string;
  };

  const kpis: Kpi[] = [
    {
      label: 'Total salones',
      value: totalSalones,
      foot: 'Todos los registrados en la plataforma',
    },
    {
      label: 'En trial',
      value: enTrial,
      foot: 'Salones con plan trial',
    },
    {
      label: 'Pagando',
      value: pagando,
      foot: 'Plan básico, solo, studio o pro',
    },
    {
      label: 'Cancelados / inactivos',
      value: cancelados,
      foot: 'Plan cancelado o inactivos',
    },
    {
      label: 'Usuarios totales',
      value: usuariosTotales,
      foot: 'Cuentas únicas vinculadas a salones',
    },
    {
      label: 'Leads sin convertir',
      value: leadsSinConvertir,
      foot: 'De la landing, todavía sin salón',
    },
  ];

  return (
    <>
      <PanelTopbar
        titulo="Panel super admin."
        saludoSegundaLinea="vista global de la plataforma"
        subtitulo={fechaTopbar}
      />

      <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
        {/* KPIs */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="card p-5">
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
                {kpi.label}
              </div>
              <div className="tight tabular mt-2 text-[32px] font-medium text-ink">
                {kpi.value}
              </div>
              {kpi.foot && (
                <div className="mt-1 text-[12px] text-stone">{kpi.foot}</div>
              )}
            </div>
          ))}
        </section>

        {/* Últimos salones */}
        <section className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
                Últimos registros
              </div>
              <div className="tight mt-0.5 text-[18px] font-medium text-ink">
                Salones más recientes
              </div>
            </div>
            <div className="flex-1" />
            <Link
              href="/admin/salones"
              className="text-[12px] text-terracotta hover:text-terracotta-2"
            >
              Ver todos →
            </Link>
          </div>
          {ultimosSalones.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-stone">
              Aún no hay salones registrados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-cream/40 text-[10px] uppercase tracking-[0.2em] text-stone/70">
                    <th className="px-5 py-3 font-normal">Nombre</th>
                    <th className="px-5 py-3 font-normal">Slug</th>
                    <th className="px-5 py-3 font-normal">Tipo</th>
                    <th className="px-5 py-3 font-normal">Plan</th>
                    <th className="px-5 py-3 text-right font-normal">
                      Creado
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {ultimosSalones.map((s) => (
                    <tr key={s.id} className="hover:bg-paper/60">
                      <td className="tight px-5 py-3 text-ink">{s.nombre}</td>
                      <td className="px-5 py-3 font-mono text-[12px] text-stone">
                        {s.slug}
                      </td>
                      <td className="px-5 py-3 text-stone">{s.tipoNegocio}</td>
                      <td className="px-5 py-3">
                        <span className="pill rounded-full border border-line bg-cream px-2 py-0.5 text-[11px] text-stone">
                          {s.plan}
                        </span>
                      </td>
                      <td className="tabular px-5 py-3 text-right text-stone">
                        {formatearFechaCorta(s.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Últimos leads */}
        <section className="card overflow-hidden">
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
                Conversión
              </div>
              <div className="tight mt-0.5 text-[18px] font-medium text-ink">
                Leads recientes
              </div>
            </div>
            <div className="flex-1" />
            <Link
              href="/admin/leads"
              className="text-[12px] text-terracotta hover:text-terracotta-2"
            >
              Ver todos →
            </Link>
          </div>
          {ultimosLeads.length === 0 ? (
            <div className="px-5 py-12 text-center text-[13px] text-stone">
              Aún no hay leads de la landing.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line bg-cream/40 text-[10px] uppercase tracking-[0.2em] text-stone/70">
                    <th className="px-5 py-3 font-normal">Email</th>
                    <th className="px-5 py-3 font-normal">Nombre</th>
                    <th className="px-5 py-3 font-normal">Tipo de negocio</th>
                    <th className="px-5 py-3 text-right font-normal">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/70">
                  {ultimosLeads.map((l) => (
                    <tr key={l.id} className="hover:bg-paper/60">
                      <td className="tight px-5 py-3 text-ink">{l.email}</td>
                      <td className="px-5 py-3 text-stone">
                        {l.nombre ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-stone">
                        {l.tipoNegocio ?? '—'}
                      </td>
                      <td className="tabular px-5 py-3 text-right text-stone">
                        {formatearFechaCorta(l.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
