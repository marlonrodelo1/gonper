import Link from 'next/link';

import { signup } from '../actions';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Bienvenido
        </div>
        <h1 className="tight mt-1 text-[26px] font-medium text-ink">
          Crea tu cuenta
        </h1>
        <p className="mt-1 text-[13.5px] text-stone">
          Configura tu salón en menos de un minuto. Trial gratis 7 días.
        </p>
      </div>

      <form action={signup} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email"
            className="text-[12px] font-medium uppercase tracking-[0.16em] text-stone"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="password"
            className="text-[12px] font-medium uppercase tracking-[0.16em] text-stone"
          >
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
            placeholder="Mínimo 8 caracteres"
            className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="salon_nombre"
            className="text-[12px] font-medium uppercase tracking-[0.16em] text-stone"
          >
            Nombre del salón
          </label>
          <input
            id="salon_nombre"
            name="salon_nombre"
            type="text"
            required
            placeholder="Revolution Barbershop"
            className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="salon_slug"
            className="text-[12px] font-medium uppercase tracking-[0.16em] text-stone"
          >
            Slug del salón
          </label>
          <input
            id="salon_slug"
            name="salon_slug"
            type="text"
            required
            pattern="[a-z0-9\-]+"
            placeholder="revolution-bcn"
            className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream"
          />
          <p className="text-[11.5px] text-stone/80">
            Será parte de tu URL pública: gestori.es/<span className="text-ink">tu-slug</span>
          </p>
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
            className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream"
          >
            <option value="barberia">Barbería</option>
            <option value="peluqueria">Peluquería</option>
            <option value="estetica">Estética</option>
            <option value="manicura">Manicura</option>
            <option value="otro">Otro</option>
          </select>
        </div>

        {error && (
          <div className="rounded-lg border border-terracotta/30 bg-terracotta-soft/40 px-3 py-2 text-[12.5px] text-terracotta-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="gloss-btn tight mt-1 inline-flex h-11 w-full items-center justify-center rounded-full text-[14px] font-medium"
        >
          Crear cuenta y salón
        </button>

        <p className="mt-2 text-center text-[13px] text-stone">
          ¿Ya tienes cuenta?{' '}
          <Link
            href="/login"
            className="font-medium text-terracotta hover:text-terracotta-2"
          >
            Entra
          </Link>
        </p>
      </form>
    </>
  );
}
