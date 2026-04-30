"use client";

import { useEffect, useState } from "react";
import { Icon } from "./icons";

type ChatMessage = {
  from: "bot" | "user";
  text: string;
  buttons?: string[];
  slots?: string[];
};

export function ChatDemo() {
  const [step, setStep] = useState(0);
  const messages: ChatMessage[] = [
    {
      from: "bot",
      text: "¡Hola! 👋 Soy Juanita, la recepcionista de Revolution Barbershop. ¿Cómo te llamas?",
    },
    { from: "user", text: "Marlon" },
    {
      from: "bot",
      text: "Encantada, Marlon 😊 ¿Qué quieres reservar?",
      buttons: ["Corte", "Corte + Barba", "Afeitado"],
    },
    { from: "user", text: "Corte + Barba" },
    {
      from: "bot",
      text: "Estos huecos quedan mañana:",
      slots: ["10:30", "12:15", "17:45", "19:00"],
    },
    { from: "user", text: "17:45" },
    {
      from: "bot",
      text: "Perfecto. Cita confirmada para mañana 17:45 con Roberto. Te recuerdo 1h antes 👍",
    },
  ];

  useEffect(() => {
    const t = setInterval(
      () => setStep((s) => (s < messages.length ? s + 1 : 0)),
      1600,
    );
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = messages.slice(0, step);

  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      <div className="rounded-[44px] p-3 bg-ink shadow-[0_30px_60px_-20px_rgba(26,24,21,0.45)]">
        <div className="rounded-[36px] bg-[#EFEAE2] overflow-hidden h-[640px] flex flex-col">
          <div className="px-6 pt-4 pb-2 flex justify-between items-center text-[11px] text-ink/70">
            <span className="font-medium">9:41</span>
            <span className="flex gap-1 items-center">
              <span className="w-3 h-2 border border-ink/60 rounded-sm relative">
                <span className="absolute inset-0.5 bg-ink/60 rounded-[1px]"></span>
              </span>
            </span>
          </div>
          <div className="px-4 py-3 bg-paper/90 border-b border-line flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-terracotta to-[#A8451F] flex items-center justify-center text-paper text-[13px] font-medium">
              J
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-medium text-ink tight">
                Juanita · Revolution
              </div>
              <div className="text-[11px] text-sage">en línea</div>
            </div>
            <Icon.Phone width="18" height="18" className="text-stone" />
          </div>
          <div className="flex-1 overflow-y-auto nice-scroll px-4 py-4 flex flex-col gap-2">
            {visible.map((m, i) => (
              <div
                key={i}
                className={`chat-pop flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13.5px] leading-snug ${
                    m.from === "user"
                      ? "bg-terracotta text-paper rounded-br-md"
                      : "bg-paper text-ink rounded-bl-md border border-line"
                  }`}
                >
                  <div>{m.text}</div>
                  {m.buttons && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.buttons.map((b) => (
                        <span
                          key={b}
                          className="text-[12px] px-2.5 py-1 rounded-full bg-cream border border-line text-ink"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.slots && (
                    <div className="mt-2 grid grid-cols-2 gap-1.5">
                      {m.slots.map((s) => (
                        <span
                          key={s}
                          className="text-[12px] text-center py-1 rounded-md bg-cream border border-line text-ink font-medium"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 bg-paper/90 border-t border-line flex items-center gap-2">
            <Icon.Plus width="18" height="18" className="text-stone" />
            <div className="flex-1 px-3 py-1.5 rounded-full bg-cream border border-line text-[12px] text-stone/60">
              Mensaje
            </div>
            <div className="w-7 h-7 rounded-full bg-terracotta flex items-center justify-center text-paper">
              <Icon.Telegram width="14" height="14" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -left-6 top-20 chat-pop bg-paper rounded-xl border border-line px-3 py-2 shadow-lg text-[12px] flex items-center gap-2">
        <Icon.Sparkle width="14" height="14" className="text-terracotta" />
        <span className="text-ink tight">Juanita responde en 2s</span>
      </div>
      <div className="absolute -right-6 bottom-24 chat-pop bg-ink text-cream rounded-xl px-3 py-2 shadow-lg text-[12px] flex items-center gap-2">
        <Icon.Check width="14" height="14" className="text-sage" />
        <span className="tight">No-show evitado</span>
      </div>
    </div>
  );
}
