import Link from "next/link";
import { Icon } from "@/components/landing/icons";

type Plan = {
  nombre: string;
  precio: string;
  note: string;
  features: string[];
  cta: string;
  destacado: boolean;
  href: string;
  external?: boolean;
};

const planes: Plan[] = [
  {
    nombre: "Solo",
    precio: "19,90",
    note: "Tú y tu silla",
    features: [
      "1 profesional",
      "Reservas por Telegram",
      "Recordatorios automáticos",
      "Panel básico",
    ],
    cta: "Empezar gratis",
    destacado: false,
    href: "/signup",
  },
  {
    nombre: "Studio",
    precio: "29,90",
    note: "Equipo pequeño · más vendido",
    features: [
      "Hasta 4 profesionales",
      "Lista de espera automática",
      "Depósitos y pagos online",
      "Juanita Pro (asistente del dueño)",
      "Personalización del agente",
    ],
    cta: "Empezar 14 días gratis",
    destacado: true,
    href: "/signup",
  },
  {
    nombre: "Pro",
    precio: "79,90",
    note: "Multi-local",
    features: [
      "Profesionales ilimitados",
      "Multi-local",
      "WhatsApp Business",
      "Acceso a API",
      "Soporte prioritario",
    ],
    cta: "Hablar con ventas",
    destacado: false,
    href: "mailto:hola@gomper.es?subject=Plan%20Pro%20Gomper",
    external: true,
  },
];

export function Pricing() {
  return (
    <section
      id="planes"
      className="py-32 px-6 bg-paper border-y border-line"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="reveal text-center mb-16">
          <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-4">
            Planes
          </div>
          <h2
            className="tight font-medium text-ink mb-4"
            style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1 }}
          >
            Cuota fija. <span className="font-serif-it">Sin</span> comisiones por reserva.
          </h2>
          <p className="text-stone text-[16px] max-w-[520px] mx-auto">
            14 días gratis en cualquier plan. Sin tarjeta. Sin permanencia. Si no te convence, cierras y no pagas nada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {planes.map((p, i) => {
            const ctaClass = `text-center py-3.5 rounded-full text-[14px] font-medium tight transition ${
              p.destacado
                ? "bg-cream text-ink hover:bg-paper"
                : "gloss-btn"
            }`;
            return (
              <div
                key={p.nombre}
                className={`reveal rounded-3xl p-8 flex flex-col gap-6 ${
                  p.destacado
                    ? "plan-reco border border-ink shadow-[0_30px_60px_-20px_rgba(26,24,21,0.4)] relative"
                    : "bg-cream border border-line"
                }`}
                data-delay={i * 80}
              >
                {p.destacado && (
                  <span className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-terracotta text-paper text-[11px] uppercase tracking-[0.18em]">
                    Recomendado
                  </span>
                )}
                <div>
                  <div className="flex items-baseline justify-between mb-1">
                    <h3 className="tight font-medium text-[24px]">{p.nombre}</h3>
                    <span
                      className={`text-[11px] uppercase tracking-[0.18em] ${
                        p.destacado ? "text-cream/60" : "text-stone/70"
                      }`}
                    >
                      {p.note}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-4">
                    <span
                      className="tight font-medium"
                      style={{ fontSize: "52px", lineHeight: 1 }}
                    >
                      {p.precio}
                    </span>
                    <span
                      className={`text-[14px] ${
                        p.destacado ? "text-cream/60" : "text-stone"
                      }`}
                    >
                      €/mes
                    </span>
                  </div>
                  <div
                    className={`text-[12px] mt-1 ${
                      p.destacado ? "text-cream/50" : "text-stone/70"
                    }`}
                  >
                    IVA no incluido
                  </div>
                </div>
                <div
                  className={`h-px ${
                    p.destacado ? "bg-cream/15" : "bg-line"
                  }`}
                ></div>
                <ul className="flex flex-col gap-3 flex-1">
                  {p.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-[14px] leading-snug"
                    >
                      <Icon.Check
                        width="16"
                        height="16"
                        className={`mt-0.5 flex-shrink-0 ${
                          p.destacado ? "text-sage" : "text-terracotta"
                        }`}
                      />
                      <span
                        className={p.destacado ? "text-cream/90" : "text-ink"}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                {p.external ? (
                  <a href={p.href} className={ctaClass}>
                    {p.cta}
                  </a>
                ) : (
                  <Link href={p.href} className={ctaClass}>
                    {p.cta}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
