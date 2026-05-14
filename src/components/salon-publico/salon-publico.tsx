'use client';

import { useState } from 'react';
import { useReveal } from '@/lib/hooks/use-reveal';
import { TopNav } from './top-nav';
import { Hero } from './hero';
import { ProductosDestacados } from './productos-destacados';
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
  ComparativaAntesDespues,
  GaleriaImagen,
  Promocion,
  Resena,
  Salon,
} from '@/lib/db/schema';
import type { ProductoDestacado } from '@/lib/tienda/query';

type Props = {
  salon: Salon;
  servicios: ServicioReal[];
  profesionales: ProfReal[];
  horariosSemana: HorarioSemana[];
  diasCerrados: number[];
  abierto: boolean;
  estadoTexto: string;
  tipoNegocioLabel: string;
  horarioHoyTexto: string;
  diaActual: number;
  promociones: Promocion[];
  galeria: GaleriaImagen[];
  comparativas: ComparativaAntesDespues[];
  resenas: Resena[];
  resumenResenas: { rating: number; total: number } | null;
  tieneTienda: boolean;
  productosDestacados: ProductoDestacado[];
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
  horarioHoyTexto,
  diaActual,
  promociones,
  galeria,
  comparativas,
  resenas,
  resumenResenas,
  tieneTienda,
  productosDestacados,
}: Props) {
  useReveal();
  const [pickedServicio, setPickedServicio] = useState<string | null>(null);

  return (
    <>
      <TopNav salonNombre={salon.nombre} logoUrl={salon.logoUrl} />
      <Hero
        salon={salon}
        abierto={abierto}
        estadoTexto={estadoTexto}
        tipoNegocioLabel={tipoNegocioLabel}
        horarioHoyTexto={horarioHoyTexto}
        servicios={servicios}
        tieneTienda={tieneTienda}
      />
      {tieneTienda && (
        <ProductosDestacados
          salonSlug={salon.slug}
          productos={productosDestacados}
        />
      )}
      <Promos agenteNombre={salon.agenteNombre} promociones={promociones} />
      <Servicios
        servicios={servicios}
        agenteNombre={salon.agenteNombre}
        onPick={setPickedServicio}
      />
      <Galeria galeria={galeria} comparativas={comparativas} />
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
      <ChatWidget
        slug={salon.slug}
        agenteNombre={salon.agenteNombre || 'Juanita'}
        agenteAvatar={salon.agenteAvatarUrl ?? undefined}
      />
    </>
  );
}
