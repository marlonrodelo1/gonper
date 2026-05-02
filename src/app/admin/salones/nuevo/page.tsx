import Link from 'next/link';

import { requireSuperAdmin } from '@/lib/auth/super-admin';

import { crearSalonManual } from './actions';

function generarPassword(): string {
  // sugerencia visual de 12 chars
  const alphabet = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 12; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export default async function NuevoSalonPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireSuperAdmin();
  const { error } = await searchParams;

  const passwordSugerido = generarPassword();

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <div>
        <Link
          href="/admin/salones"
          className="tight inline-flex items-center gap-1 text-[13px] text-stone hover:text-ink"
        >
          ← Volver a salones
        </Link>
      </div>

      <header className="max-w-xl">
        <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Plataforma · Alta manual
        </div>
        <h1 className="tight mt-1 text-[28px] font-medium text-ink">
          Nuevo salón
        </h1>
        <p className="mt-1 text-[13.5px] text-stone">
          Crea el dueño en Supabase Auth y un salón en trial de 7 días.
          Comparte la contraseña por canal seguro.
        </p>
      </header>

      <div className="card max-w-2xl p-6">
        <form action={crearSalonManual} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="nombre"
                className="text-[12px] font-medium uppercase tracking-[0.16em] text-stone"
              >
                Nombre del salón
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                placeholder="Revolution Barbershop"
                className="rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="slug"
                className="text-[12px] font-medium uppercase tracking-[0.16em] text-stone"
              >
                Slug
              </label>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                pattern="[a-z0-9\-]+"
                placeholder="revolution-bcn"
                className="rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream"
              />
              <p className="text-[11.5px] text-stone/80">
                Será gestori.es/<span className="text-ink">slug</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="tipo_negocio"
              className="text-[12px] font-medium uppercase tracking-[0.16em] text-stone"
            >
              Tipo de negocio
            </label>
            <select
              id="tipo_negocio"
              name="tipo_negocio"
              defaultValue="otro"
              className="rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream"
            >
              <option value="barberia">Barbería</option>
              <option value="peluqueria">Peluquería</option>
              <option value="estetica">Estética</option>
              <option value="manicura">Manicura</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="agente_nombre"
              className="text-[12px] font-medium uppercase tracking-[0.16em] text-stone"
            >
              Nombre del agente
            </label>
            <input
              id="agente_nombre"
              name="agente_nombre"
              type="text"
              required
              defaultValue="Juanita"
              className="rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream"
            />
          </div>

          <div className="my-2 border-t border-line/60" />

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[12px] font-medium uppercase tracking-[0.16em] text-stone"
              >
                Email del dueño
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="dueno@salon.com"
                className="rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[12px] font-medium uppercase tracking-[0.16em] text-stone"
              >
                Password inicial
              </label>
              <input
                id="password"
                name="password"
                type="text"
                minLength={8}
                required
                placeholder={passwordSugerido}
                className="rounded-xl border border-line bg-paper px-4 py-2.5 font-mono text-[13px] text-ink outline-none transition focus:border-line-2 focus:bg-cream"
              />
              <p className="text-[11.5px] text-stone/80">
                Sugerencia: <span className="font-mono text-ink">{passwordSugerido}</span>
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-terracotta/30 bg-terracotta-soft/40 px-3 py-2 text-[12.5px] text-terracotta-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="gloss-btn tight mt-1 inline-flex h-11 items-center justify-center rounded-full text-[14px] font-medium"
          >
            Crear salón en trial 7d
          </button>
        </form>
      </div>
    </div>
  );
}
