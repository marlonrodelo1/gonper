'use client';

import { useState } from 'react';

export function CopyLinkButton({ link }: { link: string }) {
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
      {copied ? 'Copiado ✓' : 'Copiar enlace de reserva'}
    </button>
  );
}
