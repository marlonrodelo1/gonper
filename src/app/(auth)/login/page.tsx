import Link from 'next/link';

import { login } from '../actions';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Acceso
        </div>
        <h1 className="tight mt-1 text-[26px] font-medium text-ink">
          Iniciar sesión
        </h1>
        <p className="mt-1 text-[13.5px] text-stone">
          Entra al panel de tu salón.
        </p>
      </div>

      <form action={login} className="flex flex-col gap-4">
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
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream"
          />
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
          Entrar
        </button>

        <p className="mt-2 text-center text-[13px] text-stone">
          ¿No tienes cuenta?{' '}
          <Link
            href="/signup"
            className="font-medium text-terracotta hover:text-terracotta-2"
          >
            Regístrate
          </Link>
        </p>
      </form>
    </>
  );
}
