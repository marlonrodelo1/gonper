'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from './icons';

type Mensaje = { from: 'pro' | 'me'; text: string };

const sugerencias = [
  '¿Cuántas citas tengo hoy?',
  '¿Quiénes son mis top 3 clientes?',
  '¿Quién tiene más no-shows?',
];

export type JuanitaProProps = {
  mensajeInicial: string;
};

export function JuanitaPro({ mensajeInicial }: JuanitaProProps) {
  const [msgs, setMsgs] = useState<Mensaje[]>([
    { from: 'pro', text: mensajeInicial },
  ]);
  const [draft, setDraft] = useState('');
  const [enviando, setEnviando] = useState(false);
  const sessionIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  const send = async (txt: string) => {
    const limpio = txt.trim();
    if (!limpio || enviando) return;

    setMsgs((m) => [...m, { from: 'me', text: limpio }]);
    setDraft('');
    setEnviando(true);

    try {
      const res = await fetch('/api/v1/juanita-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: limpio,
          session_id: sessionIdRef.current ?? undefined,
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | { reply?: string; session_id?: string; error?: string }
        | null;

      if (!res.ok) {
        const errText =
          data?.error ?? 'No pude contactar con el asistente. Inténtalo otra vez.';
        setMsgs((m) => [...m, { from: 'pro', text: errText }]);
        return;
      }

      if (data?.session_id) sessionIdRef.current = data.session_id;
      setMsgs((m) => [
        ...m,
        { from: 'pro', text: data?.reply ?? '…' },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        {
          from: 'pro',
          text: 'Se cortó la conexión. Vuelve a intentarlo.',
        },
      ]);
    } finally {
      setEnviando(false);
    }
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
              {enviando ? 'pensando…' : 'en línea'}
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

      <div
        ref={scrollRef}
        className="nice-scroll flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-5"
      >
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap px-4 py-2.5 text-[13.5px] leading-relaxed ${
                m.from === 'me'
                  ? 'rounded-2xl rounded-br-md bg-ink text-cream'
                  : 'rounded-2xl rounded-bl-md border border-line bg-paper text-ink'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {enviando && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-line bg-paper px-4 py-2.5 text-[13.5px] text-stone">
              …
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-line bg-paper px-4 pt-2 pb-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {sugerencias.map((s) => (
            <button
              key={s}
              type="button"
              disabled={enviando}
              onClick={() => send(s)}
              className="rounded-full border border-line bg-cream px-2.5 py-1 text-[11.5px] text-stone transition hover:border-line-2 hover:text-ink disabled:opacity-50"
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
            disabled={enviando}
            className="flex-1 rounded-full border border-line bg-cream px-3.5 py-2.5 text-[13px] outline-none focus:border-line-2 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={enviando || !draft.trim()}
            aria-label="Enviar"
            className="gloss-btn flex h-10 w-10 items-center justify-center rounded-full disabled:opacity-50"
          >
            <Icon.Send width="14" height="14" />
          </button>
        </form>
      </div>
    </div>
  );
}
