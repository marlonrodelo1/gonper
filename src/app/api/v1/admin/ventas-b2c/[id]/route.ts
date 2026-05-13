import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  marcas,
  productos,
  salones,
  ventasB2c,
  ventasB2cItems,
} from '@/lib/db/schema';
import { requireApiToken } from '@/lib/api/auth';

/**
 * GET /api/v1/admin/ventas-b2c/[id]
 *
 * Devuelve el detalle de una venta B2C con items + datos del salón + marca
 * de cada item. Consumido por el workflow n8n "Venta B2C nueva" para
 * componer los 3 emails (cliente, salón, Marlon).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authError = requireApiToken(req);
  if (authError) return authError;

  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const [row] = await db
    .select({
      id: ventasB2c.id,
      numero: ventasB2c.numero,
      clienteEmail: ventasB2c.clienteEmail,
      clienteNombre: ventasB2c.clienteNombre,
      clienteTelefono: ventasB2c.clienteTelefono,
      totalEur: ventasB2c.totalEur,
      comisionGestoriEur: ventasB2c.comisionGestoriEur,
      comisionSalonEur: ventasB2c.comisionSalonEur,
      costeMarcaEur: ventasB2c.costeMarcaEur,
      direccionEnvio: ventasB2c.direccionEnvio,
      estado: ventasB2c.estado,
      pagadoAt: ventasB2c.pagadoAt,
      salonId: salones.id,
      salonNombre: salones.nombre,
      salonSlug: salones.slug,
      salonEmail: salones.email,
      salonDireccion: salones.direccion,
      salonCiudad: salones.ciudad,
    })
    .from(ventasB2c)
    .innerJoin(salones, eq(salones.id, ventasB2c.salonId))
    .where(eq(ventasB2c.id, id))
    .limit(1);

  if (!row) return NextResponse.json({ error: 'no_existe' }, { status: 404 });

  const items = await db
    .select({
      productoId: ventasB2cItems.productoId,
      nombreSnapshot: ventasB2cItems.nombreSnapshot,
      imagenSnapshot: ventasB2cItems.imagenSnapshot,
      cantidad: ventasB2cItems.cantidad,
      precioUnitEur: ventasB2cItems.precioUnitEur,
      subtotalEur: ventasB2cItems.subtotalEur,
      productoSku: productos.sku,
      costeMayoristaEur: productos.costeMayoristaEur,
      marcaId: marcas.id,
      marcaNombre: marcas.nombre,
      marcaSlug: marcas.slug,
      marcaContactoEmail: marcas.contactoEmail,
    })
    .from(ventasB2cItems)
    .innerJoin(productos, eq(productos.id, ventasB2cItems.productoId))
    .leftJoin(marcas, eq(marcas.id, productos.marcaId))
    .where(eq(ventasB2cItems.ventaId, id));

  return NextResponse.json({
    venta: {
      id: row.id,
      numero: row.numero,
      cliente_email: row.clienteEmail,
      cliente_nombre: row.clienteNombre,
      cliente_telefono: row.clienteTelefono,
      total_eur: row.totalEur,
      comision_gestori_eur: row.comisionGestoriEur,
      comision_salon_eur: row.comisionSalonEur,
      coste_marca_eur: row.costeMarcaEur,
      direccion_envio: row.direccionEnvio,
      estado: row.estado,
      pagado_at: row.pagadoAt,
      salon_id: row.salonId,
      salon_nombre: row.salonNombre,
      salon_slug: row.salonSlug,
      salon_email: row.salonEmail,
      salon_direccion: row.salonDireccion,
      salon_ciudad: row.salonCiudad,
      items: items.map((it) => ({
        producto_id: it.productoId,
        producto_sku: it.productoSku,
        nombre_snapshot: it.nombreSnapshot,
        imagen_snapshot: it.imagenSnapshot,
        cantidad: it.cantidad,
        precio_unit_eur: it.precioUnitEur,
        subtotal_eur: it.subtotalEur,
        coste_mayorista_eur: it.costeMayoristaEur,
        marca_id: it.marcaId,
        marca_nombre: it.marcaNombre,
        marca_slug: it.marcaSlug,
        marca_contacto_email: it.marcaContactoEmail,
      })),
    },
  });
}

export const dynamic = 'force-dynamic';
