import Link from 'next/link';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones } from '@/lib/db/schema';
import { verifyCitaToken, type AccionCita } from '@/lib/citas/token';
import { responderCita } from '@/lib/citas/responder';
import { getAccentVars } from '@/lib/salon-publico/accent';
import { Icon } from '@/components/salon-publico/icons';

function formatFechaHora(d: Date, tz: string): string {
  const fecha = new Intl.DateTimeFormat('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: tz,
  }).format(d);
  const hora = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(d);
  return `${fecha} a las ${hora}`;
}

interface Props {
  token: string;
  esperada: AccionCita;
}

export async function RespuestaCitaPage({ token, esperada }: Props) {
  const payload = verifyCitaToken(token);

  if (!payload || payload.accion !== esperada) {
    return <ErrorShell titulo="Enlace inválido" mensaje="El enlace ha caducado o no es válido. Si necesitas modificar tu cita, contacta directamente con el salón." />;
  }

  const result = await responderCita({
    citaId: payload.citaId,
    accion: payload.accion,
    source: 'email',
  });

  if (!result.ok) {
    if (result.error === 'no_encontrada') {
      return <ErrorShell titulo="Cita no encontrada" mensaje="No hemos podido encontrar esta cita." />;
    }
    if (result.error === 'pasada') {
      return <ErrorShell titulo="Cita pasada" mensaje="Esta cita ya pasó. No se puede modificar." />;
    }
    // estado_invalido: cita ya cancelada o en estado terminal — mostramos un mensaje neutro
    return (
      <NeutralShell
        titulo="Esta cita ya fue procesada"
        mensaje="Esta cita ya fue confirmada o cancelada anteriormente. Si necesitas hacer cambios, contacta con el salón."
      />
    );
  }

  const styleVars = getAccentVars(null); // sin tipoNegocio: usamos el default terracota
  const fechaTxt = formatFechaHora(result.inicio, result.timezone);
  const esConfirmar = result.accion === 'confirmar';

  // Cargar tipoNegocio del salón para acentos consistentes
  const [salonRow] = await db
    .select({ tipoNegocio: salones.tipoNegocio })
    .from(salones)
    .where(eq(salones.slug, result.salon.slug))
    .limit(1);
  const accentVars = salonRow ? getAccentVars(salonRow.tipoNegocio) : styleVars;

  return (
    <div style={accentVars} className="bg-cream text-ink min-h-screen">
      <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-12 sm:py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <span
            className="grid h-16 w-16 place-items-center rounded-full"
            style={{
              background: esConfirmar ? 'var(--gestori-accent-soft)' : '#F0EDE6',
            }}
          >
            {esConfirmar ? (
              <Icon.Check
                width="28"
                height="28"
                style={{ color: 'var(--gestori-accent-2)' }}
              />
            ) : (
              <span className="text-2xl text-stone">×</span>
            )}
          </span>
          <h1
            className="tight font-medium text-ink"
            style={{ fontSize: 'clamp(28px, 5vw, 44px)', lineHeight: 1.05 }}
          >
            {esConfirmar ? (
              <>
                ¡Cita <span className="font-serif-it">confirmada</span>!
              </>
            ) : (
              <>
                Cita <span className="font-serif-it">cancelada</span>
              </>
            )}
          </h1>
          <p className="text-[15px] text-stone max-w-md">
            {esConfirmar
              ? `Gracias, ${result.cliente.nombre}. ${result.salon.nombre} ya sabe que vas a llegar.`
              : `Hemos avisado a ${result.salon.nombre} de que no podrás asistir. Gracias por avisar.`}
          </p>
        </div>

        <section className="rounded-3xl border border-line bg-paper p-5 sm:p-6">
          <h2 className="text-[13px] uppercase tracking-[0.22em] text-stone/80">
            Tu cita
          </h2>
          <dl className="mt-4 divide-y divide-line text-[15px]">
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-stone">Salón</dt>
              <dd className="text-right font-medium text-ink">
                {result.salon.nombre}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-stone">Servicio</dt>
              <dd className="text-right font-medium text-ink">
                {result.servicio.nombre}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-stone">Profesional</dt>
              <dd className="text-right font-medium text-ink">
                {result.profesional.nombre}
              </dd>
            </div>
            <div className="flex justify-between gap-3 py-2.5">
              <dt className="text-stone">Cuándo</dt>
              <dd className="text-right font-medium text-ink">
                {fechaTxt.charAt(0).toUpperCase() + fechaTxt.slice(1)}
              </dd>
            </div>
          </dl>
        </section>

        <Link
          href={`/s/${result.salon.slug}`}
          className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-paper px-5 text-[15px] font-medium text-ink transition hover:border-ink/30"
        >
          Ir a {result.salon.nombre}
        </Link>
      </div>
    </div>
  );
}

function ErrorShell({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <div style={getAccentVars(null)} className="bg-cream text-ink min-h-screen">
      <div className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16 text-center">
        <h1 className="tight font-medium text-ink text-3xl">{titulo}</h1>
        <p className="text-[15px] text-stone">{mensaje}</p>
      </div>
    </div>
  );
}

function NeutralShell({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <div style={getAccentVars(null)} className="bg-cream text-ink min-h-screen">
      <div className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16 text-center">
        <h1 className="tight font-medium text-ink text-3xl">{titulo}</h1>
        <p className="text-[15px] text-stone">{mensaje}</p>
      </div>
    </div>
  );
}
