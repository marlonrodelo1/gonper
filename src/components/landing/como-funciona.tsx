"use client";

import { useRef } from "react";
import { useScrollTilt } from "@/lib/hooks/use-scroll-tilt";
import { ChatDemo } from "./chat-demo";
import { Icon } from "./icons";

export function ComoFunciona() {
  const pasos = [
    {
      n: "01",
      icon: <Icon.Telegram width="20" height="20" />,
      title: "Tu cliente reserva por Telegram",
      body: "Sin app, sin formularios, sin llamadas. Abre el chat con tu bot y reserva en 30 segundos. Botones grandes, español natural.",
    },
    {
      n: "02",
      icon: <Icon.Bell width="20" height="20" />,
      title: "Juanita confirma 1h antes",
      body: "Recordatorio automático con botón Confirmar/Cancelar. Si en 30 minutos no hay respuesta, libera el hueco y se lo ofrece a la lista de espera.",
    },
    {
      n: "03",
      icon: <Icon.Calendar width="20" height="20" />,
      title: "Tú lo ves todo en tu panel",
      body: "Hoy, agenda semanal, clientes, métricas. Panel limpio en español. Una vista por pantalla, cero ruido.",
    },
  ];

  const containerRef = useRef<HTMLElement>(null);
  const p = useScrollTilt(containerRef);
  const rotateX = -20 + 20 * p;
  const scale = 0.9 + 0.1 * p;
  const translateY = 100 - 100 * p;

  return (
    <section
      id="como"
      ref={containerRef}
      className="px-6 py-24"
      style={{ perspective: "1200px" }}
    >
      <div className="mx-auto max-w-[1280px]">
        <div className="reveal flex items-end justify-between mb-12 gap-8 flex-wrap px-2">
          <div className="max-w-[640px]">
            <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-4">
              Cómo funciona
            </div>
            <h2
              className="tight font-medium text-ink"
              style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1 }}
            >
              Tres pasos.
              <br />
              Tu salón{" "}
              <span className="font-serif-it text-terracotta">se llena solo</span>.
            </h2>
          </div>
          <p className="text-stone max-w-[360px] text-[15px] leading-relaxed">
            Conecta una vez, configura tus servicios y horarios. Gomper hace el
            resto. La media de un salón Studio: 12 minutos de setup.
          </p>
        </div>

        <div
          style={{
            transform: `translateY(${translateY}px) rotateX(${rotateX}deg) scale(${scale})`,
            transformStyle: "preserve-3d",
            transformOrigin: "center bottom",
            boxShadow:
              "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
            transition: "transform 0.05s linear",
          }}
          className="relative w-full rounded-[36px] overflow-hidden border-[3px] border-[#3A352E] bg-[#1A1815]"
        >
          <div className="rounded-[28px] bg-paper p-8 md:p-16 relative">
            <div className="absolute -top-32 -right-32 w-[480px] h-[480px] rounded-full bg-terracotta/8 blur-3xl pointer-events-none"></div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_460px] gap-12 lg:gap-16 items-center relative">
              <div className="flex flex-col">
                {pasos.map((paso) => (
                  <div
                    key={paso.n}
                    className="grid grid-cols-[80px_44px_1fr] gap-6 items-start py-8 border-t border-line first:border-t-0"
                  >
                    <span
                      className="font-serif-it text-stone/50"
                      style={{ fontSize: "40px", lineHeight: 1 }}
                    >
                      {paso.n}
                    </span>
                    <span className="w-11 h-11 rounded-full bg-terracotta/10 text-terracotta flex items-center justify-center">
                      {paso.icon}
                    </span>
                    <div>
                      <h3 className="tight font-medium text-ink text-[22px] mb-2">
                        {paso.title}
                      </h3>
                      <p className="text-stone text-[15px] leading-relaxed max-w-[440px]">
                        {paso.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <ChatDemo />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
