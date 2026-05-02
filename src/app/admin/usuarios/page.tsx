import Link from 'next/link';
import { inArray } from 'drizzle-orm';

import { requireSuperAdmin } from '@/lib/auth/super-admin';
import { db } from '@/lib/db';
import { salones, usuariosSalon } from '@/lib/db/schema';
import { createAdminClient } from '@/lib/supabase/admin';

type AuthUserMin = {
  id: string;
  email: string | null;
  createdAt: Date | null;
  lastSignInAt: Date | null;
};

function parseDate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatearFecha(d: Date | null): string {
  if (!d) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await searchParams;
  const q = (sp.q ?? '').trim().toLowerCase();

  const admin = createAdminClient();
  const { data: listData, error: listError } = await admin.auth.admin.listUsers(
    { page: 1, perPage: 100 },
  );

  const usuariosAuth: AuthUserMin[] = (listData?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? null,
    createdAt: parseDate(u.created_at),
    lastSignInAt: parseDate(u.last_sign_in_at),
  }));

  // Vínculos a salones (un map authUserId → primer salón vinculado)
  const ids = usuariosAuth.map((u) => u.id);
  const allLinks = ids.length
    ? await db
        .select()
        .from(usuariosSalon)
        .where(inArray(usuariosSalon.authUserId, ids))
    : [];

  const salonIds = [...new Set(allLinks.map((l) => l.salonId))];
  const allSalones = salonIds.length
    ? await db
        .select({
          id: salones.id,
          nombre: salones.nombre,
          slug: salones.slug,
        })
        .from(salones)
        .where(inArray(salones.id, salonIds))
    : [];
  const salonById = new Map(allSalones.map((s) => [s.id, s]));

  const mapVinc = new Map<
    string,
    { rol: string; salonId: string; salonNombre: string; salonSlug: string }
  >();
  for (const link of allLinks) {
    if (mapVinc.has(link.authUserId)) continue;
    const s = salonById.get(link.salonId);
    if (!s) continue;
    mapVinc.set(link.authUserId, {
      rol: link.rol,
      salonId: s.id,
      salonNombre: s.nombre,
      salonSlug: s.slug,
    });
  }

  const filtrados = q
    ? usuariosAuth.filter((u) => (u.email ?? '').toLowerCase().includes(q))
    : usuariosAuth;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header>
        <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Plataforma
        </div>
        <h1 className="tight mt-1 text-[28px] font-medium text-ink">
          Usuarios
        </h1>
        <p className="mt-1 text-[13.5px] text-stone">
          {usuariosAuth.length} usuario{usuariosAuth.length === 1 ? '' : 's'} en
          Supabase Auth · mostrando {filtrados.length}
          {listError && (
            <span className="text-terracotta-2">
              {' '}
              · error: {listError.message}
            </span>
          )}
        </p>
      </header>

      <div className="card p-5">
        <form method="GET" className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Filtrar por email…"
            className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream md:max-w-sm"
          />
          <button
            type="submit"
            className="tight rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] text-ink hover:bg-cream"
          >
            Filtrar
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="tight text-[16px] font-medium text-ink">
              Sin usuarios
            </p>
            <p className="mt-1 text-[13px] text-stone">
              {q ? 'Nada coincide con tu búsqueda.' : 'Aún no hay usuarios.'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_72px] gap-3 border-b border-line bg-cream/40 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-stone/70">
              <div>Email</div>
              <div>Creado</div>
              <div>Último login</div>
              <div>Salón</div>
              <div className="text-right">Rol</div>
            </div>
            <div className="divide-y divide-line/70">
              {filtrados.map((u) => {
                const vinc = mapVinc.get(u.id);
                return (
                  <div
                    key={u.id}
                    className="grid grid-cols-[2fr_1fr_1fr_1.5fr_72px] items-center gap-3 px-5 py-3 text-[13.5px] text-ink hover:bg-paper/50"
                  >
                    <div className="min-w-0 truncate">
                      {u.email ?? (
                        <span className="font-mono text-[12px] text-stone">
                          {u.id}
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-stone">
                      {formatearFecha(u.createdAt)}
                    </div>
                    <div className="text-[12px] text-stone">
                      {formatearFecha(u.lastSignInAt)}
                    </div>
                    <div className="min-w-0 truncate">
                      {vinc ? (
                        <Link
                          href={`/admin/salones/${vinc.salonId}`}
                          className="text-terracotta hover:text-terracotta-2"
                        >
                          {vinc.salonNombre}{' '}
                          <span className="text-stone/70">/{vinc.salonSlug}</span>
                        </Link>
                      ) : (
                        <span className="text-stone/60">—</span>
                      )}
                    </div>
                    <div className="text-right text-[12px] capitalize text-stone">
                      {vinc?.rol ?? '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
