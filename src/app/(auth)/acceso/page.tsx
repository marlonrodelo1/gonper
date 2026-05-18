import Link from 'next/link';

import { login, signup } from '../actions';

/**
 * Página combinada de acceso: el usuario elige entre Entrar (login) o
 * Crear cuenta gratis (signup) con tabs. Reemplaza los dos enlaces
 * separados del header de la landing.
 *
 * El tab activo se controla con el query param `?modo=entrar|crear`
 * (default: entrar). Las server actions login/signup leen un campo
 * hidden `_return=acceso` y, si fallan, redirigen aquí mismo con el
 * mismo tab activo + el error.
 *
 * Las páginas /login y /signup se mantienen vivas para no romper
 * bookmarks ni enlaces externos.
 */
export default async function AccesoPage({
  searchParams,
}: {
  searchParams: Promise<{
    modo?: 'entrar' | 'crear';
    error?: string;
    email?: string;
  }>;
}) {
  const { modo: modoRaw, error, email: emailFromQuery } = await searchParams;
  const modo: 'entrar' | 'crear' = modoRaw === 'crear' ? 'crear' : 'entrar';

  return (
    <>
      <div className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          {modo === 'crear' ? 'Bienvenido' : 'Acceso'}
        </div>
        <h1 className="tight mt-1 text-[26px] font-medium text-ink">
          {modo === 'crear' ? 'Crea tu cuenta' : 'Iniciar sesión'}
        </h1>
        <p className="mt-1 text-[13.5px] text-stone">
          {modo === 'crear'
            ? 'Configura tu salón en menos de un minuto. Trial gratis 7 días.'
            : 'Entra al panel de tu salón.'}
        </p>
      </div>

      {/* Tabs */}
      <div
        className="mb-6 inline-flex w-full items-center gap-1 rounded-full border border-line bg-paper p-1"
        role="tablist"
        aria-label="Selecciona acceso o registro"
      >
        <Link
          href="/acceso?modo=entrar"
          role="tab"
          aria-selected={modo === 'entrar'}
          className={
            'tight flex-1 rounded-full px-4 py-2 text-center text-[13px] font-medium transition ' +
            (modo === 'entrar'
              ? 'bg-ink text-cream'
              : 'text-stone hover:text-ink')
          }
        >
          Entrar
        </Link>
        <Link
          href="/acceso?modo=crear"
          role="tab"
          aria-selected={modo === 'crear'}
          className={
            'tight flex-1 rounded-full px-4 py-2 text-center text-[13px] font-medium transition ' +
            (modo === 'crear'
              ? 'bg-ink text-cream'
              : 'text-stone hover:text-ink')
          }
        >
          Crear cuenta
        </Link>
      </div>

      {modo === 'entrar' ? (
        <form action={login} className="flex flex-col gap-4">
          <input type="hidden" name="_return" value="acceso" />

          <Field
            id="email"
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            defaultValue={emailFromQuery ?? ''}
          />
          <Field
            id="password"
            label="Contraseña"
            type="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />

          {error ? <ErrorBox>{error}</ErrorBox> : null}

          <button
            type="submit"
            className="gloss-btn tight mt-1 inline-flex h-11 w-full items-center justify-center rounded-full text-[14px] font-medium"
          >
            Entrar
          </button>

          <p className="mt-2 text-center text-[13px] text-stone">
            ¿No tienes cuenta?{' '}
            <Link
              href="/acceso?modo=crear"
              className="font-medium text-terracotta hover:text-terracotta-2"
            >
              Crear una gratis
            </Link>
          </p>
        </form>
      ) : (
        <form action={signup} className="flex flex-col gap-4">
          <input type="hidden" name="_return" value="acceso" />

          <Field
            id="email"
            label="Email"
            type="email"
            name="email"
            autoComplete="email"
            required
            placeholder="tu@email.com"
            defaultValue={emailFromQuery ?? ''}
          />
          <Field
            id="password"
            label="Contraseña"
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
          />
          <Field
            id="salon_nombre"
            label="Nombre del salón"
            type="text"
            name="salon_nombre"
            required
            placeholder="Revolution Barbershop"
          />
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
              className={inputClass}
            />
            <p className="text-[11.5px] text-stone/80">
              Será parte de tu URL pública: gonperstudio.shop/
              <span className="text-ink">tu-slug</span>
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
              className={inputClass}
            >
              <option value="barberia">Barbería</option>
              <option value="peluqueria">Peluquería</option>
              <option value="estetica">Estética</option>
              <option value="manicura">Manicura</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          {error ? <ErrorBox>{error}</ErrorBox> : null}

          <button
            type="submit"
            className="gloss-btn tight mt-1 inline-flex h-11 w-full items-center justify-center rounded-full text-[14px] font-medium"
          >
            Crear cuenta y salón
          </button>

          <p className="mt-2 text-center text-[13px] text-stone">
            ¿Ya tienes cuenta?{' '}
            <Link
              href="/acceso?modo=entrar"
              className="font-medium text-terracotta hover:text-terracotta-2"
            >
              Entra aquí
            </Link>
          </p>
        </form>
      )}
    </>
  );
}

const inputClass =
  'w-full rounded-xl border border-line bg-paper px-4 py-2.5 text-[14px] text-ink outline-none transition focus:border-line-2 focus:bg-cream';

type FieldProps = {
  id: string;
  label: string;
  name: string;
  type: 'text' | 'email' | 'password';
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  defaultValue?: string;
};

function Field({
  id,
  label,
  name,
  type,
  required,
  placeholder,
  autoComplete,
  minLength,
  defaultValue,
}: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[12px] font-medium uppercase tracking-[0.16em] text-stone"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        minLength={minLength}
        defaultValue={defaultValue}
        className={inputClass}
      />
    </div>
  );
}

function ErrorBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-terracotta/30 bg-terracotta-soft/40 px-3 py-2 text-[12.5px] text-terracotta-2">
      {children}
    </div>
  );
}
