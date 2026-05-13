import Link from 'next/link';

export function MarketplaceFooter() {
  const links: Array<[string, string]> = [
    ['Para salones', '/'],
    ['Marketplace', '/marketplace'],
    ['Precios', '/#planes'],
    ['Sobre', '/'],
    ['Aviso legal', '/legal'],
    ['Privacidad', '/privacidad'],
  ];

  return (
    <footer className="mt-16 px-6 pb-12 pt-12 border-t border-line">
      <div className="mx-auto max-w-[1200px] flex flex-col md:flex-row gap-6 items-start md:items-end justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <span
              className="w-7 h-7 rounded-full grid place-items-center"
              style={{ background: 'var(--ink)', color: 'var(--paper)' }}
            >
              <span className="font-serif-it text-[15px] leading-none translate-y-[-1px]">
                G
              </span>
            </span>
            <span className="text-[15px] tight font-medium text-ink">
              Gonper Studio
            </span>
          </div>
          <p className="mt-3 text-[13px] text-stone max-w-[320px] leading-relaxed">
            La recepcionista de salones que no descansa nunca. Reservas,
            recordatorios y agenda en una conversación.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-10 gap-y-2 text-[13px]">
          {links.map(([l, h]) => (
            <Link
              key={l}
              href={h}
              className="text-stone hover:text-ink transition"
            >
              {l}
            </Link>
          ))}
        </div>
      </div>
      <div className="mx-auto max-w-[1200px] mt-10 pt-6 border-t border-line/60 flex items-center justify-between text-[12px] text-stone/80">
        <span>© 2026 Gonper Studio · Hecho en Tenerife</span>
        <span>v1.0</span>
      </div>
    </footer>
  );
}
