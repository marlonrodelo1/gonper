'use client';

import { useState } from 'react';

import { Icon } from './icons';

type Mensaje = { from: 'pro' | 'me'; text: string };

const sugerencias = [
  '¿Cuánto facturamos esta semana?',
  'Bloquea mañana de 14h a 16h',
  'Avisa a Ana si no confirma',
];

export type JuanitaProProps = {
  mensajeInicial: string;
};

export function JuanitaPro({ mensajeInicial }: JuanitaProProps) {
  const [msgs, setMsgs] = useState<Mensaje[]>([
    { from: 'pro', text: mensajeInicial },
  ]);
  const [draft, setDraft] = useState('');

  // TODO: en futuro, llamar a /api/v1/juanita-pro que invoca Gemini.
  const send = (txt: string) => {
    const limpio = txt.trim();
    if (!limpio) return;
    setMsgs((m) => [...m, { from: 'me', text: limpio }]);
    setDraft('');
    setTimeout(() => {
      const lower = limpio.toLowerCase();
      const reply = lower.includes('semana')
        ? 'Esta semana llevas 412 €, 21 citas, 1 no-show. Mejor día: martes (98 €).'
        : lower.includes('bloquea')
          ? 'Hecho. Mañana 14:00–16:00 bloqueado. Aviso a los 2 clientes que tenían hueco ahí.'
          : 'Anotado. Te aviso si Ana no confirma en 30 min.';
      setMsgs((m) => [...m, { from: 'pro', text: reply }]);
    }, 700);
  };

  return (
    <div className="card flex h-[460px] flex-col overflow-hidden">
      <div className="flex items-center gap-3 border-b border-line bg-gradient-to-b from-paper to-cream px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-terracotta to-[#A8451F] text-[13px] font-medium text-paper">
          J
        </div>
        <div className="flex-1">
          <div className="tight flex items-center gap-2 text-[14px] font-medium text-ink">
            Juanita Pro
            <span
              className="pill"
              style={{
                background: 'rgba(139,157,122,0.15)',
                color: '#5A6B4D',
              }}
            >
              <span
                className="pill-dot"
                style={{ background: '#8B9D7A' }}
              />
              en línea
            </span>
          </div>
          <div className="text-[11px] text-stone">
            Tu copiloto de salón · responde en lenguaje natural
          </div>
        </div>
        <button
          type="button"
          aria-label="Más opciones"
          className="text-stone hover:text-ink"
        >
          <Icon.Dot3 width="16" height="16" />
        </button>
      </div>

      <div className="nice-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-2.5 text-[13.5px] leading-relaxed ${
                m.from === 'me'
                  ? 'rounded-2xl rounded-br-md bg-ink text-cream'
                  : 'rounded-2xl rounded-bl-md border border-line bg-paper text-ink'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-line bg-paper px-4 pt-2 pb-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {sugerencias.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-line bg-cream px-2.5 py-1 text-[11.5px] text-stone transition hover:border-line-2 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Pregúntale algo a Juanita…"
            className="flex-1 rounded-full border border-line bg-cream px-3.5 py-2.5 text-[13px] outline-none focus:border-line-2"
          />
          <button
            type="submit"
            aria-label="Enviar"
            className="gloss-btn flex h-10 w-10 items-center justify-center rounded-full"
          >
            <Icon.Send width="14" height="14" />
          </button>
        </form>
      </div>
    </div>
  );
}
