import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';
import { actualizarBotSalon, actualizarBotDueno } from './actions';
import { CopyLinkButton } from './copy-link-button';

type Salon = {
  id: string;
  slug: string;
  nombre: string;
  telegramBotToken: string | null;
  telegramBotUsername: string | null;
  telegramBotDuenoToken: string | null;
  telegramChatIdDueno: string | null;
} | null;

const inputClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2';
const labelClass =
  'text-[11px] uppercase tracking-[0.2em] text-stone/80';

function ConfiguradoPill({ ok }: { ok: boolean }) {
  return ok ? (
    <span
      className="pill"
      style={{ background: 'rgba(139,157,122,0.15)', color: '#5A6B4D' }}
    >
      <span className="pill-dot" style={{ background: '#8B9D7A' }} />
      Configurado
    </span>
  ) : (
    <span
      className="pill"
      style={{ background: 'rgba(107,99,86,0.10)', color: '#6B6356' }}
    >
      <span className="pill-dot" style={{ background: '#8A8174' }} />
      Sin configurar
    </span>
  );
}

export default async function ConfigBotPage({
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
          Configura tu salón primero
        </h2>
        <p className="text-[14px] text-stone">
          Aún no tienes un salón asociado a tu cuenta.
        </p>
      </div>
    );
  }

  const username = salon.telegramBotUsername;
  const reservaLink = username
    ? `https://t.me/${username}?start=${salon.slug}`
    : '';
  const tieneBotSalon = !!(salon.telegramBotToken || salon.telegramBotUsername);
  const tieneBotDueno = !!(salon.telegramBotDuenoToken || salon.telegramChatIdDueno);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
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

      {/* Bot del salón */}
      <section className="card flex flex-col gap-5 p-8">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Bot del salón
            </span>
            <h2 className="tight text-[20px] font-medium text-ink">
              Atención a clientes 24/7
            </h2>
            <p className="text-[13px] text-stone">
              Crea uno gratis con @BotFather y pega aquí el token.
            </p>
          </div>
          <ConfiguradoPill ok={tieneBotSalon} />
        </header>

        <form action={actualizarBotSalon} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="telegram_bot_token" className={labelClass}>
              Token del bot
            </label>
            <input
              id="telegram_bot_token"
              name="telegram_bot_token"
              type="password"
              autoComplete="off"
              placeholder="123456789:AAH..."
              defaultValue={salon.telegramBotToken ?? ''}
              className={inputClass}
            />
            <p className="text-[12px] text-stone/80">
              Lo obtienes al crear el bot con @BotFather. Se guarda cifrado.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="telegram_bot_username" className={labelClass}>
              Username del bot
            </label>
            <input
              id="telegram_bot_username"
              name="telegram_bot_username"
              placeholder="salondemo_bot"
              defaultValue={salon.telegramBotUsername ?? ''}
              className={inputClass}
            />
            <p className="text-[12px] text-stone/80">
              Sin el @. Solo letras, números y guiones bajos.
            </p>
          </div>

          {username ? (
            <div className="card-tight flex flex-col gap-2.5 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-stone/80">
                Enlace público de tu bot
              </p>
              <a
                href={`https://t.me/${username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tight text-[13.5px] font-medium text-terracotta hover:text-terracotta-2"
              >
                Abrir en Telegram → t.me/{username}
              </a>
              <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-stone/80">
                Enlace de reserva
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-lg bg-cream-2 px-2.5 py-1.5 font-mono text-[12px] text-ink">
                  t.me/{username}?start={salon.slug}
                </code>
                <CopyLinkButton link={reservaLink} />
              </div>
            </div>
          ) : null}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium"
            >
              Guardar
            </button>
          </div>
        </form>
      </section>

      {/* Bot del dueño */}
      <section className="card flex flex-col gap-5 p-8">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Bot del dueño
            </span>
            <h2 className="tight text-[20px] font-medium text-ink">
              Juanita Pro
            </h2>
            <p className="text-[13px] text-stone">
              Bot privado para que tú hables con tu asistente y recibas avisos.
            </p>
          </div>
          <ConfiguradoPill ok={tieneBotDueno} />
        </header>

        <form action={actualizarBotDueno} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="telegram_bot_dueno_token" className={labelClass}>
              Token del bot del dueño
            </label>
            <input
              id="telegram_bot_dueno_token"
              name="telegram_bot_dueno_token"
              type="password"
              autoComplete="off"
              placeholder="987654321:BB..."
              defaultValue={salon.telegramBotDuenoToken ?? ''}
              className={inputClass}
            />
            <p className="text-[12px] text-stone/80">
              Crea otro bot distinto al de clientes con @BotFather.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="telegram_chat_id_dueno" className={labelClass}>
              Tu chat_id de Telegram
            </label>
            <input
              id="telegram_chat_id_dueno"
              name="telegram_chat_id_dueno"
              inputMode="numeric"
              placeholder="123456789"
              defaultValue={salon.telegramChatIdDueno ?? ''}
              className={inputClass}
            />
            <p className="text-[12px] text-stone/80">
              Escribe a tu bot personal y obtén tu chat_id con @userinfobot.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium"
            >
              Guardar
            </button>
          </div>
        </form>
      </section>

      {/* Info */}
      <section className="card flex flex-col gap-4 p-8">
        <header className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Cómo crear un bot
          </span>
          <h2 className="tight text-[20px] font-medium text-ink">
            Listo en menos de 2 minutos
          </h2>
        </header>
        <ol className="flex flex-col gap-2 pl-5 text-[13.5px] text-ink/85 list-decimal">
          <li>
            Abre Telegram y busca <strong>@BotFather</strong>.
          </li>
          <li>
            Envía{' '}
            <code className="rounded bg-cream-2 px-1.5 py-0.5 font-mono text-[12px]">
              /newbot
            </code>{' '}
            y sigue las instrucciones.
          </li>
          <li>Copia el token que te da y pégalo aquí.</li>
          <li>Listo: tu bot ya puede recibir reservas.</li>
        </ol>
        <div className="rule mt-1" />
        <p className="text-[12.5px] text-stone">
          Recomendación: usa dos bots distintos, uno público para clientes y
          otro privado solo para ti.
        </p>
      </section>
    </div>
  );
}
