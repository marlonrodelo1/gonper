import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';
import {
  desvincularTelegramDueno,
  guardarTokenBotCliente,
} from './actions';
import { CopyLinkButton } from './copy-link-button';

type Salon = {
  id: string;
  slug: string;
  nombre: string;
  telegramBotToken: string | null;
  telegramBotUsername: string | null;
  telegramChatIdDueno: string | null;
} | null;

const inputClass =
  'w-full bg-paper border border-line rounded-2xl px-5 py-3.5 text-[14.5px] text-ink placeholder:text-stone/50 focus:outline-none focus:border-line-2';
const labelClass = 'text-[11px] uppercase tracking-[0.2em] text-stone/80';

// TODO: Cuando @gomper_bot esté creado en BotFather, sustituir aquí y en
// los enlaces de abajo. De momento usamos el bot existente del proyecto.
const BOT_DUENO_USERNAME = 'rogobot2026_bot';
const BOT_DUENO_URL = `https://t.me/${BOT_DUENO_USERNAME}`;

function VinculadoPill({ ok }: { ok: boolean }) {
  return ok ? (
    <span
      className="pill"
      style={{ background: 'rgba(139,157,122,0.15)', color: '#5A6B4D' }}
    >
      <span className="pill-dot" style={{ background: '#8B9D7A' }} />
      Vinculado
    </span>
  ) : (
    <span
      className="pill"
      style={{ background: 'rgba(107,99,86,0.10)', color: '#6B6356' }}
    >
      <span className="pill-dot" style={{ background: '#8A8174' }} />
      Sin vincular
    </span>
  );
}

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

  const codigoVinculacion = salon.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const comandoVinculacion = `/start ${codigoVinculacion}`;
  const duenoVinculado = !!salon.telegramChatIdDueno;
  const tieneBotSalon = !!salon.telegramBotToken;
  const usernameBotSalon = salon.telegramBotUsername;

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

      {/* ============================================
          Bot del dueño (Juanita Pro)
          ============================================ */}
      <section className="card flex flex-col gap-5 p-8">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Bot del dueño
            </span>
            <h2 className="tight text-[20px] font-medium text-ink">
              Juanita Pro en tu Telegram
            </h2>
            <p className="text-[13px] text-stone">
              Recibe avisos del agente y consúltale lo que quieras desde tu
              propio Telegram.
            </p>
          </div>
          <VinculadoPill ok={duenoVinculado} />
        </header>

        {duenoVinculado ? (
          <div className="flex flex-col gap-4">
            <div className="card-tight flex flex-col gap-2 px-4 py-4">
              <span className={labelClass}>Chat ID conectado</span>
              <code className="font-mono text-[13.5px] text-ink">
                {salon.telegramChatIdDueno}
              </code>
            </div>

            <p className="text-[13px] text-stone">
              Recibirás avisos del agente Juanita Pro por aquí. Cualquier
              pregunta que le hagas a tu Juanita por Telegram tendrá la misma
              capacidad que el chat del panel.
            </p>

            <form
              action={desvincularTelegramDueno}
              className="flex justify-end pt-1"
            >
              <button
                type="submit"
                className="tight rounded-full border border-line bg-paper px-5 py-3 text-[13.5px] font-medium text-ink transition hover:bg-cream"
              >
                Desvincular Telegram
              </button>
            </form>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ol className="flex flex-col gap-3 pl-5 text-[13.5px] text-ink/85 list-decimal">
              <li>
                Abre{' '}
                <a
                  href={BOT_DUENO_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-terracotta hover:text-terracotta-2"
                >
                  @{BOT_DUENO_USERNAME} en Telegram
                </a>
                .
              </li>
              <li>
                Envíale este comando exactamente:
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code className="rounded-lg bg-cream-2 px-2.5 py-1.5 font-mono text-[13px] text-ink">
                    {comandoVinculacion}
                  </code>
                  <CopyLinkButton
                    link={comandoVinculacion}
                    label="Copiar comando"
                    copiedLabel="Copiado"
                  />
                </div>
              </li>
              <li>
                El bot te responderá confirmando que estás vinculado y al
                volver a esta página verás tu chat ID.
              </li>
            </ol>

            <div className="rule" />

            <p className="text-[12.5px] text-stone">
              Tu código de vinculación es{' '}
              <code className="font-mono text-ink">{codigoVinculacion}</code>.
              Son los primeros 8 caracteres de tu salón. No lo compartas con
              clientes.
            </p>
          </div>
        )}
      </section>

      {/* ============================================
          Bot del salón (clientes finales)
          ============================================ */}
      <section className="card flex flex-col gap-5 p-8">
        <header className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Bot del salón (clientes finales)
            </span>
            <h2 className="tight text-[20px] font-medium text-ink">
              Atención a clientes 24/7
            </h2>
            <p className="text-[13px] text-stone">
              Crea uno gratis con @BotFather y pega aquí el token. Es el bot
              que tus clientes verán para reservar.
            </p>
          </div>
          <ConfiguradoPill ok={tieneBotSalon} />
        </header>

        {tieneBotSalon && usernameBotSalon ? (
          <div className="card-tight flex flex-col gap-2.5 px-4 py-4">
            <p className={labelClass}>Bot configurado</p>
            <a
              href={`https://t.me/${usernameBotSalon}`}
              target="_blank"
              rel="noopener noreferrer"
              className="tight text-[13.5px] font-medium text-terracotta hover:text-terracotta-2"
            >
              Abrir en Telegram → t.me/{usernameBotSalon}
            </a>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-stone/80">
              Enlace de reserva
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-cream-2 px-2.5 py-1.5 font-mono text-[12px] text-ink">
                t.me/{usernameBotSalon}?start={salon.slug}
              </code>
              <CopyLinkButton
                link={`https://t.me/${usernameBotSalon}?start=${salon.slug}`}
                label="Copiar enlace"
                copiedLabel="Copiado"
              />
            </div>
          </div>
        ) : null}

        <form
          action={guardarTokenBotCliente}
          className="flex flex-col gap-5"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bot_token" className={labelClass}>
              {tieneBotSalon ? 'Cambiar token del bot' : 'Token del bot'}
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
            <p className="text-[12px] text-stone/80">
              Lo obtienes al crear el bot con @BotFather. Validamos contra
              Telegram al guardar.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium"
            >
              Guardar token
            </button>
          </div>
        </form>

        <div className="rule" />

        <ol className="flex flex-col gap-1.5 pl-5 text-[12.5px] text-stone list-decimal">
          <li>
            Abre Telegram y busca <strong className="text-ink">@BotFather</strong>.
          </li>
          <li>
            Envíale{' '}
            <code className="rounded bg-cream-2 px-1.5 py-0.5 font-mono text-[11.5px]">
              /newbot
            </code>{' '}
            y sigue las instrucciones.
          </li>
          <li>Copia el token que te da y pégalo arriba.</li>
        </ol>
      </section>
    </div>
  );
}
