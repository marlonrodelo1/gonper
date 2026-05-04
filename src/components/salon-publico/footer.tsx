import Link from 'next/link';
import { Icon } from './icons';
import type { Salon } from '@/lib/db/schema';

type Props = { salon: Salon };

export function Footer({ salon }: Props) {
  return (
    <footer className="py-12 px-6 border-t border-line bg-cream">
      <div className="mx-auto max-w-[1200px] flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span
            className="w-7 h-7 rounded-full grid place-items-center"
            style={{ background: 'var(--gomper-accent-soft)' }}
          >
            <Icon.Sparkle width="13" height="13" className="text-gomper-accent" />
          </span>
          <span className="text-[14px] tight font-medium text-ink">{salon.nombre}</span>
        </div>
        <div className="text-[12px] text-stone flex items-center gap-4 flex-wrap justify-center">
          <a href="#" className="hover:text-ink transition">
            Aviso legal
          </a>
          <a href="#" className="hover:text-ink transition">
            Privacidad
          </a>
          <span className="text-stone/40">·</span>
          <span className="flex items-center gap-1.5">
            Reservas con
            <Link
              href="/"
              className="text-ink font-medium hover:text-gomper-accent transition flex items-center gap-1"
            >
              <Icon.Logo width="13" height="13" /> Gonper
            </Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
