import { notFound } from 'next/navigation';
import { and, asc, avg, count, desc, eq, gte, isNull, or, sql } from 'drizzle-orm';
import type { CSSProperties } from 'react';
import type { Metadata } from 'next';

import { db } from '@/lib/db';
import {
  galeriaImagenes,
  horarios,
  profesionales,
  promociones,
  resenas,
  salones,
  servicios,
} from '@/lib/db/schema';
import { SalonPublico } from '@/components/salon-publico/salon-publico';
import type { HorarioSemana } from '@/components/salon-publico/ubicacion';

const TIPO_NEGOCIO_LABEL: Record<string, string> = {
  barberia: 'Barbería',
  peluqueria: 'Peluquería',
  estetica: 'Centro de estética',
  manicura: 'Centro de uñas',
  otro: 'Salón',
};

const ACCENTS = {
  manicura: {
    accent: '#D88EA0',
    accent2: '#C77389',
    accentSoft: '#F3DEE3',
    accentBlush: '#FAEBEE',
  },
  barberia: {
    accent: '#C5562C',
    accent2: '#A8451F',
    accentSoft: '#F1D9CC',
    accentBlush: '#FAEFEA',
  },
  peluqueria: {
    accent: '#C58E2C',
    accent2: '#A6741F',
    accentSoft: '#F2E4C7',
    accentBlush: '#FBF6E8',
  },
  estetica: {
    accent: '#8B9D7A',
    accent2: '#6B7C5A',
    accentSoft: '#DDE3D3',
    accentBlush: '#EEF1E9',
  },
  otro: {
    accent: '#C5562C',
    accent2: '#A8451F',
    accentSoft: '#F1D9CC',
    accentBlush: '#FAEFEA',
  },
} as const;

function getDiaActualEnTz(tz: string): number {
  // 0=Dom..6=Sab
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short' });
  const w = fmt.format(new Date());
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[w] ?? new Date().getDay();
}

function minutosEnTz(tz: string): number {
  // minutos desde 00:00 en TZ del salón
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

function hhmmToMin(hhmmss: string): number {
  const [h, m] = hhmmss.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function nombreDiaCorto(d: number): string {
  return ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [salon] = await db
    .select({
      nombre: salones.nombre,
      direccion: salones.direccion,
      tipoNegocio: salones.tipoNegocio,
      bannerUrl: salones.bannerUrl,
    })
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salon) {
    return { title: 'Salón no encontrado · Gomper' };
  }

  const titulo = `${salon.nombre} · Reserva con Juanita`;
  const descripcion = `Te comparto mi negocio. Reserva en ${salon.nombre} 24/7 con Juanita${salon.direccion ? ' · ' + salon.direccion : ''}.`;
  const imagen = salon.bannerUrl ?? null;
  const url = `https://gestori.es/s/${slug}`;

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: titulo,
      description: descripcion,
      siteName: 'Gomper · gestori.es',
      locale: 'es_ES',
      images: imagen
        ? [
            {
              url: imagen,
              width: 1200,
              height: 630,
              alt: salon.nombre,
            },
          ]
        : [],
    },
    twitter: {
      card: imagen ? 'summary_large_image' : 'summary',
      title: titulo,
      description: descripcion,
      images: imagen ? [imagen] : [],
    },
  };
}

export default async function SalonPublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [salon] = await db
    .select()
    .from(salones)
    .where(eq(salones.slug, slug))
    .limit(1);

  if (!salon || !salon.activo) {
    notFound();
  }

  const [
    serviciosActivos,
    profesionalesActivos,
    tramosHorario,
    promocionesActivas,
    galeriaActiva,
    resenasAprobadas,
    resumenResenasRows,
  ] = await Promise.all([
    db
      .select({
        id: servicios.id,
        nombre: servicios.nombre,
        descripcion: servicios.descripcion,
        duracionMin: servicios.duracionMin,
        precioEur: servicios.precioEur,
        activo: servicios.activo,
      })
      .from(servicios)
      .where(and(eq(servicios.salonId, salon.id), eq(servicios.activo, true)))
      .orderBy(asc(servicios.orden), asc(servicios.createdAt)),
    db
      .select({
        id: profesionales.id,
        nombre: profesionales.nombre,
        fotoUrl: profesionales.fotoUrl,
        colorHex: profesionales.colorHex,
      })
      .from(profesionales)
      .where(
        and(eq(profesionales.salonId, salon.id), eq(profesionales.activo, true)),
      )
      .orderBy(asc(profesionales.orden), asc(profesionales.nombre)),
    db
      .select()
      .from(horarios)
      .where(eq(horarios.salonId, salon.id))
      .orderBy(asc(horarios.diaSemana), asc(horarios.inicio)),
    db
      .select()
      .from(promociones)
      .where(
        and(
          eq(promociones.salonId, salon.id),
          eq(promociones.activa, true),
          or(
            isNull(promociones.validaHasta),
            gte(promociones.validaHasta, sql`CURRENT_DATE`),
          ),
        ),
      )
      .orderBy(asc(promociones.orden), asc(promociones.createdAt))
      .limit(6),
    db
      .select()
      .from(galeriaImagenes)
      .where(
        and(
          eq(galeriaImagenes.salonId, salon.id),
          eq(galeriaImagenes.activa, true),
        ),
      )
      .orderBy(asc(galeriaImagenes.orden), asc(galeriaImagenes.createdAt))
      .limit(12),
    db
      .select()
      .from(resenas)
      .where(and(eq(resenas.salonId, salon.id), eq(resenas.aprobada, true)))
      .orderBy(desc(resenas.destacada), desc(resenas.fecha))
      .limit(12),
    db
      .select({
        rating: avg(resenas.rating),
        total: count(resenas.id),
      })
      .from(resenas)
      .where(and(eq(resenas.salonId, salon.id), eq(resenas.aprobada, true))),
  ]);

  const resumenRow = resumenResenasRows[0];
  const totalResenas = Number(resumenRow?.total ?? 0);
  const resumenResenas =
    totalResenas > 0
      ? {
          rating: Number(resumenRow?.rating ?? 0),
          total: totalResenas,
        }
      : null;

  const horarioPorDia: Record<number, { inicio: string; fin: string }[]> = {
    0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  };
  for (const t of tramosHorario) {
    horarioPorDia[t.diaSemana]?.push({
      inicio: t.inicio as string,
      fin: t.fin as string,
    });
  }

  const horariosSemana: HorarioSemana[] = [0, 1, 2, 3, 4, 5, 6].map((d) => ({
    dia: d,
    tramos: horarioPorDia[d] ?? [],
  }));

  const diasCerrados = horariosSemana
    .filter((h) => h.tramos.length === 0)
    .map((h) => h.dia);

  const tz = salon.timezone || 'Europe/Madrid';
  const diaActual = getDiaActualEnTz(tz);
  const ahoraMin = minutosEnTz(tz);

  // ¿Abierto ahora? + texto de estado
  const tramosHoy = horarioPorDia[diaActual] ?? [];
  let abierto = false;
  let cierraA: string | null = null;
  for (const t of tramosHoy) {
    if (ahoraMin >= hhmmToMin(t.inicio) && ahoraMin < hhmmToMin(t.fin)) {
      abierto = true;
      cierraA = t.fin.slice(0, 5);
      break;
    }
  }

  let estadoTexto: string;
  if (abierto && cierraA) {
    estadoTexto = `Cierra a las ${cierraA}`;
  } else {
    // Próxima apertura: hoy más tarde, o siguiente día con horario
    const proxHoy = tramosHoy.find((t) => hhmmToMin(t.inicio) > ahoraMin);
    if (proxHoy) {
      estadoTexto = `Abre a las ${proxHoy.inicio.slice(0, 5)}`;
    } else {
      let next: { dia: number; inicio: string } | null = null;
      for (let i = 1; i <= 7; i++) {
        const dd = (diaActual + i) % 7;
        const tt = horarioPorDia[dd]?.[0];
        if (tt) {
          next = { dia: dd, inicio: tt.inicio };
          break;
        }
      }
      estadoTexto = next
        ? `Abre ${nombreDiaCorto(next.dia)} ${next.inicio.slice(0, 5)}`
        : 'Cerrado';
    }
  }

  // Texto del horario de hoy
  const horarioHoyTexto =
    tramosHoy.length === 0
      ? 'Cerrado'
      : tramosHoy
          .map((t) => `${t.inicio.slice(0, 5)} – ${t.fin.slice(0, 5)}`)
          .join(' · ');

  const tipoNegocioLabel =
    TIPO_NEGOCIO_LABEL[salon.tipoNegocio] ?? salon.tipoNegocio;

  const urlTelegram = salon.telegramBotUsername
    ? `https://t.me/${salon.telegramBotUsername}?start=${salon.slug}`
    : null;

  const accent =
    ACCENTS[salon.tipoNegocio as keyof typeof ACCENTS] ?? ACCENTS.otro;

  const styleVars: CSSProperties = {
    ['--gomper-accent' as string]: accent.accent,
    ['--gomper-accent-2' as string]: accent.accent2,
    ['--gomper-accent-soft' as string]: accent.accentSoft,
    ['--gomper-accent-blush' as string]: accent.accentBlush,
  } as CSSProperties;

  return (
    <div style={styleVars} className="bg-cream text-ink min-h-screen">
      <SalonPublico
        salon={salon}
        servicios={serviciosActivos}
        profesionales={profesionalesActivos}
        horariosSemana={horariosSemana}
        diasCerrados={diasCerrados}
        abierto={abierto}
        estadoTexto={estadoTexto}
        tipoNegocioLabel={tipoNegocioLabel}
        urlTelegram={urlTelegram}
        horarioHoyTexto={horarioHoyTexto}
        diaActual={diaActual}
        promociones={promocionesActivas}
        galeria={galeriaActiva}
        resenas={resenasAprobadas}
        resumenResenas={resumenResenas}
      />
    </div>
  );
}
