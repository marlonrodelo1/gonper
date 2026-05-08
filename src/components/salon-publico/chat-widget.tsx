'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Icon } from './icons';

type SlotsUi = {
  kind: 'slots';
  servicio_id: string;
  servicio_nombre: string;
  fecha: string;
  timezone: string;
  slots: { iso: string; hora_local: string }[];
};

type ReservaOkUi = {
  kind: 'reserva_ok';
  cita_id: string;
  inicio_iso: string;
  servicio_nombre: string;
  profesional_nombre: string;
};

type ServiciosUi = {
  kind: 'servicios';
  servicios: { id: string; nombre: string; precio_eur: string; duracion_min: number }[];
};

type ChatUi = SlotsUi | ReservaOkUi | ServiciosUi;

type Mensaje = {
  id: string;
  direccion: 'in' | 'out';
  contenido: string;
  /** UI inline acoplada a este mensaje (slots, confirmación, etc.) */
  ui?: ChatUi[];
};

type Props = {
  slug: string;
  agenteNombre: string;
  agenteAvatar?: string;
};

const STORAGE_KEY = 'gestori_chat_session';

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

function formatFechaLegible(fechaIso: string): string {
  // fechaIso: YYYY-MM-DD
  try {
    const d = new Date(`${fechaIso}T12:00:00.000Z`);
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(d);
  } catch {
    return fechaIso;
  }
}

const AUTOCLOSE_SECONDS = 10;

export function ChatWidget({ slug, agenteNombre, agenteAvatar }: Props) {
  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [autocloseSecs, setAutocloseSecs] = useState<number | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const idCounter = useRef(0);

  /** Cierra el widget y borra la sesión para empezar limpia la próxima vez. */
  function cerrarYReiniciar() {
    setOpen(false);
    setMensajes([]);
    setHistoryLoaded(false);
    setAutocloseSecs(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
      const nuevo = genUUID();
      window.localStorage.setItem(STORAGE_KEY, nuevo);
      setSessionId(nuevo);
    }
  }

  // Si el último mensaje del bot trae una confirmación de reserva, iniciar
  // cuenta atrás para autoclose. Reset si el usuario manda otro mensaje.
  useEffect(() => {
    const ultimo = mensajes[mensajes.length - 1];
    const tieneReservaOk =
      ultimo?.direccion === 'out' &&
      ultimo.ui?.some((u) => u.kind === 'reserva_ok');
    if (tieneReservaOk && autocloseSecs === null) {
      setAutocloseSecs(AUTOCLOSE_SECONDS);
    } else if (!tieneReservaOk && autocloseSecs !== null) {
      // Si el usuario sigue interactuando tras la reserva, cancela el autoclose.
      setAutocloseSecs(null);
    }
  }, [mensajes, autocloseSecs]);

  // Tick del countdown cada 1s.
  useEffect(() => {
    if (autocloseSecs === null) return;
    if (autocloseSecs <= 0) {
      cerrarYReiniciar();
      return;
    }
    const t = setTimeout(() => setAutocloseSecs((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autocloseSecs]);

  function nextLocalId(prefix: string): string {
    idCounter.current += 1;
    return `${prefix}-${idCounter.current}`;
  }

  const inicial = (agenteNombre || '?').trim().charAt(0).toUpperCase();

  // Init sessionId desde localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let sid = window.localStorage.getItem(STORAGE_KEY);
    if (!sid) {
      sid = genUUID();
      window.localStorage.setItem(STORAGE_KEY, sid);
    }
    setSessionId(sid);
  }, []);

  useEffect(() => {
    if (!open || !sessionId || historyLoaded) return;
    let cancelado = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/public/chat/${encodeURIComponent(slug)}/history?session_id=${encodeURIComponent(sessionId)}`,
          { cache: 'no-store' },
        );
        if (res.ok) {
          const data = (await res.json()) as {
            mensajes: { id: string; direccion: 'in' | 'out'; contenido: string }[];
          };
          if (!cancelado && Array.isArray(data.mensajes)) {
            setMensajes(
              data.mensajes.map((m) => ({
                id: m.id,
                direccion: m.direccion,
                contenido: m.contenido,
              })),
            );
          }
        }
      } catch {
        // silenciar
      } finally {
        if (!cancelado) setHistoryLoaded(true);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [open, sessionId, historyLoaded, slug]);

  useEffect(() => {
    if (!open) return;
    const el = bodyRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [mensajes, isLoading, open]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  async function enviarTexto(texto: string) {
    if (!texto || isLoading || !sessionId) return;

    const localId = nextLocalId('local');
    setMensajes((prev) => [...prev, { id: localId, direccion: 'in', contenido: texto }]);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/public/chat/${encodeURIComponent(slug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: texto }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        const msg =
          res.status === 429
            ? 'Estás escribiendo demasiado rápido. Espera un momento e intenta de nuevo.'
            : (err as { error?: string }).error || 'No pude responderte ahora mismo.';
        setMensajes((prev) => [
          ...prev,
          { id: nextLocalId('err'), direccion: 'out', contenido: msg },
        ]);
      } else {
        const data = (await res.json()) as {
          reply: string;
          ui?: ChatUi[];
        };
        setMensajes((prev) => [
          ...prev,
          {
            id: nextLocalId('srv'),
            direccion: 'out',
            contenido: data.reply,
            ui: Array.isArray(data.ui) ? data.ui : undefined,
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

  /** Cuando el usuario pulsa una chip de slot: mandamos un mensaje natural
   * que el LLM entiende ("Quiero el día X a las HH:MM"). El LLM seguirá el flujo
   * pidiendo nombre/email/teléfono y cerrando con `reservar_cita_publica`. */
  function pulsarSlot(slot: { iso: string; hora_local: string }, ui: SlotsUi) {
    if (isLoading) return;
    const fechaLegible = formatFechaLegible(ui.fecha);
    const texto = `Quiero reservar el ${fechaLegible} a las ${slot.hora_local} (${ui.servicio_nombre}).`;
    void enviarTexto(texto);
  }

  if (!open) {
    return (
      <div className="fixed bottom-5 right-5 z-50">
        <span
          aria-hidden
          className="juanita-ping pointer-events-none absolute inset-0 rounded-full"
          style={{ backgroundColor: 'var(--gestori-accent)' }}
        />
        <button
          type="button"
          aria-label={`Abrir chat con ${agenteNombre}`}
          onClick={() => setOpen(true)}
          className="juanita-bubble relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-full text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: 'var(--gestori-accent)' }}
        >
          {agenteAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agenteAvatar}
              alt={agenteNombre}
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : (
            <Icon.Assistant className="h-6 w-6" />
          )}
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
      aria-label={`Chat con ${agenteNombre}`}
    >
      {/* Header */}
      <div
        className="flex items-center gap-3 border-b border-black/5 px-4 py-3"
        style={{ backgroundColor: 'var(--gestori-accent-blush, #FAEFEA)' }}
      >
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full font-semibold"
          style={{
            backgroundColor: 'var(--gestori-accent-soft)',
            color: 'var(--gestori-accent)',
          }}
        >
          {agenteAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={agenteAvatar}
              alt={agenteNombre}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            inicial
          )}
        </div>
        <div className="flex-1 leading-tight">
          <div className="text-sm font-semibold text-neutral-900">{agenteNombre}</div>
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
          onClick={() => {
            // Si la reserva ya se confirmó, cerrar limpia la sesión para
            // que la próxima visita empiece desde cero. Si no, solo
            // colapsa el widget (mantiene la conversación al reabrir).
            if (autocloseSecs !== null) {
              cerrarYReiniciar();
            } else {
              setOpen(false);
            }
          }}
          className="rounded-full p-1.5 text-neutral-500 transition hover:bg-black/5 hover:text-neutral-900"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
        {mensajes.length === 0 && !isLoading && (
          <div className="rounded-xl bg-white px-3 py-2 text-neutral-700 shadow-sm">
            Hola, soy {agenteNombre}. ¿En qué puedo ayudarte?
          </div>
        )}

        {mensajes.map((m) => (
          <div key={m.id} className="space-y-1.5">
            <div
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
                    ? { backgroundColor: 'var(--gestori-accent)' }
                    : undefined
                }
              >
                {m.contenido}
              </div>
            </div>

            {/* UI inline acoplada al mensaje del asistente */}
            {m.direccion === 'out' && m.ui && m.ui.length > 0 && (
              <div className="flex justify-start">
                <div className="flex w-[85%] flex-col gap-2">
                  {m.ui.map((ui, idx) => {
                    if (ui.kind === 'slots' && ui.slots.length > 0) {
                      // Mostramos máx. 12 slots para no saturar
                      const visibles = ui.slots.slice(0, 12);
                      return (
                        <div
                          key={idx}
                          className="rounded-2xl rounded-bl-sm bg-white p-2.5 shadow-sm"
                        >
                          <div className="mb-1.5 px-1 text-[11px] uppercase tracking-wider text-neutral-500">
                            {formatFechaLegible(ui.fecha)} · {ui.servicio_nombre}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {visibles.map((s) => (
                              <button
                                key={s.iso}
                                type="button"
                                onClick={() => pulsarSlot(s, ui)}
                                disabled={isLoading}
                                className="rounded-full border border-black/10 bg-neutral-50 px-3 py-1.5 text-[13px] font-medium tabular-nums text-neutral-800 transition hover:border-[color:var(--gestori-accent)] hover:bg-white hover:text-[color:var(--gestori-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {s.hora_local}
                              </button>
                            ))}
                          </div>
                          {ui.slots.length > visibles.length && (
                            <div className="mt-1.5 px-1 text-[11px] text-neutral-500">
                              +{ui.slots.length - visibles.length} huecos más, escríbeme una franja si quieres ver otras horas.
                            </div>
                          )}
                        </div>
                      );
                    }
                    if (ui.kind === 'reserva_ok') {
                      return (
                        <div
                          key={idx}
                          className="rounded-2xl rounded-bl-sm border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800 shadow-sm"
                        >
                          <div className="font-semibold">Cita confirmada</div>
                          <div className="opacity-90">
                            {ui.servicio_nombre} con {ui.profesional_nombre}
                          </div>
                          {autocloseSecs !== null && (
                            <div className="mt-2 flex items-center justify-between gap-2 border-t border-emerald-200/70 pt-2 text-[11.5px]">
                              <span className="text-emerald-700/80">
                                Cerrando en {autocloseSecs}s…
                              </span>
                              <button
                                type="button"
                                onClick={cerrarYReiniciar}
                                className="rounded-full bg-emerald-700 px-2.5 py-1 text-[11.5px] font-medium text-white transition hover:bg-emerald-800"
                              >
                                Cerrar ahora
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </div>
            )}
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
          style={{ backgroundColor: 'var(--gestori-accent)' }}
        >
          <Icon.Arrow className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
