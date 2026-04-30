import Link from "next/link";
import { Icon } from "@/components/landing/icons";

export function FinalCTA() {
  return (
    <section className="py-32 px-6">
      <div className="mx-auto max-w-[1100px] reveal">
        <div className="rounded-[40px] bg-ink text-cream p-12 md:p-20 relative overflow-hidden grain">
          <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-terracotta/30 blur-3xl"></div>
          <div className="relative z-10 max-w-[640px]">
            <div className="text-[12px] uppercase tracking-[0.22em] text-cream/60 mb-6">
              Empieza hoy
            </div>
            <h2
              className="tight font-medium"
              style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.98 }}
            >
              Deja de coger
              <br />
              el <span className="font-serif-it text-terracotta">teléfono</span>.
            </h2>
            <p className="text-cream/70 text-[17px] mt-6 max-w-[480px] leading-relaxed">
              14 días gratis. Sin tarjeta. Setup en 12 minutos. Si después de probarlo no quieres seguir, cierras y no pagas nada.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Link
                href="/signup"
                className="px-7 py-4 rounded-full bg-cream text-ink text-[15px] font-medium tight hover:bg-paper transition text-center"
              >
                Crear cuenta gratis
              </Link>
              <Link
                href="/panel/hoy"
                className="px-7 py-4 rounded-full border border-cream/20 text-cream text-[15px] tight hover:bg-cream/5 transition text-center inline-flex items-center justify-center gap-2"
              >
                Ver el panel <Icon.Arrow width="14" height="14" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
