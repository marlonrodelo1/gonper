import Link from 'next/link';

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { crearCliente } from '../actions';

const inputClass =
  'w-full rounded-2xl border border-line bg-paper px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/60 focus:border-line-2 focus:outline-none';

export default async function NuevoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-1">
        <Link
          href="/panel/clientes"
          className="text-[12.5px] text-stone hover:text-ink"
        >
          ← Clientes
        </Link>
        <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Nuevo cliente
        </p>
        <h1 className="tight text-[28px] font-medium text-ink">
          Añade un cliente{' '}
          <span className="font-serif-it text-stone/70">a tu salón</span>
        </h1>
        <p className="mt-1 text-[13.5px] text-stone">
          Datos básicos. Podrás editarlos más adelante.
        </p>
      </div>

      {params.error ? (
        <div
          className="rounded-xl border px-4 py-3 text-[13.5px]"
          style={{
            background: '#F1D6D6',
            borderColor: 'rgba(177,72,72,0.4)',
            color: '#7C2E2E',
          }}
        >
          {params.error}
        </div>
      ) : null}

      <form action={crearCliente} className="card flex flex-col gap-5 p-6">
        <div className="space-y-2">
          <Label htmlFor="nombre" className="text-[12.5px] text-stone">
            Nombre
          </Label>
          <input
            id="nombre"
            name="nombre"
            required
            maxLength={120}
            placeholder="Ej. María García"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="telefono" className="text-[12.5px] text-stone">
              Teléfono (opcional)
            </Label>
            <input
              id="telefono"
              name="telefono"
              type="tel"
              placeholder="+34 600 00 00 00"
              className={inputClass}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[12.5px] text-stone">
              Email (opcional)
            </Label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="cliente@ejemplo.com"
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label
            htmlFor="notasPrivadas"
            className="text-[12.5px] text-stone"
          >
            Notas privadas (opcional)
          </Label>
          <textarea
            id="notasPrivadas"
            name="notasPrivadas"
            rows={4}
            placeholder="Información interna que solo tú verás (alergias, preferencias, etc.)"
            className={inputClass}
          />
        </div>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-cream/40 px-5 py-4">
          <div>
            <Label
              htmlFor="requiereDeposito"
              className="tight text-[14px] font-medium text-ink"
            >
              Requiere depósito
            </Label>
            <p className="text-[12px] text-stone">
              Si lo activas, se le pedirá depósito al reservar.
            </p>
          </div>
          <Switch id="requiereDeposito" name="requiereDeposito" />
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="gloss-btn tight inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          >
            Crear cliente
          </button>
          <Link
            href="/panel/clientes"
            className="tight text-[13.5px] text-stone hover:text-ink"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
