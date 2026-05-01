import Link from "next/link";
import { Icon } from "@/components/landing/icons";

const features = [
  "Reservas por Telegram + chat web",
  "Recordatorios automáticos 1h antes",
  "Confirmación + liberación de huecos",
  "Lista de espera",
  "Personalización del agente (nombre, género, tono)",
  "Personalización de la web pública (promociones, galería, reseñas)",
  "Profesionales y servicios ilimitados",
  "Estadísticas y métricas",
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
            Plan único
          </div>
          <h2
            className="tight font-medium text-ink mb-4"
            style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1 }}
          >
            Cuota fija. <span className="font-serif-it">Sin</span> comisiones por reserva.
          </h2>
          <p className="text-stone text-[16px] max-w-[520px] mx-auto">
            7 días gratis. Sin tarjeta. Sin permanencia. Si no te convence, cierras y no pagas nada.
          </p>
        </div>

        <div className="reveal max-w-md mx-auto">
          <div className="plan-reco rounded-3xl p-8 flex flex-col gap-6 border border-ink shadow-[0_30px_60px_-20px_rgba(26,24,21,0.4)] relative">
            <span className="absolute -top-3 left-8 px-3 py-1 rounded-full bg-terracotta text-paper text-[11px] uppercase tracking-[0.18em]">
              Recomendado
            </span>
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <h3 className="tight font-medium text-[24px] text-cream">Básico</h3>
                <span className="text-[11px] uppercase tracking-[0.18em] text-cream/60">
                  Todo incluido
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-4">
                <span
                  className="tight font-medium text-cream"
                  style={{ fontSize: "52px", lineHeight: 1 }}
                >
                  30
                </span>
                <span className="text-[14px] text-cream/60">€/mes</span>
              </div>
              <div className="text-[12px] mt-1 text-cream/50">
                IVA no incluido
              </div>
            </div>
            <div className="h-px bg-cream/15"></div>
            <ul className="flex flex-col gap-3 flex-1">
              {features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-[14px] leading-snug"
                >
                  <Icon.Check
                    width="16"
                    height="16"
                    className="mt-0.5 flex-shrink-0 text-sage"
                  />
                  <span className="text-cream/90">{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="text-center py-3.5 rounded-full text-[14px] font-medium tight transition bg-cream text-ink hover:bg-paper"
            >
              Empezar 7 días gratis
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
