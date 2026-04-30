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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

const TONOS: { value: string; label: string; hint?: string }[] = [
  { value: 'profesional', label: 'Profesional' },
  { value: 'cercano', label: 'Cercano (recomendado)' },
  { value: 'desenfadado', label: 'Desenfadado' },
];

const PLACEHOLDERS_BIENVENIDA: Record<string, string> = {
  profesional:
    'Ej: "Buenos días, soy Juanita, asistente del salón. ¿En qué puedo ayudarle?"',
  cercano:
    'Ej: "¡Hola! 👋 Soy Juanita, encantada de conocerte. ¿En qué te ayudo?"',
  desenfadado:
    'Ej: "¡Buenas! 💈 Soy Juanita, tu recepcionista virtual. Cuéntame en qué te ayudo."',
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
      return `¡Buenas! 💈 Soy ${nombreAgente}. ¿En qué te ayudo?`;
    case 'cercano':
    default:
      return `¡Hola! 👋 Soy ${nombreAgente}, la recepcionista de ${nombreSalon}. ¿Cómo te llamas?`;
  }
}

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

  const tono = salon.agenteTono || 'cercano';
  const tieneCustom = !!(salon.agenteBienvenida && salon.agenteBienvenida.trim());
  const saludoPreview = tieneCustom
    ? salon.agenteBienvenida!
    : generarSaludoBase(tono, salon.agenteNombre || 'Juanita', salon.nombre);

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
          <CardTitle>Personalidad</CardTitle>
          <CardDescription>
            Personaliza cómo se presenta y habla tu agente con los clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={actualizarAgente} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="agente_nombre">Nombre del agente</Label>
              <Input
                id="agente_nombre"
                name="agente_nombre"
                required
                maxLength={60}
                defaultValue={salon.agenteNombre || 'Juanita'}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                El nombre con el que se presenta a tus clientes.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agente_genero">Género</Label>
              <Select
                name="agente_genero"
                defaultValue={salon.agenteGenero || 'femenino'}
              >
                <SelectTrigger className="w-full" id="agente_genero">
                  <SelectValue placeholder="Selecciona género" />
                </SelectTrigger>
                <SelectContent>
                  {GENEROS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agente_tono">Tono</Label>
              <Select name="agente_tono" defaultValue={tono}>
                <SelectTrigger className="w-full" id="agente_tono">
                  <SelectValue placeholder="Selecciona tono" />
                </SelectTrigger>
                <SelectContent>
                  {TONOS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="space-y-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
                <p>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Profesional
                  </strong>
                  : trato formal, sin emojis. Frases cortas y claras.
                </p>
                <p>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Cercano
                  </strong>
                  : tuteo, cálido y natural. 1-2 emojis bien escogidos.
                </p>
                <p>
                  <strong className="text-zinc-900 dark:text-zinc-100">
                    Desenfadado
                  </strong>
                  : tuteo + expresiones coloquiales suaves, más emojis y humor
                  ligero.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agente_bienvenida">
                Mensaje de bienvenida personalizado
              </Label>
              <Textarea
                id="agente_bienvenida"
                name="agente_bienvenida"
                maxLength={280}
                rows={3}
                defaultValue={salon.agenteBienvenida ?? ''}
                placeholder={PLACEHOLDERS_BIENVENIDA[tono] ?? PLACEHOLDERS_BIENVENIDA.cercano}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Opcional. Si lo dejas vacío, se genera automáticamente según el
                tono. Máx. 280 caracteres.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit">Guardar cambios</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>Vista previa</CardTitle>
              <CardDescription>
                Así saludaría tu agente con la configuración guardada.
              </CardDescription>
            </div>
            {tieneCustom ? (
              <Badge variant="secondary">Personalizado</Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-semibold text-white">
              {(salon.agenteNombre || 'J').charAt(0).toUpperCase()}
            </div>
            <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-zinc-100 px-4 py-2.5 text-sm whitespace-pre-wrap text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100">
              {saludoPreview}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reglas absolutas</CardTitle>
          <CardDescription>
            Independientemente del tono, todos los agentes Gomper siguen estas
            reglas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            {REGLAS_ABSOLUTAS.map((regla) => (
              <li key={regla} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-400 dark:bg-zinc-600" />
                <span>{regla}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
