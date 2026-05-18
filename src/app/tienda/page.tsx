import type { Metadata } from 'next';

import { FarmasiIframe } from '@/components/farmasi/farmasi-iframe';

const FARMASI_USERNAME = 'gonperstudio';

export const metadata: Metadata = {
  title: 'Tienda Farmasi · Gonper Studio',
  description:
    'Cosmética premium Farmasi · Maquillaje, skincare Dr. C. Tuna, perfumes y bienestar Nutriplus.',
  alternates: { canonical: 'https://gonperstudio.shop/tienda' },
  // El contenido vive en farmasi.es — no queremos que Google indexe la
  // página wrapper como si fuera contenido propio.
  robots: { index: false, follow: true },
};

/**
 * Tienda Farmasi de Gonper Studio embebida vía iframe. El cliente
 * navega y compra sin salir de gonperstudio.shop. La barra superior
 * permite volver a la landing o abrir Farmasi en una pestaña aparte.
 */
export default function TiendaPage() {
  return <FarmasiIframe username={FARMASI_USERNAME} titulo="Gonper Studio" />;
}
