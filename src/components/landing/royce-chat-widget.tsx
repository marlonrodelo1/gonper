'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

/**
 * Widget flotante de Royce para la landing y el marketplace.
 *
 * Reutiliza el patrón de `src/components/salon-publico/chat-widget.tsx`
 * (mismo styling con var(--gestori-accent), misma UX), pero simplificado:
 * Royce solo conversa y puede llamar a la tool `capturar_lead`. No reserva
 * citas, así que no hay UI inline de slots ni de "reserva confirmada".
 *
 * Props:
 *   - bienvenida: mensaje inicial mostrado al abrir el widget vacío.
 *     Lo provee el server (page.tsx hace fetch de la fila `agentes` de
 *     Royce y se lo pasa). Así, cuando edites el campo `bienvenida`
 *     desde el super-admin, la landing lo refleja en <60s (revalidate).
 */

type Mensaje = {
  id: string;
  direccion: 'in' | 'out';
  contenido: string;
};

type Props = {
  /** Texto del primer mensaje pre-cargado (de `agentes.bienvenida`). */
  bienvenida: string;
  /** Surface desde la que el visitante habla — afecta tono del agente. */
  surface?: 'landing' | 'marketplace';
};

const STORAGE_KEY = 'gestori_royce_session';
const AGENT_NAME = 'Royce';

function genUUID(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function RoyceChatWidget({ bienvenida, surface = 'landing' }: Props) {
  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const idCounter = useRef(0);

  function nextLocalId(prefix: string): string {
    idCounter.current += 1;
    return `${prefix}-${idCounter.current}`;
  }

  // Init sessionId desde localStorage (persiste entre páginas y visitas)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let sid = window.localStorage.getItem(STORAGE_KEY);
    if (!sid) {
      sid = genUUID();
      window.localStorage.setItem(STORAGE_KEY, sid);
    }
    setSessionId(sid);
  }, []);

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [mensajes, isLoading, open]);

  // Foco al input al abrir
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function enviarTexto(texto: string) {
    if (!texto || isLoading || !sessionId) return;

    const localId = nextLocalId('local');
    setMensajes((prev) => [
      ...prev,
      { id: localId, direccion: 'in', contenido: texto },
    ]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/public/chat/royce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: texto,
          surface,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          res.status === 429
            ? 'Estás escribiendo demasiado rápido. Espera un momento e intenta de nuevo.'
            : (err as { error?: string }).error ||
              'No pude responderte ahora mismo.';
        setMensajes((prev) => [
          ...prev,
          { id: nextLocalId('err'), direccion: 'out', contenido: msg },
        ]);
      } else {
        const data = (await res.json()) as { reply: string };
        setMensajes((prev) => [
          ...prev,
          {
            id: nextLocalId('srv'),
            direccion: 'out',
            contenido: data.reply,
          },
        ]);
      }
    } catch {
      setMensajes((prev) => [
        ...prev,
        {
          id: nextLocalId('err'),
          direccion: 'out',
          contenido: 'Hubo un problema de conexión. Inténtalo de nuevo.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    const texto = draft.trim();
    if (!texto) return;
    setDraft('');
    await enviarTexto(texto);
  }

  if (!open) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <span
          aria-hidden
          className="juanita-ping pointer-events-none absolute inset-0 rounded-full"
          style={{ backgroundColor: 'var(--gestori-accent, #C5562C)' }}
        />
        <button
          type="button"
          aria-label={`Abrir chat con ${AGENT_NAME}`}
          onClick={() => setOpen(true)}
          className="juanita-bubble relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: 'var(--gestori-accent, #C5562C)' }}
        >
          <span className="text-lg font-semibold">R</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl"
      style={{
        width: 'min(360px, calc(100vw - 2rem))',
        height: 'min(560px, 80vh)',
      }}
      role="dialog"
      aria-label={`Chat con ${AGENT_NAME}`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 border-b border-black/5 px-4 py-3"
        style={{
          backgroundColor: 'var(--gestori-accent-blush, #FAEFEA)',
        }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full font-semibold"
          style={{
            backgroundColor: 'var(--gestori-accent-soft, #F1D9CC)',
            color: 'var(--gestori-accent, #C5562C)',
          }}
        >
          R
        </div>
        <div className="flex-1 leading-tight">
          <div className="text-sm font-semibold text-neutral-900">
            {AGENT_NAME}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              en línea
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Cerrar chat"
          onClick={() => setOpen(false)}
          className="rounded-full p-1.5 text-neutral-500 transition hover:bg-black/5 hover:text-neutral-900"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div
        ref={bodyRef}
        className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-sm"
        style={{ backgroundColor: '#FBF8F4' }}
      >
        {/* Bienvenida estática (no se persiste como mensaje) */}
        {mensajes.length === 0 && !isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-white px-3 py-2 leading-snug text-neutral-800 shadow-sm">
              {bienvenida}
            </div>
          </div>
        )}

        {mensajes.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.direccion === 'in' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-snug shadow-sm ${
                m.direccion === 'in'
                  ? 'rounded-br-sm text-white'
                  : 'rounded-bl-sm bg-white text-neutral-800'
              }`}
              style={
                m.direccion === 'in'
                  ? { backgroundColor: 'var(--gestori-accent, #C5562C)' }
                  : undefined
              }
            >
              {m.contenido}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-white px-3 py-2 shadow-sm">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-neutral-400" />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <form
        onSubmit={enviar}
        className="flex items-center gap-2 border-t border-black/5 bg-white px-3 py-2.5"
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribe un mensaje…"
          maxLength={1000}
          disabled={isLoading || !sessionId}
          className="flex-1 rounded-full border border-black/10 bg-neutral-50 px-3.5 py-2 text-sm text-neutral-900 outline-none transition focus:border-black/20 focus:bg-white disabled:opacity-60"
        />
        <button
          type="submit"
          aria-label="Enviar"
          disabled={!draft.trim() || isLoading || !sessionId}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: 'var(--gestori-accent, #C5562C)' }}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </div>
  );
}
