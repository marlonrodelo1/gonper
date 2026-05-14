import { eq } from 'drizzle-orm';

import { Landing } from '@/components/landing/landing';
import { db } from '@/lib/db';
import { agentes } from '@/lib/db/schema';
import { listMarcasPublicas } from '@/lib/marcas/query';

/**
 * La landing es estática salvo por la `bienvenida` de Royce, que el dueño
 * puede editar desde el super admin. La revalidamos cada 60s para alinear
 * con el cache HTTP del endpoint `/api/v1/agentes/royce/config`.
 */
export const revalidate = 60;

const ROYCE_BIENVENIDA_FALLBACK =
  '¡Hola! Soy Royce, el agente de Gonper Studio. Cuéntame, ¿qué tipo de negocio llevas?';

async function getRoyceConfig(): Promise<{
  bienvenida: string;
  avatarUrl: string | null;
}> {
  try {
    const [row] = await db
      .select({
        bienvenida: agentes.bienvenida,
        avatarUrl: agentes.avatarUrl,
        activo: agentes.activo,
      })
      .from(agentes)
      .where(eq(agentes.slug, 'royce'))
      .limit(1);
    if (!row || !row.activo) {
      return { bienvenida: ROYCE_BIENVENIDA_FALLBACK, avatarUrl: null };
    }
    return {
      bienvenida: row.bienvenida ?? ROYCE_BIENVENIDA_FALLBACK,
      avatarUrl: row.avatarUrl ?? null,
    };
  } catch {
    return { bienvenida: ROYCE_BIENVENIDA_FALLBACK, avatarUrl: null };
  }
}

export default async function Home() {
  const [royce, marcas] = await Promise.all([
    getRoyceConfig(),
    listMarcasPublicas().catch(() => []),
  ]);
  return (
    <Landing
      royceBienvenida={royce.bienvenida}
      royceAvatarUrl={royce.avatarUrl}
      marcas={marcas}
    />
  );
}
