"use client";

import { useState } from "react";

type Tono = "profesional" | "cercano" | "desenfadado";

const saludos: Record<Tono, string> = {
  profesional: "Buenos días, soy Juanita, asistente de Revolution Barbershop.",
  cercano: "¡Hola! 👋 Soy Juanita, la recepcionista de Revolution Barbershop.",
  desenfadado: "¡Buenas! 💈 Soy Juanita. ¿En qué te ayudo, crack?",
};

const tonos: Tono[] = ["profesional", "cercano", "desenfadado"];

export function Juanita() {
  const [tono, setTono] = useState<Tono>("cercano");

  return (
    <section
      id="juanita"
      className="py-32 px-6 bg-paper border-y border-line relative overflow-hidden"
    >
      <div
        className="absolute -right-20 -bottom-20 font-serif-it text-line/40 select-none pointer-events-none"
        style={{ fontSize: "420px", lineHeight: 0.8 }}
      >
        Juanita
      </div>

      <div className="mx-auto max-w-[1200px] relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="reveal">
            <div className="aspect-[4/5] rounded-[32px] bg-gradient-to-br from-terracotta/30 via-cream to-sage/20 border border-line relative overflow-hidden grain">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 200 250"
                  className="w-full h-full"
                  preserveAspectRatio="xMidYMid slice"
                >
                  <defs>
                    <linearGradient id="skin" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#E8C9B0" />
                      <stop offset="100%" stopColor="#C49980" />
                    </linearGradient>
                    <linearGradient id="hair" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#3B2A1F" />
                      <stop offset="100%" stopColor="#1C1410" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M30 250 Q30 180 100 175 Q170 180 170 250 Z"
                    fill="#1A1815"
                  />
                  <rect x="88" y="155" width="24" height="30" fill="url(#skin)" />
                  <ellipse cx="100" cy="125" rx="38" ry="48" fill="url(#skin)" />
                  <path
                    d="M62 110 Q60 70 100 65 Q140 70 138 110 Q138 95 130 90 Q115 80 100 80 Q85 80 70 90 Q62 95 62 110 Z"
                    fill="url(#hair)"
                  />
                  <path
                    d="M62 110 Q55 130 60 150 L66 145 Q62 130 64 115 Z"
                    fill="url(#hair)"
                  />
                  <path
                    d="M138 110 Q145 130 140 150 L134 145 Q138 130 136 115 Z"
                    fill="url(#hair)"
                  />
                  <ellipse cx="86" cy="125" rx="3" ry="2" fill="#1A1815" />
                  <ellipse cx="114" cy="125" rx="3" ry="2" fill="#1A1815" />
                  <path
                    d="M92 145 Q100 150 108 145"
                    stroke="#A8451F"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <circle cx="65" cy="138" r="2" fill="#C5562C" />
                </svg>
              </div>
              <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-paper/90 backdrop-blur border border-line text-[11px] uppercase tracking-[0.18em] text-stone">
                Placeholder · sustituye por foto/avatar
              </div>
              <div className="absolute bottom-6 left-6 right-6 bg-ink/90 backdrop-blur text-cream rounded-2xl p-4">
                <div className="text-[11px] uppercase tracking-[0.2em] text-cream/60 mb-1">
                  Personaje configurable
                </div>
                <div className="font-serif-it text-[28px] leading-tight">
                  &quot;Soy la cara amable de tu salón.&quot;
                </div>
              </div>
            </div>
          </div>

          <div className="reveal flex flex-col gap-8">
            <div>
              <div className="text-[12px] uppercase tracking-[0.22em] text-stone/80 mb-4">
                El personaje
              </div>
              <h2
                className="tight font-medium text-ink mb-6"
                style={{ fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1 }}
              >
                No es un chatbot.
                <br />
                Es <span className="font-serif-it text-terracotta">tu</span> recepcionista.
              </h2>
              <p className="text-stone text-[16px] leading-relaxed max-w-[480px]">
                Le pones nombre. Le pones género. Le pones tono. Y desde ese momento &quot;vive&quot;
                en tu salón. Habla como hablarías tú a tus clientes — porque tú lo decides.
              </p>
            </div>

            <div className="bg-cream rounded-2xl border border-line p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-[12px] uppercase tracking-[0.18em] text-stone">
                  Prueba un tono
                </div>
                <div className="flex gap-1 p-1 bg-paper rounded-full border border-line">
                  {tonos.map((t) => (
                    <button
                      key={t}
                      onClick={() => setTono(t)}
                      className={`text-[12px] px-3 py-1.5 rounded-full transition ${
                        tono === t
                          ? "bg-ink text-cream"
                          : "text-stone hover:text-ink"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-full bg-terracotta/15 text-terracotta flex items-center justify-center flex-shrink-0 font-medium">
                  J
                </div>
                <div className="bg-paper rounded-2xl rounded-tl-md border border-line p-4 text-[15px] text-ink leading-relaxed flex-1">
                  {saludos[tono]}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                ["Nunca", "inventa precios u horarios"],
                ["Nunca", "acepta jailbreaks"],
                ["Siempre", "confirma con un resumen claro"],
                ["Siempre", "recuerda al cliente habitual"],
              ].map(([k, v], i) => (
                <div
                  key={i}
                  className="border border-line rounded-xl p-4 bg-paper"
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] text-terracotta font-medium mb-1">
                    {k}
                  </div>
                  <div className="text-[14px] text-ink tight">{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
