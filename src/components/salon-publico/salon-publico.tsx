'use client';

import { useState } from 'react';
import { useReveal } from '@/lib/hooks/use-reveal';
import { TopNav } from './top-nav';
import { Hero } from './hero';
import { Promos } from './promos';
import { Servicios, type ServicioReal } from './servicios';
import { Galeria } from './galeria';
import { Equipo, type ProfReal } from './equipo';
import { Resenas } from './resenas';
import { Reserva } from './reserva';
import { Ubicacion, type HorarioSemana } from './ubicacion';
import { Footer } from './footer';
import { ChatWidget } from './chat-widget';
import type {
  GaleriaImagen,
  Promocion,
  Resena,
  Salon,
} from '@/lib/db/schema';

type Props = {
  salon: Salon;
  servicios: ServicioReal[];
  profesionales: ProfReal[];
  horariosSemana: HorarioSemana[];
  diasCerrados: number[];
  abierto: boolean;
  estadoTexto: string;
  tipoNegocioLabel: string;
  urlTelegram: string | null;
  horarioHoyTexto: string;
  diaActual: number;
  promociones: Promocion[];
  galeria: GaleriaImagen[];
  resenas: Resena[];
  resumenResenas: { rating: number; total: number } | null;
};

export function SalonPublico({
  salon,
  servicios,
  profesionales,
  horariosSemana,
  diasCerrados,
  abierto,
  estadoTexto,
  tipoNegocioLabel,
  urlTelegram,
  horarioHoyTexto,
  diaActual,
  promociones,
  galeria,
  resenas,
  resumenResenas,
}: Props) {
  useReveal();
  const [pickedServicio, setPickedServicio] = useState<string | null>(null);

  return (
    <>
      <TopNav salonNombre={salon.nombre} />
      <Hero
        salon={salon}
        abierto={abierto}
        estadoTexto={estadoTexto}
        tipoNegocioLabel={tipoNegocioLabel}
        urlTelegram={urlTelegram}
        agenteNombre={salon.agenteNombre}
        horarioHoyTexto={horarioHoyTexto}
        servicios={servicios}
      />
      <Promos agenteNombre={salon.agenteNombre} promociones={promociones} />
      <Servicios
        servicios={servicios}
        agenteNombre={salon.agenteNombre}
        onPick={setPickedServicio}
      />
      <Galeria galeria={galeria} />
      <Equipo profesionales={profesionales} />
      <Resenas resenas={resenas} resumen={resumenResenas} />
      <Reserva
        slug={salon.slug}
        servicios={servicios}
        profesionales={profesionales}
        timezone={salon.timezone}
        diasCerrados={diasCerrados}
        initialServicioId={pickedServicio}
      />
      <Ubicacion salon={salon} horariosSemana={horariosSemana} diaActual={diaActual} />
      <Footer salon={salon} />
      <ChatWidget slug={salon.slug} agenteNombre={salon.agenteNombre || 'Juanita'} />
    </>
  );
}
