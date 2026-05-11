import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { salones, usuariosSalon } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';
import {
  createOnboardingLink,
  ensureConnectAccount,
  syncConnectAccountStatus,
} from '@/lib/stripe/connect';

/**
 * POST /api/stripe/connect/onboard
 *
 * Inicia (o reinicia) el onboarding Stripe Connect Express del salón
 * del usuario autenticado. Crea la cuenta si no existe, genera un
 * AccountLink y devuelve la URL a la que el cliente debe redirigir.
 *
 * Auth: sesión Supabase (es el dueño del salón).
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Buscar el salón del usuario (rol dueño o admin)
  const [vinculo] = await db
    .select({
      salonId: salones.id,
      salonEmail: salones.email,
      salonNombre: salones.nombre,
    })
    .from(usuariosSalon)
    .innerJoin(salones, eq(salones.id, usuariosSalon.salonId))
    .where(eq(usuariosSalon.authUserId, user.id))
    .limit(1);

  if (!vinculo) {
    return NextResponse.json({ error: 'sin_salon' }, { status: 400 });
  }

  try {
    const { accountId } = await ensureConnectAccount({
      salonId: vinculo.salonId,
      salonEmail: vinculo.salonEmail,
      salonNombre: vinculo.salonNombre,
    });

    // Si por lo que sea Stripe ya nos dice que la cuenta está lista,
    // marcamos onboarded=true y no devolvemos link (no hace falta).
    const status = await syncConnectAccountStatus({ accountId });
    if (status.onboarded) {
      return NextResponse.json({ onboarded: true });
    }

    const { url } = await createOnboardingLink({ accountId });
    return NextResponse.json({ onboarded: false, url });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    console.error('[stripe/connect/onboard]', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
