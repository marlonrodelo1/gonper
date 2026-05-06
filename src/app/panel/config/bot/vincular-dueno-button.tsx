'use client';

import { useState } from 'react';

export function VincularDuenoButton() {
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } catch {
      setError('Error de red. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  if (link) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-[13.5px] text-ink/85">
          Pulsa el botón. Se abrirá Telegram en tu móvil con el bot, y al darle a
          <strong className="text-ink"> Iniciar</strong> quedarás vinculado como dueño.
        </p>
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="accent-btn tight inline-flex items-center justify-center rounded-full px-5 py-3 text-[14px] font-medium"
        >
          📱 Abrir Telegram y vincularme
        </a>
        <p className="text-[12px] text-stone">
          Este enlace caduca en 15 minutos. Si no se vincula, recarga la página y genera otro.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={generar}
        disabled={loading}
        className="gloss-btn tight inline-flex items-center justify-center rounded-full px-5 py-3 text-[14px] font-medium disabled:opacity-60"
      >
        {loading ? 'Generando enlace…' : 'Generar enlace de vinculación'}
      </button>
      {error ? (
        <p className="text-[12.5px] text-[#7C2E2E]">{error}</p>
      ) : (
        <p className="text-[12px] text-stone">
          Crea un enlace personalizado válido 15 minutos. Pulsándolo desde tu móvil, Telegram te
          identifica como dueño automáticamente.
        </p>
      )}
    </div>
  );
}
