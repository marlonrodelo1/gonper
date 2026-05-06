import type { Metadata } from 'next';
import { RespuestaCitaPage } from '@/components/citas/respuesta-cita-page';

export const metadata: Metadata = {
  title: 'Confirmar cita',
  robots: { index: false, follow: false },
};

export default async function ConfirmarCitaPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <RespuestaCitaPage token={token} esperada="confirmar" />;
}
