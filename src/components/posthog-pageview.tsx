'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

async function trackPageview(path: string): Promise<void> {
  try {
    await fetch('/api/_track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: '$pageview', properties: { path } }),
      keepalive: true,
    });
  } catch {
    // silencioso — tracking no debe romper la UX
  }
}

/**
 * Componente cliente que dispara un evento `$pageview` cada vez que cambia
 * el `pathname`. Renderiza `null`. Insertar una sola vez en el root layout.
 */
export function PosthogPageview(): null {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    void trackPageview(pathname);
  }, [pathname]);

  return null;
}

export default PosthogPageview;
