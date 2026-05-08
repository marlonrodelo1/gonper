import { and, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  galeriaImagenes,
  horarios,
  profesionales,
  servicios,
} from '@/lib/db/schema';
import type { OnboardingStep } from '@/app/panel/_components/onboarding-checklist';

type SalonInput = {
  id: string;
  direccion?: string | null;
  telefono?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  agenteNombre?: string | null;
  telegramChatIdDueno?: string | null;
};

/**
 * Calcula el estado de los 7 pasos de onboarding del salón.
 * Cada paso es "done = true" cuando se cumple la condición mínima.
 */
export async function computeOnboardingSteps(
  salon: SalonInput,
): Promise<OnboardingStep[]> {
  const [serviciosCount, horariosCount, galeriaCount, profesionalesCount] =
    await Promise.all([
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(servicios)
        .where(and(eq(servicios.salonId, salon.id), eq(servicios.activo, true)))
        .then((r) => r[0]?.n ?? 0),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(horarios)
        .where(eq(horarios.salonId, salon.id))
        .then((r) => r[0]?.n ?? 0),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(galeriaImagenes)
        .where(
          and(
            eq(galeriaImagenes.salonId, salon.id),
            eq(galeriaImagenes.activa, true),
          ),
        )
        .then((r) => r[0]?.n ?? 0),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(profesionales)
        .where(
          and(
            eq(profesionales.salonId, salon.id),
            eq(profesionales.activo, true),
          ),
        )
        .then((r) => r[0]?.n ?? 0),
    ]);

  const tieneDireccion = !!salon.direccion?.trim();
  const tieneTelefono = !!salon.telefono?.trim();
  const tieneLogo = !!salon.logoUrl?.trim();
  const tieneBanner = !!salon.bannerUrl?.trim();
  const tieneAgenteNombre = !!salon.agenteNombre?.trim();
  const tieneBotVinculado = !!salon.telegramChatIdDueno?.trim();

  return [
    {
      id: 'datos',
      label: 'Datos del salón',
      hint: 'Dirección y teléfono para tus clientes.',
      href: '/panel/config',
      done: tieneDireccion && tieneTelefono,
    },
    {
      id: 'servicios',
      label: 'Servicios',
      hint:
        serviciosCount > 0
          ? `${serviciosCount} servicio${serviciosCount === 1 ? '' : 's'} activo${serviciosCount === 1 ? '' : 's'}.`
          : 'Añade al menos un servicio.',
      href: '/panel/servicios',
      done: serviciosCount > 0,
    },
    {
      id: 'horario',
      label: 'Horario semanal',
      hint:
        horariosCount > 0
          ? 'Horario configurado.'
          : 'Define qué días y horas trabajas.',
      href: '/panel/config/horario',
      done: horariosCount > 0,
    },
    {
      id: 'galeria',
      label: 'Galería',
      hint:
        galeriaCount > 0
          ? `${galeriaCount} imagen${galeriaCount === 1 ? '' : 'es'} en la web.`
          : 'Sube fotos para tu web pública.',
      href: '/panel/galeria',
      done: galeriaCount > 0,
    },
    {
      id: 'identidad',
      label: 'Identidad visual',
      hint: 'Logo y portada para la web pública.',
      href: '/panel/config/web',
      done: tieneLogo && tieneBanner,
    },
    {
      id: 'equipo',
      label: 'Equipo',
      hint:
        profesionalesCount > 0
          ? `${profesionalesCount} profesional${profesionalesCount === 1 ? '' : 'es'} en plantilla.`
          : 'Añade al menos un profesional.',
      href: '/panel/config/equipo',
      done: profesionalesCount > 0,
    },
    {
      id: 'asistente',
      label: 'Asistente y bot',
      hint:
        tieneAgenteNombre && tieneBotVinculado
          ? 'Listo: agente personalizado y bot vinculado.'
          : !tieneAgenteNombre
            ? 'Pon nombre y tono a tu asistente.'
            : 'Vincula tu Telegram al bot del salón.',
      href: tieneAgenteNombre ? '/panel/config/bot' : '/panel/config/agente',
      done: tieneAgenteNombre && tieneBotVinculado,
    },
  ];
}
