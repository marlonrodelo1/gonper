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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { actualizarDatosSalon } from './actions';

type Salon = {
  id: string;
  nombre: string;
  slug: string;
  tipoNegocio: string;
  direccion: string | null;
  telefono: string | null;
  email: string | null;
  timezone: string;
  plan: string;
  trialUntil: string | Date | null;
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

const PLAN_CLASSES: Record<string, string> = {
  trial:
    'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 border-transparent',
  solo:
    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-transparent',
  studio:
    'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-transparent',
  pro:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-transparent',
  cancelado:
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-transparent',
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
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Configura tu salón</CardTitle>
          <CardDescription>
            Aún no tienes un salón asociado a tu cuenta.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const planKey = salon.plan in PLAN_LABEL ? salon.plan : 'trial';
  const trialFormatted = formatTrialUntil(salon.trialUntil);

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

      <Card>
        <CardHeader>
          <CardTitle>Datos generales</CardTitle>
          <CardDescription>
            Información de tu negocio. El agente la usa para presentarse y
            responder preguntas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={actualizarDatosSalon} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre del salón</Label>
              <Input
                id="nombre"
                name="nombre"
                required
                maxLength={120}
                defaultValue={salon.nombre}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo_negocio">Tipo de negocio</Label>
              <Select name="tipo_negocio" defaultValue={salon.tipoNegocio}>
                <SelectTrigger className="w-full" id="tipo_negocio">
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_NEGOCIO.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                name="direccion"
                defaultValue={salon.direccion ?? ''}
                placeholder="Calle, número, ciudad"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  name="telefono"
                  type="tel"
                  defaultValue={salon.telefono ?? ''}
                  placeholder="+34 600 000 000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email de contacto</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={salon.email ?? ''}
                  placeholder="hola@tusalon.es"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone">Zona horaria</Label>
              <Select name="timezone" defaultValue={salon.timezone}>
                <SelectTrigger className="w-full" id="timezone">
                  <SelectValue placeholder="Selecciona zona horaria" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit">Guardar cambios</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identificador</CardTitle>
          <CardDescription>
            Tu URL pública. Para cambiarlo, contacta soporte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">Slug</Label>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              {salon.slug}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-500">URL pública</Label>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              gomper.es/{salon.slug}
            </div>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Para cambiar el slug contacta con soporte (cambiarlo rompe URLs ya
            compartidas).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suscripción</CardTitle>
          <CardDescription>Tu plan actual en Gomper.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-xs text-zinc-500">Plan</Label>
            <Badge className={PLAN_CLASSES[planKey]}>
              {PLAN_LABEL[planKey]}
            </Badge>
          </div>
          {planKey === 'trial' && trialFormatted ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Tu periodo de prueba termina el{' '}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {trialFormatted}
              </span>
              .
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
