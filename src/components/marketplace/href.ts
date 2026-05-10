/**
 * Construye una URL de marketplace aplicando o reemplazando filtros.
 * Mantiene los demás params intactos. Si un valor llega vacío/null, se borra.
 */
export function buildMarketplaceHref(
  current: { categoria?: string; ciudad?: string; q?: string },
  patch: Partial<{ categoria: string | null; ciudad: string | null; q: string | null }>,
): string {
  const next: Record<string, string> = {};
  for (const [k, v] of Object.entries({ ...current, ...patch })) {
    if (typeof v === 'string' && v.trim().length > 0) next[k] = v.trim();
  }
  const qs = new URLSearchParams(next).toString();
  return qs.length > 0 ? `/marketplace?${qs}` : '/marketplace';
}

export type MarketplaceSearchParams = {
  categoria?: string;
  ciudad?: string;
  q?: string;
};
