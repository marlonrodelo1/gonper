import { Icon } from "@/components/landing/icons";

const items = [
  {
    title: "Habla con tu negocio",
    body: "Pregunta cuántas citas tienes mañana, agenda una nueva o cancela una — todo escribiendo como a un colega.",
    icon: <Icon.Telegram width="22" height="22" />,
  },
  {
    title: "Avisos en tiempo real",
    body: "Cada vez que alguien reserva, confirma o cancela, te llega al móvil. Sin estar pendiente.",
    icon: <Icon.Bell width="22" height="22" />,
  },
  {
    title: "Tus clientes reservan solos",
    body: "Tu propia web pública con link compartible y QR descargable. El cliente reserva en 30 segundos.",
    icon: <Icon.Calendar width="22" height="22" />,
  },
  {
    title: "Recordatorios automáticos",
    body: "Email automático 2 horas antes con botones para confirmar o cancelar. Adiós a los no-shows.",
    icon: <Icon.Bell width="22" height="22" />,
  },
];

export function Beneficios() {
  return (
    <section id="beneficios" className="px-6 py-24 bg-cream">
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal flex flex-col items-start gap-4 mb-12 max-w-[720px]">
          <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80">
            Lo que cambia
          </div>
          <h2
            className="tight font-medium text-ink"
            style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1 }}
          >
            Llevas el salón{" "}
            <span className="font-serif-it text-terracotta">en el bolsillo</span>.
          </h2>
          <p className="text-stone text-[16px] leading-relaxed max-w-[560px]">
            Sin abrir el ordenador. Sin volverte loco con calendarios. Tu
            asistente IA hace el trabajo aburrido y tú decides cuándo intervenir.
          </p>
        </div>

        <div className="reveal grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((it, i) => (
            <div
              key={i}
              className="border border-line rounded-2xl p-6 bg-paper flex flex-col gap-3"
            >
              <span className="w-12 h-12 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center">
                {it.icon}
              </span>
              <h3 className="tight font-medium text-ink text-[20px]">
                {it.title}
              </h3>
              <p className="text-stone text-[15px] leading-relaxed">
                {it.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
