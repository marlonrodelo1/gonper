import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';
import { AddressAutocomplete } from '@/components/panel/address-autocomplete';
import { actualizarDatosSalon } from './actions';

type Salon = {
  id: string;
  nombre: string;
  slug: string;
  tipo_negocio?: string;
  tipoNegocio?: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  timezone: string;
  plan: string;
  trial_until?: string | Date | null;
  trialUntil?: string | Date | null;
  // Marketplace + geocoding
  ciudad?: string | null;
  provincia?: string | null;
  lat?: string | number | null;
  lng?: string | number | null;
  direccion_formateada?: string | null;
  direccionFormateada?: string | null;
  osm_place_id?: string | null;
  osmPlaceId?: string | null;
} | null;

const TIPOS_NEGOCIO: { value: string; label: string }[] = [
  { value: 'barberia', label: 'Barbería' },
  { value: 'peluqueria', label: 'Peluquería' },
  { value: 'estetica', label: 'Estética' },
  { value: 'manicura', label: 'Manicura' },
  { value: 'otro', label: 'Otro' },
];

const TIMEZONES: { value: string; label: string }[] = [
  { value: 'Europe/Madrid', label: 'Europe/Madrid (Península)' },
  { value: 'Atlantic/Canary', label: 'Atlantic/Canary (Canarias)' },
  { value: 'Europe/Lisbon', label: 'Europe/Lisbon' },
  { value: 'Europe/London', label: 'Europe/London' },
  { value: 'Europe/Paris', label: 'Europe/Paris' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin' },
  { value: 'Europe/Rome', label: 'Europe/Rome' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam' },
];

const PLAN_LABEL: Record<string, string> = {
  trial: 'Trial',
  solo: 'Solo',
  studio: 'Studio',
  pro: 'Pro',
  cancelado: 'Cancelado',
};

function formatTrialUntil(value: string | Date | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

const inputClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2';
const selectClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink focus:outline-none focus:border-line-2 appearance-none';
const labelClass =
  'text-[11px] uppercase tracking-[0.2em] text-stone/80';

export default async function ConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const salonRaw = (await getCurrentSalon()) as unknown;
  const salon = salonRaw as Salon;

  if (!salon) {
    return (
      <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <h2 className="tight text-[22px] font-medium text-ink">
          Configura tu salón
        </h2>
        <p className="text-[14px] text-stone">
          Aún no tienes un salón asociado a tu cuenta.
        </p>
      </div>
    );
  }

  const planKey = salon.plan in PLAN_LABEL ? salon.plan : 'trial';
  const trialFormatted = formatTrialUntil(
    salon.trialUntil ?? salon.trial_until ?? null,
  );
  const tipoNegocio = salon.tipoNegocio ?? salon.tipo_negocio ?? 'otro';

  const direccion = salon.direccion ?? '';
  const direccionFormateada =
    salon.direccionFormateada ?? salon.direccion_formateada ?? '';
  const ciudad = salon.ciudad ?? '';
  const provincia = salon.provincia ?? '';
  const latStr =
    salon.lat !== null && salon.lat !== undefined ? String(salon.lat) : null;
  const lngStr =
    salon.lng !== null && salon.lng !== undefined ? String(salon.lng) : null;
  const osmPlaceId = salon.osmPlaceId ?? salon.osm_place_id ?? '';
  const tieneCoordenadas = !!latStr && !!lngStr;

  return (
    <div className="flex w-full flex-col gap-5">
      {params.ok ? (
        <div className="flex items-center gap-2 rounded-xl border border-sage/40 bg-sage-soft px-4 py-3 text-[13px] text-sage-deep">
          <Icon.Check width="14" height="14" />
          Cambios guardados correctamente.
        </div>
      ) : null}
      {params.error ? (
        <div
          className="rounded-xl border bg-[#F1D6D6] px-4 py-3 text-[13px] text-[#7C2E2E]"
          style={{ borderColor: 'rgba(177,72,72,0.4)' }}
        >
          {params.error}
        </div>
      ) : null}

      <section className="card flex flex-col gap-5 p-5 md:p-8">
        <header className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Datos generales
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Información del negocio
          </h2>
          <p className="text-[13px] text-stone">
            La usa el agente para presentarse y responder preguntas.
          </p>
        </header>

        <form action={actualizarDatosSalon} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nombre" className={labelClass}>
              Nombre del salón
            </label>
            <input
              id="nombre"
              name="nombre"
              required
              maxLength={120}
              defaultValue={salon.nombre}
              className={inputClass}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="tipo_negocio" className={labelClass}>
              Tipo de negocio
            </label>
            <select
              id="tipo_negocio"
              name="tipo_negocio"
              defaultValue={tipoNegocio}
              className={selectClass}
            >
              {TIPOS_NEGOCIO.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <AddressAutocomplete
              label="Dirección"
              defaultDireccion={direccion}
              defaultDireccionFormateada={direccionFormateada}
              defaultLat={latStr}
              defaultLng={lngStr}
              defaultCiudad={ciudad}
              defaultProvincia={provincia}
              defaultOsmPlaceId={osmPlaceId}
            />
            <div className="flex flex-wrap items-center gap-2">
              {tieneCoordenadas ? (
                <span
                  className="pill"
                  style={{
                    background: 'rgba(139,157,122,0.15)',
                    color: '#5A6B4D',
                  }}
                >
                  <span className="pill-dot" style={{ background: '#8B9D7A' }} />
                  Ubicación exacta guardada
                </span>
              ) : (
                <span
                  className="pill"
                  style={{
                    background: 'rgba(197,142,44,0.15)',
                    color: '#7A5A1B',
                  }}
                >
                  <span className="pill-dot" style={{ background: '#C58E2C' }} />
                  Sin ubicación exacta — elige una sugerencia
                </span>
              )}
              {ciudad && (
                <span
                  className="pill"
                  style={{
                    background: 'rgba(107,99,86,0.10)',
                    color: '#6B6356',
                  }}
                >
                  {ciudad}
                  {provincia ? ` · ${provincia}` : ''}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="telefono" className={labelClass}>
                Teléfono
              </label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                defaultValue={salon.telefono ?? ''}
                placeholder="+34 600 000 000"
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelClass}>
                Email de contacto
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={salon.email ?? ''}
                placeholder="hola@tusalon.es"
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="timezone" className={labelClass}>
              Zona horaria
            </label>
            <select
              id="timezone"
              name="timezone"
              defaultValue={salon.timezone}
              className={selectClass}
            >
              {TIMEZONES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium"
            >
              Guardar cambios
            </button>
          </div>
        </form>
      </section>

      <section className="card flex flex-col gap-4 p-5 md:p-8">
        <header className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Identificador
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Tu URL pública
          </h2>
          <p className="text-[13px] text-stone">
            Para cambiarlo, contacta con soporte.
          </p>
        </header>

        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Slug</span>
          <div className="card-tight px-4 py-2.5 font-mono text-[13.5px] text-ink">
            {salon.slug}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>URL pública</span>
          <div className="card-tight px-4 py-2.5 font-mono text-[13.5px] text-ink">
            gestori.es/{salon.slug}
          </div>
        </div>
        <p className="text-[12px] text-stone">
          Cambiar el slug rompe URLs ya compartidas.
        </p>
      </section>

      <section className="card flex flex-col gap-3 p-5 md:p-8">
        <header className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Suscripción
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Tu plan actual
          </h2>
        </header>
        <div className="flex items-center gap-3">
          <span className={labelClass}>Plan</span>
          <span className="pill" style={{ background: 'rgba(43,40,35,0.06)', color: '#2B2823' }}>
            <span className="pill-dot" style={{ background: '#2B2823' }} />
            {PLAN_LABEL[planKey]}
          </span>
        </div>
        {planKey === 'trial' && trialFormatted ? (
          <p className="text-[13px] text-stone">
            Tu prueba termina el{' '}
            <span className="font-medium text-ink">{trialFormatted}</span>.
          </p>
        ) : null}
      </section>
    </div>
  );
}
