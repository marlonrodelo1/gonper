import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Configura tu salón primero</CardTitle>
          <CardDescription>
            Aún no tienes un salón asociado a tu cuenta. Crea o asocia un salón
            antes de configurar los bots.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const username = salon.telegramBotUsername;
  const reservaLink = username
    ? `https://t.me/${username}?start=${salon.slug}`
    : '';
  const tieneBotSalon = !!(salon.telegramBotToken || salon.telegramBotUsername);
  const tieneBotDueno = !!(salon.telegramBotDuenoToken || salon.telegramChatIdDueno);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {params.ok ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300">
          Cambios guardados correctamente.
        </div>
      ) : null}
      {params.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {params.error}
        </div>
      ) : null}

      {/* Bot del salón */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Bot del salón (clientes)</CardTitle>
              <CardDescription>
                Este bot atiende a tus clientes 24/7 por Telegram. Crea uno
                gratis con @BotFather y pega aquí el token.
              </CardDescription>
            </div>
            {tieneBotSalon ? (
              <Badge variant="secondary">Configurado</Badge>
            ) : (
              <Badge variant="outline">Sin configurar</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form action={actualizarBotSalon} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="telegram_bot_token">Token del bot</Label>
              <Input
                id="telegram_bot_token"
                name="telegram_bot_token"
                type="password"
                autoComplete="off"
                placeholder="123456789:AAH..."
                defaultValue={salon.telegramBotToken ?? ''}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Lo obtienes al crear el bot con @BotFather. Se guarda cifrado.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram_bot_username">Username del bot</Label>
              <Input
                id="telegram_bot_username"
                name="telegram_bot_username"
                placeholder="salondemo_bot"
                defaultValue={salon.telegramBotUsername ?? ''}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Sin el @. Solo letras, números y guiones bajos.
              </p>
            </div>

            {username ? (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2 dark:border-zinc-800 dark:bg-zinc-900/40">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Enlace público de tu bot:
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <a
                    href={`https://t.me/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Abrir en Telegram → t.me/{username}
                  </a>
                </div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Enlace de reserva (cliente entra directo a reservar):
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="rounded bg-white px-2 py-1 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                    t.me/{username}?start={salon.slug}
                  </code>
                  <CopyLinkButton link={reservaLink} />
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Bot del dueño */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Bot del dueño (Juanita Pro)</CardTitle>
              <CardDescription>
                Bot privado para que tú (el dueño) hables con tu asistente. Con
                esto recibirás avisos de citas pendientes, no-shows, etc.
              </CardDescription>
            </div>
            {tieneBotDueno ? (
              <Badge variant="secondary">Configurado</Badge>
            ) : (
              <Badge variant="outline">Sin configurar</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <form action={actualizarBotDueno} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="telegram_bot_dueno_token">Token del bot del dueño</Label>
              <Input
                id="telegram_bot_dueno_token"
                name="telegram_bot_dueno_token"
                type="password"
                autoComplete="off"
                placeholder="987654321:BB..."
                defaultValue={salon.telegramBotDuenoToken ?? ''}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Crea otro bot distinto al de clientes con @BotFather.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="telegram_chat_id_dueno">Tu chat_id de Telegram</Label>
              <Input
                id="telegram_chat_id_dueno"
                name="telegram_chat_id_dueno"
                inputMode="numeric"
                placeholder="123456789"
                defaultValue={salon.telegramChatIdDueno ?? ''}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Escribe a tu bot personal y obtén tu chat_id desde n8n o con
                el comando /getid de un bot tipo @userinfobot.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit">Guardar</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>Cómo crear un bot en Telegram</CardTitle>
          <CardDescription>
            Pasos rápidos para tener tu bot listo en menos de 2 minutos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300 list-decimal pl-5">
            <li>
              Abre Telegram y busca <strong>@BotFather</strong>.
            </li>
            <li>
              Envía <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">/newbot</code> y sigue las instrucciones.
            </li>
            <li>Copia el token que te da y pégalo aquí.</li>
            <li>
              Listo: tu bot ya puede recibir reservas.
            </li>
          </ol>
          <Separator className="my-4" />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Recomendación: usa dos bots distintos, uno público para clientes y
            otro privado solo para ti.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
