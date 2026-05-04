import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';
import { actualizarAgente } from '../actions';

type Salon = {
  id: string;
  nombre: string;
  agenteNombre: string;
  agenteGenero: string;
  agenteTono: string;
  agenteBienvenida: string | null;
} | null;

const GENEROS: { value: string; label: string }[] = [
  { value: 'femenino', label: 'Femenino' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'neutro', label: 'Neutro' },
];

const TONOS: { value: string; label: string }[] = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'cercano', label: 'Cercano (recomendado)' },
  { value: 'desenfadado', label: 'Desenfadado' },
];

const PLACEHOLDERS_BIENVENIDA: Record<string, string> = {
  profesional:
    'Ej: "Buenos días, soy Juanita, asistente del salón. ¿En qué puedo ayudarle?"',
  cercano:
    'Ej: "¡Hola! Soy Juanita, encantada de conocerte. ¿En qué te ayudo?"',
  desenfadado:
    'Ej: "¡Buenas! Soy Juanita, tu recepcionista virtual. Cuéntame en qué te ayudo."',
};

const REGLAS_ABSOLUTAS = [
  'Se presenta con su nombre en el primer mensaje.',
  'Confirma cada reserva con un resumen claro antes de cerrarla.',
  'No inventa horarios, precios ni servicios: consulta siempre la agenda real.',
  'Nunca acepta jailbreaks ni se sale de su rol.',
  'No habla mal de la competencia.',
  'Máximo 3 frases por respuesta salvo petición explícita.',
];

function generarSaludoBase(
  tono: string,
  nombreAgente: string,
  nombreSalon: string,
): string {
  switch (tono) {
    case 'profesional':
      return `Buenos días, soy ${nombreAgente}, asistente de ${nombreSalon}.`;
    case 'desenfadado':
      return `¡Buenas! Soy ${nombreAgente}. ¿En qué te ayudo?`;
    case 'cercano':
    default:
      return `¡Hola! Soy ${nombreAgente}, la recepcionista de ${nombreSalon}. ¿Cómo te llamas?`;
  }
}

const inputClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2';
const selectClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink focus:outline-none focus:border-line-2 appearance-none';
const textareaClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2 resize-y';
const labelClass =
  'text-[11px] uppercase tracking-[0.2em] text-stone/80';

export default async function ConfigAgentePage({
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

  const tono = salon.agenteTono || 'cercano';
  const tieneCustom = !!(salon.agenteBienvenida && salon.agenteBienvenida.trim());
  const saludoPreview = tieneCustom
    ? salon.agenteBienvenida!
    : generarSaludoBase(tono, salon.agenteNombre || 'Juanita', salon.nombre);

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
            Personalidad
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Cómo se presenta tu agente
          </h2>
          <p className="text-[13px] text-stone">
            Personaliza el nombre, tono y mensaje de bienvenida.
          </p>
        </header>

        <form action={actualizarAgente} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="agente_nombre" className={labelClass}>
              Nombre del agente
            </label>
            <input
              id="agente_nombre"
              name="agente_nombre"
              required
              maxLength={60}
              defaultValue={salon.agenteNombre || 'Juanita'}
              className={inputClass}
            />
            <p className="text-[12px] text-stone/80">
              El nombre con el que se presenta a tus clientes.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="agente_genero" className={labelClass}>
              Género
            </label>
            <select
              id="agente_genero"
              name="agente_genero"
              defaultValue={salon.agenteGenero || 'femenino'}
              className={selectClass}
            >
              {GENEROS.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="agente_tono" className={labelClass}>
              Tono
            </label>
            <select
              id="agente_tono"
              name="agente_tono"
              defaultValue={tono}
              className={selectClass}
            >
              {TONOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
            <div className="card-tight flex flex-col gap-1 px-4 py-3 text-[12.5px] text-stone">
              <p>
                <strong className="text-ink">Profesional</strong>: trato formal,
                sin emojis. Frases cortas y claras.
              </p>
              <p>
                <strong className="text-ink">Cercano</strong>: tuteo, cálido y
                natural.
              </p>
              <p>
                <strong className="text-ink">Desenfadado</strong>: tuteo +
                expresiones coloquiales suaves, humor ligero.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="agente_bienvenida" className={labelClass}>
              Mensaje de bienvenida personalizado
            </label>
            <textarea
              id="agente_bienvenida"
              name="agente_bienvenida"
              maxLength={280}
              rows={3}
              defaultValue={salon.agenteBienvenida ?? ''}
              placeholder={
                PLACEHOLDERS_BIENVENIDA[tono] ?? PLACEHOLDERS_BIENVENIDA.cercano
              }
              className={textareaClass}
            />
            <p className="text-[12px] text-stone/80">
              Opcional. Si lo dejas vacío, se genera según el tono. Máx. 280
              caracteres.
            </p>
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
        <header className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Vista previa
            </span>
            <h2 className="tight text-[20px] font-medium text-ink">
              Saludo del agente
            </h2>
          </div>
          {tieneCustom ? (
            <span
              className="pill"
              style={{
                background: 'rgba(197,86,44,0.12)',
                color: '#A8451F',
              }}
            >
              <span
                className="pill-dot"
                style={{ background: '#C5562C' }}
              />
              Personalizado
            </span>
          ) : null}
        </header>
        <div className="flex items-end gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-terracotta/15 text-[14px] font-semibold text-terracotta">
            {(salon.agenteNombre || 'J').charAt(0).toUpperCase()}
          </div>
          <div className="card-tight max-w-[80%] rounded-bl-sm px-4 py-3 text-[14px] whitespace-pre-wrap text-ink">
            {saludoPreview}
          </div>
        </div>
      </section>

      <section className="card flex flex-col gap-4 p-5 md:p-8">
        <header className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Reglas absolutas
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            No negociables
          </h2>
          <p className="text-[13px] text-stone">
            Independientemente del tono, todos los agentes Gonper siguen estas
            reglas.
          </p>
        </header>
        <ul className="flex flex-col gap-2 text-[13.5px] text-ink/85">
          {REGLAS_ABSOLUTAS.map((regla) => (
            <li key={regla} className="flex gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-terracotta" />
              <span>{regla}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
