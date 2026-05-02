'use client';

import { useState } from 'react';

type Props = {
  link: string;
  label?: string;
  copiedLabel?: string;
};

/**
 * Botón genérico para copiar al portapapeles. Lo usamos tanto para enlaces
 * de reserva (`t.me/...?start=...`) como para comandos de vinculación
 * (`/start CODIGO`).
 */
export function CopyLinkButton({
  link,
  label = 'Copiar',
  copiedLabel = 'Copiado',
}: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // fallback silencioso
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="card-tight tight px-4 py-2.5 text-[13px] text-ink transition hover:bg-cream"
    >
      {copied ? `${copiedLabel} ✓` : label}
    </button>
  );
}
