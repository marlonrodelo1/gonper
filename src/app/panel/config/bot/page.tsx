import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';
import {
  desvincularTelegramDueno,
  guardarTokenBotCliente,
  desconectarBotSalon,
} from './actions';
import { CopyLinkButton } from './copy-link-button';
import { VincularDuenoButton } from './vincular-dueno-button';

type SalonRow = {
  id: string;
  slug: string;
  nombre: string;
  telegram_bot_token?: string | null;
  telegramBotToken?: string | null;
  telegram_bot_username?: string | null;
  telegramBotUsername?: string | null;
  telegram_chat_id_dueno?: string | null;
  telegramChatIdDueno?: string | null;
};

const inputClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2';
const labelClass = 'text-[11px] uppercase tracking-[0.2em] text-stone/80';

export default async function ConfigBotPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const salonRaw = (await getCurrentSalon()) as unknown;
  const salon = salonRaw as SalonRow | null;

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

  const tokenBot = salon.telegram_bot_token ?? salon.telegramBotToken ?? null;
  const usernameBot =
    salon.telegram_bot_username ?? salon.telegramBotUsername ?? null;
  const chatIdDueno =
    salon.telegram_chat_id_dueno ?? salon.telegramChatIdDueno ?? null;
  const tieneBot = !!tokenBot;
  const duenoVinculado = !!chatIdDueno;
  const linkCliente = usernameBot
    ? `https://t.me/${usernameBot}?start=${salon.slug}`
    : null;
  const botUrl = usernameBot ? `https://t.me/${usernameBot}` : null;

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

      {/* ============================================
          ESTADO 1: Todo OK — bot + dueño vinculado
          ============================================ */}
      {tieneBot && duenoVinculado ? (
        <section
          className="card grain flex flex-col gap-5 p-5 md:p-7"
          style={{
            borderColor: 'rgba(139,157,122,0.45)',
            background:
              'linear-gradient(180deg, rgba(139,157,122,0.10) 0%, rgba(139,157,122,0.02) 100%)',
          }}
        >
          <header className="flex flex-wrap items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-full"
              style={{ background: 'rgba(139,157,122,0.25)', color: '#3F4D34' }}
            >
              <Icon.Check width="16" height="16" />
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
                Bot operativo
              </span>
              <h2 className="tight text-[19px] font-medium text-ink">
                Atiende a tus clientes y a ti como dueño
              </h2>
            </div>
          </header>

          {/* Enlace para clientes */}
          <div className="card-tight flex flex-col gap-2 px-4 py-4">
            <span className={labelClass}>Enlace para tus clientes</span>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-cream-2 px-2.5 py-1.5 font-mono text-[12.5px] text-ink">
                t.me/{usernameBot}?start={salon.slug}
              </code>
              {linkCliente ? (
                <CopyLinkButton link={linkCliente} label="Copiar" copiedLabel="Copiado" />
              ) : null}
            </div>
            <p className="text-[12px] text-stone">
              Pégalo en tu Instagram, web o donde quieras. Quien lo abra reservará con Juanita 24/7.
            </p>
          </div>

          {/* Configuración avanzada — colapsada */}
          <details className="rounded-2xl border border-line bg-paper px-4 py-3 text-[13px]">
            <summary className="cursor-pointer select-none text-stone hover:text-ink">
              Configuración avanzada
            </summary>
            <div className="mt-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-stone/70">
                    Bot Telegram
                  </span>
                  <a
                    href={botUrl ?? '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[13.5px] font-medium text-terracotta hover:text-terracotta-2"
                  >
                    @{usernameBot}
                  </a>
                </div>
                <form action={desconectarBotSalon}>
                  <button
                    type="submit"
                    className="tight rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] font-medium text-ink transition hover:bg-cream"
                  >
                    Cambiar bot
                  </button>
                </form>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-stone/70">
                    Tú como dueño
                  </span>
                  <span className="font-mono text-[12.5px] text-ink">
                    Chat ID {chatIdDueno}
                  </span>
                </div>
                <form action={desvincularTelegramDueno}>
                  <button
                    type="submit"
                    className="tight rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] font-medium text-ink transition hover:bg-cream"
                  >
                    Desvincular
                  </button>
                </form>
              </div>
            </div>
          </details>
        </section>
      ) : null}

      {/* ============================================
          ESTADO 2: Bot SIN configurar — pegar token
          ============================================ */}
      {!tieneBot ? (
        <section className="card flex flex-col gap-5 p-5 md:p-8">
          <header className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Empieza aquí
            </span>
            <h2 className="tight text-[20px] font-medium text-ink">
              Conecta tu bot de Telegram
            </h2>
            <p className="text-[14px] text-stone">
              Un único bot que atiende a tus clientes <strong className="text-ink">y</strong> que tú
              usarás como dueño para hablar con tu Juanita Pro.
            </p>
          </header>

          <form action={guardarTokenBotCliente} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="bot_token" className={labelClass}>
                Token del bot (de @BotFather)
              </label>
              <input
                id="bot_token"
                name="bot_token"
                type="password"
                autoComplete="off"
                required
                placeholder="123456789:AAH..."
                className={inputClass}
              />
            </div>

            <button
              type="submit"
              className="gloss-btn tight self-end rounded-full px-5 py-3 text-[13.5px] font-medium"
            >
              Conectar bot
            </button>
          </form>

          <details className="rounded-2xl border border-line bg-paper px-4 py-3 text-[13px] text-stone">
            <summary className="cursor-pointer select-none text-ink">
              ¿Cómo creo un bot en BotFather?
            </summary>
            <ol className="mt-3 flex flex-col gap-1.5 pl-5 list-decimal text-[12.5px]">
              <li>
                Abre Telegram y busca <strong className="text-ink">@BotFather</strong>.
              </li>
              <li>
                Envíale{' '}
                <code className="rounded bg-cream-2 px-1.5 py-0.5 font-mono text-[11.5px]">
                  /newbot
                </code>{' '}
                y sigue las instrucciones (nombre + username terminado en{' '}
                <code className="font-mono">bot</code>).
              </li>
              <li>Copia el token que te da y pégalo arriba.</li>
            </ol>
          </details>
        </section>
      ) : null}

      {/* ============================================
          ESTADO 3: Bot OK pero dueño NO vinculado
          ============================================ */}
      {tieneBot && !duenoVinculado ? (
        <section className="card flex flex-col gap-4 p-5 md:p-8">
          <header className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Último paso
            </span>
            <h2 className="tight text-[20px] font-medium text-ink">
              Vincúlate como dueño
            </h2>
            <p className="text-[14px] text-stone">
              Para que cuando le escribas a tu propio bot te tratemos como dueño y respondamos con
              datos de tu negocio. Tus clientes solo verán info pública.
            </p>
          </header>

          <VincularDuenoButton />

          <details className="rounded-2xl border border-line bg-paper px-4 py-3 text-[13px] text-stone">
            <summary className="cursor-pointer select-none text-ink">
              Configuración avanzada
            </summary>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className={labelClass}>Bot Telegram</span>
                <a
                  href={botUrl ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] font-medium text-terracotta hover:text-terracotta-2"
                >
                  @{usernameBot}
                </a>
              </div>
              <form action={desconectarBotSalon}>
                <button
                  type="submit"
                  className="tight rounded-full border border-line bg-paper px-4 py-2 text-[12.5px] font-medium text-ink transition hover:bg-cream"
                >
                  Cambiar bot
                </button>
              </form>
            </div>
          </details>
        </section>
      ) : null}
    </div>
  );
}
