import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const pasos = [
  {
    icon: "📱",
    titulo: "Tu cliente reserva por Telegram",
    desc: "Sin descargar apps. Solo abre el chat con tu bot y reserva en 30 segundos.",
  },
  {
    icon: "✅",
    titulo: "Juanita confirma 1h antes",
    desc: "Tu asistente virtual confirma cada cita antes y libera huecos si no responden.",
  },
  {
    icon: "📊",
    titulo: "Tú lo ves todo en tu panel",
    desc: "Hoy, agenda semanal, clientes, métricas. Sin estrés.",
  },
];

const planes = [
  {
    nombre: "Solo",
    precio: "19,90 €",
    destacado: false,
    features: [
      "1 profesional",
      "Reservas por Telegram",
      "Recordatorios automáticos",
      "Panel básico",
    ],
  },
  {
    nombre: "Studio",
    precio: "29,90 €",
    destacado: true,
    features: [
      "Hasta 4 profesionales",
      "Lista de espera",
      "Depósitos y pagos",
      "Juanita Pro (IA avanzada)",
    ],
  },
  {
    nombre: "Pro",
    precio: "79,90 €",
    destacado: false,
    features: [
      "Profesionales ilimitados",
      "Multi-local",
      "WhatsApp Business",
      "Acceso a API",
    ],
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <main className="mx-auto flex max-w-6xl flex-col gap-32 px-6 py-20 md:py-28">
        {/* HERO */}
        <section className="flex flex-col items-center gap-8 text-center">
          <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-6xl font-bold tracking-tight text-transparent md:text-7xl">
            Gomper
          </h1>
          <p className="text-2xl font-medium text-zinc-900 md:text-3xl dark:text-zinc-100">
            El asistente virtual para tu salón
          </p>
          <p className="max-w-2xl text-base text-zinc-600 md:text-lg dark:text-zinc-400">
            Atiende reservas 24/7 por Telegram. Confirma citas. Elimina
            no-shows. Pensado para barberías, peluquerías y centros de estética
            en España.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90",
              )}
            >
              Crear cuenta gratis
            </Link>
            <Link
              href="/login"
              className={buttonVariants({ size: "lg", variant: "outline" })}
            >
              Iniciar sesión
            </Link>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="flex flex-col gap-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">
              Cómo funciona
            </h2>
            <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
              Tres pasos. Tú dejas de coger el teléfono. Tu salón se llena solo.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {pasos.map((paso) => (
              <Card key={paso.titulo} className="flex flex-col gap-3">
                <CardHeader>
                  <div className="text-4xl">{paso.icon}</div>
                  <CardTitle className="mt-4 text-lg">{paso.titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {paso.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* PLANES */}
        <section className="flex flex-col gap-10">
          <div className="flex flex-col items-center gap-3 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 md:text-4xl dark:text-zinc-50">
              Planes simples
            </h2>
            <p className="max-w-xl text-zinc-600 dark:text-zinc-400">
              14 días de prueba gratis en cualquier plan. Sin tarjeta. Sin
              permanencia.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {planes.map((plan) => (
              <Card
                key={plan.nombre}
                className={
                  plan.destacado
                    ? "relative border-purple-300 shadow-lg ring-2 ring-purple-500/40 dark:border-purple-800"
                    : "relative"
                }
              >
                {plan.destacado && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                    Recomendado
                  </Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-xl">{plan.nombre}</CardTitle>
                  <CardDescription>
                    <span className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                      {plan.precio}
                    </span>
                    <span className="text-sm text-zinc-500"> /mes</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <ul className="flex flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <span className="text-purple-600 dark:text-pink-400">
                          ✓
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/signup"
                    className={cn(
                      buttonVariants({
                        variant: plan.destacado ? "default" : "outline",
                      }),
                      "w-full",
                      plan.destacado &&
                        "bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:opacity-90",
                    )}
                  >
                    Empezar gratis
                  </Link>
                  <p className="text-center text-xs text-zinc-500">
                    14 días de prueba
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-zinc-500 md:flex-row dark:text-zinc-400">
          <p>© 2026 Gomper · Tenerife, España</p>
          <Link
            href="/login"
            className="hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Iniciar sesión
          </Link>
        </div>
      </footer>
    </div>
  );
}
