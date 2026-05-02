"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "./icons";
import { TopNav } from "./top-nav";

export function Hero() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    router.push(`/signup?email=${encodeURIComponent(email)}`);
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover [transform:scaleY(-1)]"
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4"
        ></video>
        <div className="absolute inset-0 hero-overlay"></div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 0%, rgba(197,86,44,0.06), transparent 70%)",
          }}
        ></div>
      </div>

      <div className="relative z-10">
        <TopNav />
      </div>

      <div
        className="relative z-10 mx-auto max-w-[1200px] px-6 pb-32"
        style={{ paddingTop: "290px" }}
      >
        <div className="flex flex-col gap-8 max-w-[820px]">
          <div className="reveal" data-delay="0">
            <span className="inline-flex items-center gap-2 text-[12px] uppercase tracking-[0.22em] text-stone/80 px-3 py-1.5 rounded-full bg-paper/70 border border-line">
              <span className="w-1.5 h-1.5 rounded-full bg-terracotta"></span>
              Para salones · España
            </span>
          </div>

          <h1
            className="reveal tight font-medium text-ink"
            data-delay="120"
            style={{ fontSize: "clamp(48px, 7vw, 80px)", lineHeight: 0.98 }}
          >
            Una{" "}
            <span
              className="font-serif-it"
              style={{
                fontSize: "clamp(58px, 8.6vw, 100px)",
                lineHeight: 0.9,
                letterSpacing: "-0.02em",
              }}
            >
              recepcionista
            </span>
            <br />
            que no descansa nunca.
          </h1>

          <p
            className="reveal"
            data-delay="240"
            style={{
              fontSize: "18px",
              lineHeight: 1.55,
              color: "#373a46",
              opacity: 0.8,
              maxWidth: "554px",
            }}
          >
            Gomper atiende reservas por Telegram 24/7, confirma cada cita una
            hora antes y libera el hueco si no hay respuesta. Para barberías,
            peluquerías y centros de estética en España. Tú sigues cortando.
          </p>

          <div className="reveal flex flex-col gap-4" data-delay="360" id="cta">
            <form
              onSubmit={onSubmit}
              className="soft-input flex items-center gap-1 p-1.5 max-w-[520px] w-full"
              style={{ borderRadius: "40px" }}
            >
              <span className="pl-4 pr-1 text-stone/70">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="M22 7l-10 6L2 7" />
                </svg>
              </span>
              <input
                type="email"
                required
                placeholder="tu@salón.es"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[15px] py-2 placeholder:text-stone/50 text-ink"
              />
              <button
                type="submit"
                className="gloss-btn px-5 py-3 rounded-full text-[14px] font-medium tracking-tight whitespace-nowrap"
              >
                {submitted ? "¡Listo! ✓" : "Empezar prueba gratis 7 días"}
              </button>
            </form>

            <div className="flex items-center gap-3 text-[13px] text-stone">
              <div className="flex -space-x-1.5">
                {["#C5562C", "#8B9D7A", "#6B6356", "#2B2823"].map((c, i) => (
                  <span
                    key={i}
                    className="w-6 h-6 rounded-full border-2 border-cream"
                    style={{ background: c }}
                  ></span>
                ))}
              </div>
              <div className="flex items-center gap-1 text-terracotta">
                <Icon.Star width="13" height="13" />
                <Icon.Star width="13" height="13" />
                <Icon.Star width="13" height="13" />
                <Icon.Star width="13" height="13" />
                <Icon.Star width="13" height="13" />
              </div>
              <span className="text-ink/80 font-medium">
                1.020+ reservas atendidas
              </span>
              <span className="text-stone/60">esta semana</span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-stone/60 text-[11px] uppercase tracking-[0.25em] flex flex-col items-center gap-2">
        <span>Mira cómo funciona</span>
        <span className="block w-px h-8 bg-stone/30"></span>
      </div>
    </section>
  );
}
