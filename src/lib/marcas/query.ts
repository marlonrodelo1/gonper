import 'server-only';
import { desc, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { marcas } from '@/lib/db/schema';

export type MarcaPublica = {
  slug: string;
  nombre: string;
  descripcion: string | null;
  logoUrl: string | null;
};

/**
 * Lista de marcas activas para mostrar públicamente en la landing.
 * Solo expone campos seguros (nada de % comisión ni contacto).
 */
export async function listMarcasPublicas(): Promise<MarcaPublica[]> {
  const rows = await db
    .select({
      slug: marcas.slug,
      nombre: marcas.nombre,
      descripcion: marcas.descripcion,
      logoUrl: marcas.logoUrl,
    })
    .from(marcas)
    .where(eq(marcas.activa, true))
    .orderBy(desc(marcas.createdAt));

  return rows;
}
