import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';
import {
  desvincularTelegramDueno,
  guardarTokenBotCliente,
  desconectarBotSalon,
} from './actions';
import { CopyLinkButton } from './copy-link-button';

/**
 * Supabase devuelve la fila de `salones` con los nombres reales de las
 * columnas (snake_case). Aceptamos ambos formatos por compatibilidad.
 */
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

function StatePill({ ok, okText, koText }: { ok: boolean; okText: string; koText: string }) {
  return ok ? (
    <span
      className="pill"
      style={{ background: 'rgba(139,157,122,0.15)', color: '#5A6B4D' }}
    >
      <span className="pill-dot" style={{ background: '#8B9D7A' }} />
      {okText}
    </span>
  ) : (
    <span
      className="pill"
      style={{ background: 'rgba(107,99,86,0.10)', color: '#6B6356' }}
    >
      <span className="pill-dot" style={{ background: '#8A8174' }} />
      {koText}
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

  const codigoVinculacion = salon.id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const comandoVinculacion = `/start ${codigoVinculacion}`;
  const tokenBot = salon.telegram_bot_token ?? salon.telegramBotToken ?? null;
  const usernameBot =
    salon.telegram_bot_username ?? salon.telegramBotUsername ?? null;
  const chatIdDueno =
    salon.telegram_chat_id_dueno ?? salon.telegramChatIdDueno ?? null;
  const tieneBot = !!tokenBot;
  const duenoVinculado = !!chatIdDueno;
  const botUrl = usernameBot ? `https://t.me/${usernameBot}` : null;

  const todoOk = tieneBot && duenoVinculado;
  const linkCliente = usernameBot
    ? `https://t.me/${usernameBot}?start=${salon.slug}`
    : null;

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
          BANNER · Bot operativo (cliente + dueño)
          ============================================ */}
      {todoOk ? (
        <section
          className="card grain flex flex-col gap-4 p-5 md:p-7"
          style={{
            borderColor: 'rgba(139,157,122,0.45)',
            background:
              'linear-gradient(180deg, rgba(139,157,122,0.10) 0%, rgba(139,157,122,0.02) 100%)',
          }}
        >
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
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
                <h2 className="tight text-[18px] font-medium text-ink">
                  Atiende a clientes y a ti como dueño
                </h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="pill"
                style={{ background: 'rgba(139,157,122,0.18)', color: '#3F4D34' }}
              >
                <span
                  className="pill-dot"
                  style={{ background: '#8B9D7A' }}
                />
                Clientes
              </span>
              <span
                className="pill"
                style={{ background: 'rgba(139,157,122,0.18)', color: '#3F4D34' }}
              >
                <span
                  className="pill-dot"
                  style={{ background: '#8B9D7A' }}
                />
                Dueño vinculado
              </span>
            </div>
          </header>

          <div className="grid gap-3 md:grid-cols-2">
            {/* Lado cliente */}
            <div className="card-tight flex flex-col gap-2 px-4 py-4">
              <span className={labelClass}>Para clientes (compártelo)</span>
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-lg bg-cream-2 px-2.5 py-1.5 font-mono text-[12px] text-ink">
                  t.me/{usernameBot}?start={salon.slug}
                </code>
                {linkCliente ? (
                  <CopyLinkButton
                    link={linkCliente}
                    label="Copiar enlace"
                    copiedLabel="Copiado"
                  />
                ) : null}
              </div>
              <p className="text-[12px] text-stone">
                Quien lo abra reserva con Juanita 24/7.
              </p>
            </div>

            {/* Lado dueño */}
            <div className="card-tight flex flex-col gap-2 px-4 py-4">
              <span className={labelClass}>Tú como dueño</span>
              <a
                href={botUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="tight text-[13.5px] font-medium text-terracotta hover:text-terracotta-2"
              >
                Abrir Juanita Pro en Telegram →
              </a>
              <p className="font-mono text-[11.5px] text-stone">
                Chat ID {chatIdDueno}
              </p>
              <p className="text-[12px] text-stone">
                Pregúntale por tu agenda, KPIs o clientes.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* ============================================
          PASO 1 · Token del bot
          ============================================ */}
      <section className="card flex flex-col gap-5 p-5 md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Paso 1 · Bot Telegram
            </span>
            <h2 className="tight text-[20px] font-medium text-ink">
              Bot del salón
            </h2>
            <p className="text-[13px] text-stone">
              Un único bot que atiende a tus clientes para reservas <strong className="text-ink">y</strong> que tú usarás
              como dueño para hablar con tu Juanita Pro. Pega el token de @BotFather y lo configuramos
              automáticamente.
            </p>
          </div>
          <StatePill ok={tieneBot} okText="Configurado" koText="Sin configurar" />
        </header>

        {tieneBot && usernameBot ? (
          <div className="card-tight flex flex-col gap-2.5 px-4 py-4">
            <p className={labelClass}>Bot configurado</p>
            <a
              href={botUrl ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="tight text-[13.5px] font-medium text-terracotta hover:text-terracotta-2"
            >
              Abrir en Telegram → t.me/{usernameBot}
            </a>
            <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-stone/80">
              Enlace de reserva para clientes
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded-lg bg-cream-2 px-2.5 py-1.5 font-mono text-[12px] text-ink">
                t.me/{usernameBot}?start={salon.slug}
              </code>
              <CopyLinkButton
                link={`https://t.me/${usernameBot}?start=${salon.slug}`}
                label="Copiar enlace"
                copiedLabel="Copiado"
              />
            </div>
          </div>
        ) : null}

        <form action={guardarTokenBotCliente} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="bot_token" className={labelClass}>
              {tieneBot ? 'Cambiar token del bot' : 'Token del bot'}
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
              Lo obtienes al crear el bot con @BotFather. Validamos contra Telegram y configuramos el
              webhook automáticamente.
            </p>
          </div>

          <div className="flex flex-wrap justify-end gap-2 pt-2">
            {tieneBot ? (
              <form action={desconectarBotSalon}>
                <button
                  type="submit"
                  className="tight rounded-full border border-line bg-paper px-5 py-3 text-[13.5px] font-medium text-ink transition hover:bg-cream"
                >
                  Desconectar bot
                </button>
              </form>
            ) : null}
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-3 text-[13.5px] font-medium"
            >
              {tieneBot ? 'Cambiar token' : 'Guardar token'}
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
            y sigue las instrucciones (nombre + username terminado en <code className="font-mono">bot</code>).
          </li>
          <li>Copia el token que te da y pégalo arriba.</li>
        </ol>
      </section>

      {/* ============================================
          PASO 2 · Vincular tu Telegram personal como dueño
          ============================================ */}
      <section className="card flex flex-col gap-5 p-5 md:p-8">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Paso 2 · Vincular como dueño
            </span>
            <h2 className="tight text-[20px] font-medium text-ink">
              Tu Telegram → Juanita Pro
            </h2>
            <p className="text-[13px] text-stone">
              Cuando escribes a tu propio bot, te tratamos como dueño y respondemos con datos de tu
              negocio. Cualquier otra persona verá info pública (servicios, precios, link a reservar).
            </p>
          </div>
          <StatePill ok={duenoVinculado} okText="Vinculado" koText="Sin vincular" />
        </header>

        {!tieneBot ? (
          <div className="card-tight px-4 py-4 text-[13px] text-stone">
            Configura primero el token del bot arriba para poder vincularte.
          </div>
        ) : duenoVinculado ? (
          <div className="flex flex-col gap-4">
            <div className="card-tight flex flex-col gap-2 px-4 py-4">
              <span className={labelClass}>Chat ID conectado</span>
              <code className="font-mono text-[13.5px] text-ink">
                {chatIdDueno}
              </code>
            </div>

            <p className="text-[13px] text-stone">
              Recibirás avisos del agente Juanita Pro por aquí. Cualquier pregunta que le hagas a tu
              Juanita por Telegram tendrá la misma capacidad que el chat del panel.
            </p>

            <form action={desvincularTelegramDueno} className="flex justify-end pt-1">
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
                {botUrl ? (
                  <a
                    href={botUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-terracotta hover:text-terracotta-2"
                  >
                    @{usernameBot} en Telegram
                  </a>
                ) : (
                  <strong className="text-ink">tu bot en Telegram</strong>
                )}
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
                El bot te confirmará la vinculación. Recarga esta página y verás tu chat ID.
              </li>
            </ol>

            <div className="rule" />

            <p className="text-[12.5px] text-stone">
              Tu código de vinculación es{' '}
              <code className="font-mono text-ink">{codigoVinculacion}</code>. Son los primeros 8
              caracteres de tu salón. <strong className="text-ink">No lo compartas con clientes</strong> —
              quien lo tenga puede vincularse como dueño.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
