"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

type ChatMessage = {
  from: "bot" | "user";
  text: string;
};

// Diálogo entre el dueño (Marlon) y su asistente Juanita en Telegram.
// Refleja la propuesta de valor: gestionar el negocio desde el móvil.
const messages: ChatMessage[] = [
  { from: "user", text: "¿qué citas tengo hoy?" },
  {
    from: "bot",
    text:
      "Hoy tienes 8 citas confirmadas, Marlon.\n\n📅 Próxima 11:00 — Ana Pérez · Corte\n💶 240€ previstos",
  },
  { from: "user", text: "agenda a María mañana 17h corte" },
  {
    from: "bot",
    text:
      "✅ Cita creada\n\nMaría García · Corte · 25€\nMañana 17:00 con Lucía\n\nLe he enviado email de confirmación.",
  },
  { from: "user", text: "¿cuánto facturé esta semana?" },
  {
    from: "bot",
    text: "Esta semana: 480€ en 19 citas.\n+12% vs la semana pasada 📈",
  },
];

export function ChatDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(
      () => setStep((s) => (s < messages.length ? s + 1 : 0)),
      1800,
    );
    return () => clearInterval(t);
  }, []);

  const visible = messages.slice(0, step);

  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      {/* Marco del móvil */}
      <div className="rounded-[44px] p-3 bg-ink shadow-[0_30px_60px_-20px_rgba(26,24,21,0.45)]">
        <div
          className="rounded-[36px] overflow-hidden h-[640px] flex flex-col"
          style={{ backgroundColor: "#17212B" }}
        >
          {/* Status bar */}
          <div className="px-6 pt-4 pb-2 flex justify-between items-center text-[11px] text-white/70">
            <span className="font-medium">9:41</span>
            <span className="flex gap-1 items-center">
              <span className="w-3 h-2 border border-white/60 rounded-sm relative">
                <span className="absolute inset-0.5 bg-white/60 rounded-[1px]"></span>
              </span>
            </span>
          </div>

          {/* Header tipo Telegram */}
          <div
            className="px-4 py-3 flex items-center gap-3 border-b border-white/5"
            style={{ backgroundColor: "#2B5278" }}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-terracotta to-[#A8451F] flex items-center justify-center text-paper text-[13px] font-semibold">
              J
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-white tight">
                Juanita · tu asistente
              </div>
              <div className="text-[11px] text-white/60">en línea</div>
            </div>
            <Icon.Phone width="18" height="18" className="text-white/70" />
          </div>

          {/* Conversación */}
          <div
            className="flex-1 overflow-y-auto nice-scroll px-3 py-4 flex flex-col gap-2"
            style={{ backgroundColor: "#0E1621" }}
          >
            {visible.map((m, i) => (
              <div
                key={i}
                className={`chat-pop flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13.5px] leading-snug whitespace-pre-line ${
                    m.from === "user"
                      ? "rounded-br-md text-white"
                      : "rounded-bl-md text-white"
                  }`}
                  style={
                    m.from === "user"
                      ? { backgroundColor: "#2B5278" }
                      : { backgroundColor: "#182533" }
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input bar Telegram */}
          <div
            className="px-3 py-2 flex items-center gap-2 border-t border-white/5"
            style={{ backgroundColor: "#17212B" }}
          >
            <Icon.Plus width="18" height="18" className="text-white/50" />
            <div
              className="flex-1 px-3 py-1.5 rounded-full text-[12px] text-white/50"
              style={{ backgroundColor: "#242F3D" }}
            >
              Mensaje
            </div>
            <div className="w-7 h-7 rounded-full bg-[#5288C1] flex items-center justify-center text-white">
              <Icon.Telegram width="14" height="14" />
            </div>
          </div>
        </div>
      </div>

      {/* Badge superior izquierda */}
      <div className="absolute -left-6 top-20 chat-pop bg-paper rounded-xl border border-line px-3 py-2 shadow-lg text-[12px] flex items-center gap-2">
        <Icon.Sparkle width="14" height="14" className="text-terracotta" />
        <span className="text-ink tight">Tu asistente · siempre activo</span>
      </div>

      {/* Badge inferior derecha */}
      <div className="absolute -right-6 bottom-24 chat-pop bg-ink text-cream rounded-xl px-3 py-2 shadow-lg text-[12px] flex items-center gap-2">
        <Icon.Check width="14" height="14" className="text-sage" />
        <span className="tight">Cita creada</span>
      </div>
    </div>
  );
}
