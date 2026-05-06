'use client';

import { useState } from 'react';

export function VincularDuenoButton() {
  const [link, setLink] = useState<string | null>(null);
  const [comando, setComando] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  async function generar() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/admin/vinculacion/generar', {
        method: 'POST',
        cache: 'no-store',
      });
      const data = (await res.json().catch(() => ({}))) as {
        link?: string;
        error?: string;
      };
      if (!res.ok || !data.link) {
        setError(data.error || 'No se pudo generar el enlace');
        return;
      }
      setLink(data.link);
      // Construir el comando equivalente para el caso fallback
      const startParam = data.link.split('start=')[1] ?? '';
      setComando(`/start ${startParam}`);
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  async function copiarComando() {
    if (!comando) return;
    try {
      await navigator.clipboard.writeText(comando);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // fallback silencioso
    }
  }

  if (!link || !comando) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={generar}
          disabled={loading}
          className="gloss-btn tight inline-flex items-center justify-center rounded-full px-5 py-3 text-[14px] font-medium disabled:opacity-60"
        >
          {loading ? 'Generando…' : 'Vincularme como dueño'}
        </button>
        {error ? (
          <p className="text-[12.5px] text-[#7C2E2E]">{error}</p>
        ) : (
          <p className="text-[12px] text-stone">
            Genera un enlace personalizado válido 15 minutos. Pulsándolo, Telegram te identifica
            como dueño automáticamente.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="accent-btn tight inline-flex items-center justify-center rounded-full px-5 py-3 text-[14px] font-medium"
      >
        📱 Abrir Telegram y vincularme
      </a>

      <details className="rounded-2xl border border-line bg-paper px-4 py-3 text-[13px] text-stone">
        <summary className="cursor-pointer select-none text-ink">
          ¿No te aparece el botón &quot;Iniciar&quot; en Telegram?
        </summary>
        <div className="mt-3 flex flex-col gap-2.5">
          <p className="text-[12.5px]">
            Si ya tienes el bot abierto, copia este comando y pégalo como mensaje en el chat:
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="grow rounded-lg bg-cream-2 px-2.5 py-1.5 font-mono text-[11.5px] text-ink break-all">
              {comando}
            </code>
            <button
              type="button"
              onClick={copiarComando}
              className="tight rounded-full border border-line bg-paper px-3 py-1.5 text-[12px] font-medium text-ink transition hover:bg-cream"
            >
              {copiado ? '✓ Copiado' : 'Copiar'}
            </button>
          </div>
        </div>
      </details>

      <p className="text-[11.5px] text-stone/80">
        El enlace caduca en 15 minutos. Si no se vincula, recarga y genera otro.
      </p>
    </div>
  );
}
