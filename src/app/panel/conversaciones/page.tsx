import Link from 'next/link';
import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { tiempoRelativo } from '@/lib/format/tiempo-relativo';
import { Icon } from '../_components/icons';

type Canal = 'todos' | 'web' | 'telegram' | 'whatsapp';

type ConversacionRow = {
  id: string; // sessionId o clienteId
  tipo: 'web' | 'cliente';
  canal: 'web' | 'telegram' | 'whatsapp' | 'sms';
  nombre: string;
  ultimoMensaje: string;
  ultimaFecha: Date;
  total: number;
  telefono: string | null;
};

function inicial(nombre: string): string {
  const c = nombre.trim().charAt(0);
  return c ? c.toUpperCase() : '·';
}

function truncar(s: string, n: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

const TABS: Array<{ key: Canal; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'web', label: 'Web' },
  { key: 'telegram', label: 'Telegram' },
  { key: 'whatsapp', label: 'WhatsApp' },
];

export default async function ConversacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ canal?: string }>;
}) {
  const sp = await searchParams;
  const canalParam = (sp.canal ?? 'todos').toLowerCase();
  const canalActivo: Canal = (
    ['todos', 'web', 'telegram', 'whatsapp'].includes(canalParam)
      ? canalParam
      : 'todos'
  ) as Canal;

  const salon = (await getCurrentSalon()) as
    | { id: string; nombre: string }
    | null;

  if (!salon) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-6 text-center md:p-10">
          <h1 className="tight text-[24px] font-medium text-ink md:text-[28px]">
            Configura tu salón
          </h1>
          <p className="max-w-md text-[14px] text-stone">
            Aún no tienes un salón asociado a tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  // Conversaciones web (agrupadas por session_id)
  let conversacionesWeb: ConversacionRow[] = [];
  if (canalActivo === 'todos' || canalActivo === 'web') {
    const rowsWeb = await db.execute(sql`
      WITH agrupadas AS (
        SELECT
          session_id,
          MAX(created_at) AS ultima_fecha,
          COUNT(*) AS total,
          MAX(web_visitor_nombre) AS visitor_nombre,
          MAX(web_visitor_telefono) AS visitor_telefono
        FROM mensajes
        WHERE salon_id = ${salon.id}
          AND canal = 'web'
          AND session_id IS NOT NULL
        GROUP BY session_id
      ),
      ultimos AS (
        SELECT DISTINCT ON (m.session_id)
          m.session_id,
          m.contenido
        FROM mensajes m
        WHERE m.salon_id = ${salon.id}
          AND m.canal = 'web'
          AND m.session_id IS NOT NULL
        ORDER BY m.session_id, m.created_at DESC
      )
      SELECT
        a.session_id AS id,
        a.ultima_fecha,
        a.total,
        a.visitor_nombre,
        a.visitor_telefono,
        u.contenido AS ultimo_mensaje
      FROM agrupadas a
      LEFT JOIN ultimos u ON u.session_id = a.session_id
      ORDER BY a.ultima_fecha DESC
      LIMIT 50
    `);

    conversacionesWeb = (rowsWeb as unknown as Array<Record<string, unknown>>).map(
      (r) => ({
        id: String(r.id),
        tipo: 'web' as const,
        canal: 'web' as const,
        nombre:
          (r.visitor_nombre as string | null)?.trim() || 'Visitante anónimo',
        ultimoMensaje: (r.ultimo_mensaje as string | null) ?? '',
        ultimaFecha: new Date(r.ultima_fecha as string),
        total: Number(r.total ?? 0),
        telefono: (r.visitor_telefono as string | null) ?? null,
      }),
    );
  }

  // Conversaciones telegram/whatsapp (agrupadas por cliente_id)
  let conversacionesCliente: ConversacionRow[] = [];
  if (canalActivo !== 'web') {
    const filtroCanal =
      canalActivo === 'telegram'
        ? sql`AND m.canal = 'telegram'`
        : canalActivo === 'whatsapp'
          ? sql`AND m.canal = 'whatsapp'`
          : sql`AND m.canal IN ('telegram','whatsapp','sms')`;

    const rowsCli = await db.execute(sql`
      WITH agrupadas AS (
        SELECT
          m.cliente_id,
          MAX(m.created_at) AS ultima_fecha,
          COUNT(*) AS total
        FROM mensajes m
        WHERE m.salon_id = ${salon.id}
          AND m.cliente_id IS NOT NULL
          ${filtroCanal}
        GROUP BY m.cliente_id
      ),
      ultimos AS (
        SELECT DISTINCT ON (m.cliente_id)
          m.cliente_id,
          m.contenido,
          m.canal
        FROM mensajes m
        WHERE m.salon_id = ${salon.id}
          AND m.cliente_id IS NOT NULL
          ${filtroCanal}
        ORDER BY m.cliente_id, m.created_at DESC
      )
      SELECT
        a.cliente_id AS id,
        a.ultima_fecha,
        a.total,
        u.contenido AS ultimo_mensaje,
        u.canal AS canal,
        c.nombre AS cliente_nombre,
        c.telefono AS cliente_telefono
      FROM agrupadas a
      LEFT JOIN ultimos u ON u.cliente_id = a.cliente_id
      LEFT JOIN clientes c ON c.id = a.cliente_id
      ORDER BY a.ultima_fecha DESC
      LIMIT 50
    `);

    conversacionesCliente = (
      rowsCli as unknown as Array<Record<string, unknown>>
    ).map((r) => ({
      id: String(r.id),
      tipo: 'cliente' as const,
      canal: ((r.canal as string) ?? 'telegram') as ConversacionRow['canal'],
      nombre: (r.cliente_nombre as string | null) ?? 'Cliente sin nombre',
      ultimoMensaje: (r.ultimo_mensaje as string | null) ?? '',
      ultimaFecha: new Date(r.ultima_fecha as string),
      total: Number(r.total ?? 0),
      telefono: (r.cliente_telefono as string | null) ?? null,
    }));
  }

  const todas = [...conversacionesWeb, ...conversacionesCliente]
    .sort((a, b) => b.ultimaFecha.getTime() - a.ultimaFecha.getTime())
    .slice(0, 50);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-col items-start gap-1">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Operación
        </p>
        <h1 className="tight mt-1 text-[22px] font-medium text-ink md:text-[28px]">
          Conversaciones{' '}
          <span className="font-serif-it text-stone/70">
            del agente con tus clientes
          </span>
        </h1>
      </header>

      {/* Tabs filtro canal */}
      <form action="/panel/conversaciones" method="GET" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = t.key === canalActivo;
          return (
            <button
              key={t.key}
              type="submit"
              name="canal"
              value={t.key}
              className={`tight rounded-full border px-4 py-1.5 text-[13px] font-medium transition ${
                active
                  ? 'border-ink bg-ink text-cream'
                  : 'border-line bg-paper text-stone hover:border-line-2 hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </form>

      {todas.length === 0 ? (
        <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center">
          <h2 className="tight text-[18px] font-medium text-ink">
            Aún no hay conversaciones
          </h2>
          <p className="max-w-md text-[13.5px] text-stone">
            Cuando tu agente reciba mensajes en Telegram o el chat web, las
            verás aquí.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <div className="grid min-w-[680px] grid-cols-[44px_1fr_120px_100px_60px] items-center gap-3 border-b border-line bg-cream/40 px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-stone/70">
            <div />
            <div>Conversación</div>
            <div>Canal</div>
            <div className="text-right">Cuándo</div>
            <div className="text-right">Mensajes</div>
          </div>
          <div className="min-w-[680px] divide-y divide-line/70">
            {todas.map((c) => {
              const href = `/panel/conversaciones/${encodeURIComponent(c.id)}`;
              const canalLabel =
                c.canal === 'web'
                  ? 'Chat web'
                  : c.canal === 'telegram'
                    ? 'Telegram'
                    : c.canal === 'whatsapp'
                      ? 'WhatsApp'
                      : 'SMS';
              const canalStyle =
                c.canal === 'web'
                  ? {
                      background: 'rgba(60,110,170,0.12)',
                      color: '#1F4E80',
                    }
                  : {
                      background: 'rgba(177,72,72,0.12)',
                      color: '#7C2E2E',
                    };
              return (
                <Link
                  key={`${c.tipo}-${c.id}`}
                  href={href}
                  className="grid grid-cols-[44px_1fr_120px_100px_60px] items-center gap-3 border-l-2 border-l-transparent px-5 py-3.5 transition hover:border-l-terracotta hover:bg-paper/60"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-cream-2 text-[13px] font-medium text-ink/80">
                    {c.canal === 'web' && !c.nombre.startsWith('Visitante') ? (
                      inicial(c.nombre)
                    ) : c.canal === 'web' ? (
                      <Icon.Web width="16" height="16" />
                    ) : c.canal === 'telegram' ? (
                      <Icon.Tg width="16" height="16" />
                    ) : (
                      inicial(c.nombre)
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="tight truncate text-[14.5px] font-medium text-ink">
                      {c.nombre}
                    </div>
                    <div className="truncate text-[12.5px] text-stone">
                      {truncar(c.ultimoMensaje, 90) || '—'}
                    </div>
                  </div>
                  <div>
                    <span
                      className="inline-block rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={canalStyle}
                    >
                      {canalLabel}
                    </span>
                  </div>
                  <div className="text-right text-[12px] text-stone">
                    {tiempoRelativo(c.ultimaFecha)}
                  </div>
                  <div className="text-right">
                    <span className="inline-block rounded-full bg-paper px-2 py-0.5 font-mono text-[11px] text-stone">
                      {c.total}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
          </div>
        </div>
      )}
    </div>
  );
}
