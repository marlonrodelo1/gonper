"use client";

import { useState } from "react";
import { Icon } from "@/components/landing/icons";

const items = [
  {
    q: "¿Mis clientes tienen que descargar algo?",
    a: "No. Solo abren Telegram (que ya usan o instalan en 30 segundos), buscan tu bot y reservan. Sin cuentas, sin formularios. WhatsApp llega después.",
  },
  {
    q: "¿Y si un cliente no responde al recordatorio?",
    a: "A los 30 minutos sin respuesta, Gomper libera el hueco automáticamente y se lo ofrece a la lista de espera. Tú no haces nada.",
  },
  {
    q: '¿Puedo cambiar el nombre de "Juanita"?',
    a: "Sí. Le pones el nombre que quieras, eliges género, tono (profesional/cercano/desenfadado) y hasta una frase de bienvenida. Es tu personaje.",
  },
  {
    q: "¿Qué pasa si me canso de pagar?",
    a: "Cancelas con un clic. Tus datos siguen siendo tuyos: te exportamos clientes y citas en CSV. Cero permanencia.",
  },
  {
    q: "¿Funciona si solo soy yo?",
    a: "Sí. El plan Solo está pensado para autónomos. 19,90 €/mes, una silla, todo lo importante.",
  },
  {
    q: "¿Soporte en español?",
    a: "Empresa española, equipo en Tenerife. Hablamos por WhatsApp, email o videollamada. Sin tickets en otro idioma.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="py-32 px-6">
      <div className="mx-auto max-w-[900px]">
        <div className="reveal text-center mb-12">
          <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-4">
            Dudas frecuentes
          </div>
          <h2
            className="tight font-medium text-ink"
            style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1 }}
          >
            Lo que la gente <span className="font-serif-it">pregunta</span>.
          </h2>
        </div>
        <div className="reveal flex flex-col">
          {items.map((it, i) => (
            <button
              key={i}
              onClick={() => setOpen(open === i ? -1 : i)}
              className="text-left border-t border-line py-6 flex flex-col gap-3 last:border-b group"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="tight text-ink text-[20px] font-medium">
                  {it.q}
                </span>
                <span
                  className={`w-8 h-8 rounded-full border border-line flex items-center justify-center text-stone transition ${
                    open === i ? "rotate-45 bg-ink text-cream border-ink" : ""
                  }`}
                >
                  <Icon.Plus width="14" height="14" />
                </span>
              </div>
              {open === i && (
                <p className="text-stone text-[15px] leading-relaxed max-w-[680px]">
                  {it.a}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
