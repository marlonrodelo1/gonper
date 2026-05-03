import Link from 'next/link';
import { and, asc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { clientes, mensajes } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '../../_components/icons';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function inicial(nombre: string): string {
  const c = nombre.trim().charAt(0);
  return c ? c.toUpperCase() : '·';
}

function formatHora(fecha: Date, timezone: string): string {
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(fecha);
}

export default async function ConversacionDetallePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = decodeURIComponent(rawId);

  const salon = (await getCurrentSalon()) as
    | { id: string; nombre: string; timezone: string | null }
    | null;

  if (!salon) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-6 text-center md:p-10">
          <h1 className="tight text-[24px] font-medium text-ink md:text-[28px]">
            Configura tu salón
          </h1>
        </div>
      </div>
    );
  }

  const timezone = salon.timezone ?? 'Europe/Madrid';

  // Intentar como sessionId (chat web)
  let mensajesLista = await db
    .select()
    .from(mensajes)
    .where(
      and(
        eq(mensajes.salonId, salon.id),
        eq(mensajes.canal, 'web'),
        eq(mensajes.sessionId, id),
      ),
    )
    .orderBy(asc(mensajes.createdAt))
    .limit(200);

  let modo: 'web' | 'cliente' = 'web';
  let clienteVinculado: typeof clientes.$inferSelect | null = null;

  if (mensajesLista.length === 0 && UUID_RE.test(id)) {
    // Intentar como clienteId (solo si tiene forma de uuid)
    mensajesLista = await db
      .select()
      .from(mensajes)
      .where(and(eq(mensajes.salonId, salon.id), eq(mensajes.clienteId, id)))
      .orderBy(asc(mensajes.createdAt))
      .limit(200);
    modo = 'cliente';

    if (mensajesLista.length > 0) {
      const cli = await db
        .select()
        .from(clientes)
        .where(and(eq(clientes.salonId, salon.id), eq(clientes.id, id)))
        .limit(1);
      clienteVinculado = cli[0] ?? null;
    }
  } else if (mensajesLista[0]?.clienteId) {
    // Web con cliente vinculado
    const cli = await db
      .select()
      .from(clientes)
      .where(
        and(
          eq(clientes.salonId, salon.id),
          eq(clientes.id, mensajesLista[0].clienteId),
        ),
      )
      .limit(1);
    clienteVinculado = cli[0] ?? null;
  }

  if (mensajesLista.length === 0) {
    return (
      <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
        <Link
          href="/panel/conversaciones"
          className="inline-flex items-center gap-1.5 text-[13px] text-stone hover:text-ink"
        >
          ← Volver a conversaciones
        </Link>
        <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
          <h2 className="tight text-[18px] font-medium text-ink">
            Conversación no encontrada
          </h2>
          <p className="max-w-md text-[13.5px] text-stone">
            No hay mensajes para este identificador en tu salón.
          </p>
        </div>
      </div>
    );
  }

  // Datos cabecera
  const primero = mensajesLista[0];
  const canal = primero.canal as 'web' | 'telegram' | 'whatsapp' | 'sms';
  const nombre =
    clienteVinculado?.nombre ??
    (modo === 'web'
      ? mensajesLista
          .map((m) => m.webVisitorNombre)
          .find((n): n is string => Boolean(n)) ?? 'Visitante anónimo'
      : 'Cliente');
  const telefono =
    clienteVinculado?.telefono ??
    mensajesLista
      .map((m) => m.webVisitorTelefono)
      .find((n): n is string => Boolean(n)) ??
    null;

  const canalLabel =
    canal === 'web'
      ? 'Chat web'
      : canal === 'telegram'
        ? 'Telegram'
        : canal === 'whatsapp'
          ? 'WhatsApp'
          : 'SMS';
  const canalStyle =
    canal === 'web'
      ? { background: 'rgba(60,110,170,0.12)', color: '#1F4E80' }
      : { background: 'rgba(177,72,72,0.12)', color: '#7C2E2E' };

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <Link
        href="/panel/conversaciones"
        className="inline-flex items-center gap-1.5 text-[13px] text-stone hover:text-ink"
      >
        ← Volver a conversaciones
      </Link>

      <header className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center md:p-5">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-line bg-cream-2 text-[20px] font-medium text-ink/80">
          {inicial(nombre)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="tight truncate text-[18px] font-medium text-ink md:text-[20px]">
            {nombre}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-stone">
            <span
              className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={canalStyle}
            >
              {canalLabel}
            </span>
            {telefono && (
              <span className="inline-flex items-center gap-1">
                <Icon.Phone width="12" height="12" />
                {telefono}
              </span>
            )}
            <span className="text-stone/60">
              {mensajesLista.length}{' '}
              {mensajesLista.length === 1 ? 'mensaje' : 'mensajes'}
            </span>
          </div>
        </div>
        {clienteVinculado && (
          <Link
            href={`/panel/clientes/${clienteVinculado.id}`}
            className="tight inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-4 py-2 text-[13px] font-medium text-ink hover:border-line-2"
          >
            Ver ficha
            <Icon.Arrow width="12" height="12" />
          </Link>
        )}
      </header>

      <div className="card flex flex-col gap-3 p-3 md:p-5">
        {mensajesLista.map((m) => {
          const out = m.direccion === 'out';
          return (
            <div
              key={m.id}
              className={`flex flex-col ${out ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14px] md:max-w-[80%] ${
                  out
                    ? 'rounded-br-sm bg-ink text-cream'
                    : 'rounded-bl-sm border border-line bg-paper text-ink'
                }`}
              >
                {m.contenido}
              </div>
              <div className="mt-1 px-2 text-[10.5px] text-stone/70">
                {formatHora(m.createdAt, timezone)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
