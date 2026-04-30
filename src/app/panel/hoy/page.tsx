// TODO: reemplazar mocks por queries Drizzle a la tabla 'citas' filtradas por hoy + salon_id

type EstadoCita = "completada" | "confirmada" | "pendiente" | "no_show" | "cancelada";

interface Cita {
  id: number;
  hora: string;
  cliente: string;
  servicio: string;
  profesional: string;
  precio: number;
  estado: EstadoCita;
  telefono: string;
  noShows?: number;
  alerta?: boolean;
}

const citasHoy: Cita[] = [
  { id: 1, hora: "10:00", cliente: "María García", servicio: "Corte", profesional: "Roberto", precio: 15, estado: "completada", telefono: "+34 612 345 678" },
  { id: 2, hora: "10:45", cliente: "Roberto Pérez", servicio: "Corte + Barba", profesional: "Roberto", precio: 22, estado: "completada", telefono: "+34 623 456 789" },
  { id: 3, hora: "11:30", cliente: "Luis Sánchez", servicio: "Afeitado", profesional: "Carlos", precio: 18, estado: "completada", telefono: "+34 634 567 890" },
  { id: 4, hora: "12:15", cliente: "Pedro Gómez", servicio: "Corte", profesional: "Roberto", precio: 15, estado: "no_show", telefono: "+34 645 678 901", noShows: 3 },
  { id: 5, hora: "16:30", cliente: "Ana Martín", servicio: "Corte", profesional: "Carlos", precio: 15, estado: "pendiente", telefono: "+34 656 789 012", alerta: true },
  { id: 6, hora: "17:30", cliente: "Pablo Ruiz", servicio: "Corte + Barba", profesional: "Roberto", precio: 22, estado: "confirmada", telefono: "+34 667 890 123" },
  { id: 7, hora: "19:00", cliente: "Diego López", servicio: "Corte", profesional: "Carlos", precio: 15, estado: "confirmada", telefono: "+34 678 901 234" },
];

const estadoStyles: Record<EstadoCita, { label: string; className: string }> = {
  completada: { label: "Completada", className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  confirmada: { label: "Confirmada", className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  pendiente: { label: "Pendiente", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  no_show: { label: "No-show", className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  cancelada: { label: "Cancelada", className: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" },
};

function formatearFechaHoy(): string {
  const fecha = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  return fecha.charAt(0).toUpperCase() + fecha.slice(1);
}

export default function HoyPage() {
  const fechaHoy = formatearFechaHoy();

  const facturado = citasHoy
    .filter((c) => c.estado === "completada")
    .reduce((sum, c) => sum + c.precio, 0);
  const completadas = citasHoy.filter((c) => c.estado === "completada").length;
  const noShows = citasHoy.filter((c) => c.estado === "no_show").length;
  const sinConfirmar = citasHoy.filter((c) => c.estado === "pendiente").length;

  const alertas = citasHoy.filter((c) => c.alerta && c.estado === "pendiente");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Hoy</p>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {fechaHoy}
          </h1>
        </div>
        <button className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90">
          <span>+</span>
          <span>Nueva cita</span>
        </button>
      </header>

      {alertas.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-900/20">
          <span className="text-xl">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              {alertas.length} cita{alertas.length === 1 ? "" : "s"} sin confirmar próximas
            </p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
              Juanita puede enviar un recordatorio automático a estos clientes.
            </p>
          </div>
        </div>
      )}

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Facturado hoy" value={`${facturado} €`} accent="emerald" />
        <KpiCard label="Completadas" value={`${completadas}`} accent="blue" />
        <KpiCard label="No-shows" value={`${noShows}`} accent="red" />
        <KpiCard label="Sin confirmar" value={`${sinConfirmar}`} accent="amber" />
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Citas del día
          </h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {citasHoy.length} citas
          </span>
        </div>
        <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
          {citasHoy.map((cita) => {
            const estado = estadoStyles[cita.estado];
            return (
              <li
                key={cita.id}
                className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <div className="w-16 shrink-0 text-base font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                  {cita.hora}
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-950 dark:text-zinc-50">
                      {cita.cliente}
                    </span>
                    {cita.noShows && cita.noShows >= 2 && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        {cita.noShows} no-shows
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {cita.servicio} · {cita.profesional}
                  </div>
                </div>
                <div className="hidden w-20 text-right text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100 sm:block">
                  {cita.precio} €
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${estado.className}`}
                >
                  {estado.label}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50 p-6 dark:border-purple-900/40 dark:from-purple-900/20 dark:to-pink-900/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🤖</span>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Juanita resume tu día
            </h3>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
              Tienes {sinConfirmar} cita{sinConfirmar === 1 ? "" : "s"} sin confirmar y
              {" "}{noShows} no-show{noShows === 1 ? "" : "s"} hoy. Pedro Gómez acumula 3
              ausencias — considera pedir señal en su próxima reserva.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

type Accent = "emerald" | "blue" | "red" | "amber";

const accentStyles: Record<Accent, string> = {
  emerald: "text-emerald-600 dark:text-emerald-400",
  blue: "text-blue-600 dark:text-blue-400",
  red: "text-red-600 dark:text-red-400",
  amber: "text-amber-600 dark:text-amber-400",
};

function KpiCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: Accent;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${accentStyles[accent]}`}>
        {value}
      </p>
    </div>
  );
}
