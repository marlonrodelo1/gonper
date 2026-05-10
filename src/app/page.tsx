import { eq } from 'drizzle-orm';

import { Landing } from '@/components/landing/landing';
import { db } from '@/lib/db';
import { agentes } from '@/lib/db/schema';

/**
 * La landing es estática salvo por la `bienvenida` de Royce, que el dueño
 * puede editar desde el super admin. La revalidamos cada 60s para alinear
 * con el cache HTTP del endpoint `/api/v1/agentes/royce/config`.
 */
export const revalidate = 60;

const ROYCE_BIENVENIDA_FALLBACK =
  '¡Hola! Soy Royce, el agente de Gestori. Cuéntame, ¿qué tipo de negocio llevas?';

async function getRoyceBienvenida(): Promise<string> {
  try {
    const [row] = await db
      .select({ bienvenida: agentes.bienvenida, activo: agentes.activo })
      .from(agentes)
      .where(eq(agentes.slug, 'royce'))
      .limit(1);
    if (!row || !row.activo || !row.bienvenida) {
      return ROYCE_BIENVENIDA_FALLBACK;
    }
    return row.bienvenida;
  } catch {
    return ROYCE_BIENVENIDA_FALLBACK;
  }
}

export default async function Home() {
  const royceBienvenida = await getRoyceBienvenida();
  return <Landing royceBienvenida={royceBienvenida} />;
}
