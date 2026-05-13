import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { CompartirCliente } from './compartir-cliente';

type CurrentSalon = {
  id: string;
  nombre: string;
  slug: string;
} | null;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gonperstudio.shop';

export default async function CompartirPage() {
  const salon = (await getCurrentSalon()) as CurrentSalon;

  if (!salon) {
    return (
      <div className="px-4 py-8 md:px-8 md:py-12">
        <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-6 text-center md:p-10">
          <h1 className="tight text-[24px] font-medium text-ink md:text-[28px]">
            Configura tu salón
          </h1>
          <p className="max-w-md text-[14px] text-stone">
            Aún no tienes un salón asociado a tu cuenta.
          </p>
        </div>
      </div>
    );
  }

  const publicUrl = `${SITE_URL}/s/${salon.slug}`;
  const qrUrl = `/api/v1/qr?text=${encodeURIComponent(publicUrl)}&size=512`;
  const qrUrlHighRes = `/api/v1/qr?text=${encodeURIComponent(publicUrl)}&size=1024`;

  return (
    <div className="flex flex-col gap-6 px-4 py-6 md:px-8">
      <header className="flex flex-col items-start gap-2">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Web del salón
        </p>
        <h1 className="tight text-[22px] font-medium text-ink md:text-[28px]">
          Compartir tu tienda{' '}
          <span className="font-serif-it text-stone/70">
            · llena tu agenda
          </span>
        </h1>
        <p className="max-w-2xl text-[14px] text-stone">
          Comparte tu link público con clientes por WhatsApp, email o redes
          sociales. Cualquiera con el link reserva en 30 segundos. Pega el QR
          en tu mostrador o escaparate.
        </p>
      </header>

      <CompartirCliente
        salonNombre={salon.nombre}
        salonSlug={salon.slug}
        publicUrl={publicUrl}
        qrUrl={qrUrl}
        qrUrlHighRes={qrUrlHighRes}
      />
    </div>
  );
}
