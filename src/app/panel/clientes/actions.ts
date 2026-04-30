'use server';

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { db } from '@/lib/db';
import { clientes } from '@/lib/db/schema';
import { getCurrentSalon } from '@/lib/supabase/get-current-salon';

function s(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function bool(formData: FormData, key: string): boolean {
  const v = formData.get(key);
  return v === 'on' || v === 'true' || v === '1';
}

async function requireSalonId(): Promise<string> {
  const salon = (await getCurrentSalon()) as { id: string } | null;
  if (!salon) throw new Error('Sin salón asociado');
  return salon.id;
}

export async function crearCliente(formData: FormData) {
  const salonId = await requireSalonId();

  const nombre = s(formData, 'nombre');
  if (!nombre) {
    redirect('/panel/clientes/nuevo?error=' + encodeURIComponent('El nombre es obligatorio'));
  }

  let nuevoId: string;
  try {
    const [inserted] = await db
      .insert(clientes)
      .values({
        salonId,
        nombre: nombre!,
        telefono: s(formData, 'telefono'),
        email: s(formData, 'email'),
        telegramUsername: s(formData, 'telegramUsername'),
        whatsappPhone: s(formData, 'whatsappPhone'),
        notasPrivadas: s(formData, 'notasPrivadas'),
        requiereDeposito: bool(formData, 'requiereDeposito'),
      })
      .returning({ id: clientes.id });
    nuevoId = inserted.id;
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirect('/panel/clientes/nuevo?error=' + encodeURIComponent(msg));
  }

  revalidatePath('/panel/clientes');
  redirect(`/panel/clientes/${nuevoId}`);
}

export async function actualizarCliente(id: string, formData: FormData) {
  const salonId = await requireSalonId();

  const nombre = s(formData, 'nombre');
  if (!nombre) {
    redirect(`/panel/clientes/${id}/editar?error=` + encodeURIComponent('El nombre es obligatorio'));
  }

  try {
    const result = await db
      .update(clientes)
      .set({
        nombre: nombre!,
        telefono: s(formData, 'telefono'),
        email: s(formData, 'email'),
        telegramUsername: s(formData, 'telegramUsername'),
        whatsappPhone: s(formData, 'whatsappPhone'),
        notasPrivadas: s(formData, 'notasPrivadas'),
        requiereDeposito: bool(formData, 'requiereDeposito'),
        updatedAt: new Date(),
      })
      .where(and(eq(clientes.id, id), eq(clientes.salonId, salonId)))
      .returning({ id: clientes.id });

    if (result.length === 0) {
      redirect('/panel/clientes?error=' + encodeURIComponent('Cliente no encontrado'));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    redirect(`/panel/clientes/${id}/editar?error=` + encodeURIComponent(msg));
  }

  revalidatePath('/panel/clientes');
  revalidatePath(`/panel/clientes/${id}`);
  redirect(`/panel/clientes/${id}`);
}

export async function eliminarCliente(id: string) {
  const salonId = await requireSalonId();

  try {
    const result = await db
      .delete(clientes)
      .where(and(eq(clientes.id, id), eq(clientes.salonId, salonId)))
      .returning({ id: clientes.id });

    if (result.length === 0) {
      redirect('/panel/clientes?error=' + encodeURIComponent('Cliente no encontrado'));
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message.toLowerCase() : '';
    if (
      msg.includes('foreign key') ||
      msg.includes('violates') ||
      msg.includes('restrict') ||
      msg.includes('citas_cliente')
    ) {
      redirect(
        `/panel/clientes/${id}?error=` +
          encodeURIComponent(
            'No se puede eliminar: tiene citas asociadas. Considera marcarlo como inactivo o limpia su historial primero.',
          ),
      );
    }
    redirect(`/panel/clientes/${id}?error=` + encodeURIComponent('Error al eliminar el cliente'));
  }

  revalidatePath('/panel/clientes');
  redirect('/panel/clientes');
}

export async function toggleRequiereDeposito(id: string) {
  const salonId = await requireSalonId();

  const [actual] = await db
    .select({ requiereDeposito: clientes.requiereDeposito })
    .from(clientes)
    .where(and(eq(clientes.id, id), eq(clientes.salonId, salonId)))
    .limit(1);

  if (!actual) return;

  await db
    .update(clientes)
    .set({
      requiereDeposito: !actual.requiereDeposito,
      updatedAt: new Date(),
    })
    .where(and(eq(clientes.id, id), eq(clientes.salonId, salonId)));

  revalidatePath('/panel/clientes');
  revalidatePath(`/panel/clientes/${id}`);
}
