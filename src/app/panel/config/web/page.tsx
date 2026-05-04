import Image from 'next/image';

import { getCurrentSalon } from '@/lib/supabase/get-current-salon';
import { Icon } from '@/app/panel/_components/icons';

import { eliminarAssetSalon, subirAssetSalon } from './actions';

type SalonRow = {
  id: string;
  slug: string;
  nombre: string;
  logo_url?: string | null;
  logoUrl?: string | null;
  banner_url?: string | null;
  bannerUrl?: string | null;
};

const labelClass =
  'text-[11px] uppercase tracking-[0.2em] text-stone/80';

export default async function ConfigWebPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const params = await searchParams;
  const salon = (await getCurrentSalon()) as SalonRow | null;

  if (!salon) {
    return (
      <div className="card mx-auto flex max-w-2xl flex-col items-center gap-3 p-10 text-center">
        <h2 className="tight text-[22px] font-medium text-ink">
          Configura tu salón
        </h2>
        <p className="text-[14px] text-stone">
          Aún no tienes un salón asociado a tu cuenta.
        </p>
      </div>
    );
  }

  const logoUrl = salon.logo_url ?? salon.logoUrl ?? null;
  const bannerUrl = salon.banner_url ?? salon.bannerUrl ?? null;

  return (
    <div className="flex w-full flex-col gap-5">
      {params.ok ? (
        <div className="flex items-center gap-2 rounded-xl border border-sage/40 bg-sage-soft px-4 py-3 text-[13px] text-sage-deep">
          <Icon.Check width="14" height="14" />
          Cambios guardados correctamente.
        </div>
      ) : null}
      {params.error ? (
        <div
          className="rounded-xl border bg-[#F1D6D6] px-4 py-3 text-[13px] text-[#7C2E2E]"
          style={{ borderColor: 'rgba(177,72,72,0.4)' }}
        >
          {params.error}
        </div>
      ) : null}

      <header className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
          Branding
        </span>
        <h2 className="tight text-[20px] font-medium text-ink">
          Logo y banner del salón
        </h2>
        <p className="text-[13px] text-stone">
          Aparecerán en tu web pública{' '}
          <span className="font-mono text-ink">gestori.es/{salon.slug}</span> y
          al compartir el enlace por WhatsApp, Telegram o redes.
        </p>
      </header>

      {/* ====== LOGO ====== */}
      <section className="card flex flex-col gap-5 p-5 md:p-7">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Paso 1
            </span>
            <h3 className="tight mt-0.5 text-[17px] font-medium text-ink">
              Logo del salón
            </h3>
            <p className="mt-0.5 text-[12.5px] text-stone">
              Cuadrado, mínimo 256×256 px. Máximo 2 MB. JPG, PNG, WEBP o AVIF.
            </p>
          </div>
          {logoUrl ? (
            <span
              className="pill"
              style={{ background: 'rgba(139,157,122,0.15)', color: '#5A6B4D' }}
            >
              <span className="pill-dot" style={{ background: '#8B9D7A' }} />
              Activo
            </span>
          ) : (
            <span
              className="pill"
              style={{ background: 'rgba(107,99,86,0.10)', color: '#6B6356' }}
            >
              <span className="pill-dot" style={{ background: '#8A8174' }} />
              Sin configurar
            </span>
          )}
        </header>

        {logoUrl ? (
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="relative h-24 w-24 overflow-hidden rounded-2xl border border-line bg-cream-2"
            >
              <Image
                src={logoUrl}
                alt={`Logo de ${salon.nombre}`}
                fill
                sizes="96px"
                className="object-cover"
                unoptimized
              />
            </div>
            <a
              href={logoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[12.5px] text-terracotta hover:text-terracotta-2"
            >
              Ver original →
            </a>
          </div>
        ) : null}

        <form
          action={subirAssetSalon}
          className="flex flex-col gap-3"
          encType="multipart/form-data"
        >
          <input type="hidden" name="tipo" value="logo" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="logo_file" className={labelClass}>
              {logoUrl ? 'Reemplazar logo' : 'Subir logo'}
            </label>
            <input
              id="logo_file"
              name="archivo"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
              required
              className="block w-full cursor-pointer rounded-2xl border border-line bg-paper px-4 py-3 text-[13.5px] text-ink file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-1.5 file:text-[12px] file:font-medium file:text-cream hover:file:opacity-90"
            />
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {logoUrl ? (
              <button
                type="submit"
                formAction={eliminarAssetSalon}
                className="tight rounded-full border border-line bg-paper px-5 py-2.5 text-[13px] font-medium text-ink hover:bg-cream"
              >
                Quitar logo
              </button>
            ) : null}
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium"
            >
              {logoUrl ? 'Reemplazar' : 'Subir logo'}
            </button>
          </div>
        </form>
      </section>

      {/* ====== BANNER ====== */}
      <section className="card flex flex-col gap-5 p-5 md:p-7">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Paso 2
            </span>
            <h3 className="tight mt-0.5 text-[17px] font-medium text-ink">
              Banner del salón
            </h3>
            <p className="mt-0.5 text-[12.5px] text-stone">
              Imagen ancha que verán los clientes al entrar y al compartir el
              link. <strong className="text-ink">Recomendado: 1200×630 px</strong>{' '}
              (proporción 1.91:1). Máximo 5 MB. JPG, PNG, WEBP o AVIF.
            </p>
          </div>
          {bannerUrl ? (
            <span
              className="pill"
              style={{ background: 'rgba(139,157,122,0.15)', color: '#5A6B4D' }}
            >
              <span className="pill-dot" style={{ background: '#8B9D7A' }} />
              Activo
            </span>
          ) : (
            <span
              className="pill"
              style={{ background: 'rgba(107,99,86,0.10)', color: '#6B6356' }}
            >
              <span className="pill-dot" style={{ background: '#8A8174' }} />
              Sin configurar
            </span>
          )}
        </header>

        {bannerUrl ? (
          <div className="flex flex-col gap-2">
            <div
              className="relative w-full overflow-hidden rounded-2xl border border-line bg-cream-2"
              style={{ aspectRatio: '1200 / 630' }}
            >
              <Image
                src={bannerUrl}
                alt={`Banner de ${salon.nombre}`}
                fill
                sizes="(max-width: 768px) 100vw, 800px"
                className="object-cover"
                unoptimized
              />
            </div>
            <a
              href={bannerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start text-[12.5px] text-terracotta hover:text-terracotta-2"
            >
              Ver original →
            </a>
          </div>
        ) : null}

        <form
          action={subirAssetSalon}
          className="flex flex-col gap-3"
          encType="multipart/form-data"
        >
          <input type="hidden" name="tipo" value="banner" />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="banner_file" className={labelClass}>
              {bannerUrl ? 'Reemplazar banner' : 'Subir banner'}
            </label>
            <input
              id="banner_file"
              name="archivo"
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/avif"
              required
              className="block w-full cursor-pointer rounded-2xl border border-line bg-paper px-4 py-3 text-[13.5px] text-ink file:mr-3 file:rounded-full file:border-0 file:bg-ink file:px-4 file:py-1.5 file:text-[12px] file:font-medium file:text-cream hover:file:opacity-90"
            />
          </div>

          <div
            className="rounded-xl border px-4 py-3 text-[12px]"
            style={{
              borderColor: 'rgba(197,142,44,0.4)',
              background: 'rgba(197,142,44,0.10)',
              color: '#7A5A1B',
            }}
          >
            <strong>Tip:</strong> usa una foto del local, un primer plano del
            servicio estrella o un banner diseñado en Canva con el tamaño
            recomendado (1200×630 px). Será lo primero que vean tus clientes.
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            {bannerUrl ? (
              <button
                type="submit"
                formAction={eliminarAssetSalon}
                className="tight rounded-full border border-line bg-paper px-5 py-2.5 text-[13px] font-medium text-ink hover:bg-cream"
              >
                Quitar banner
              </button>
            ) : null}
            <button
              type="submit"
              className="gloss-btn tight rounded-full px-5 py-2.5 text-[13px] font-medium"
            >
              {bannerUrl ? 'Reemplazar' : 'Subir banner'}
            </button>
          </div>
        </form>
      </section>

      {/* ====== Vista previa al compartir ====== */}
      <section className="card flex flex-col gap-3 p-5 md:p-7">
        <header className="flex flex-col gap-0.5">
          <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
            Vista previa al compartir
          </span>
          <h3 className="tight text-[17px] font-medium text-ink">
            Así se verá tu link en WhatsApp / Telegram / redes
          </h3>
        </header>

        <div className="card-tight flex w-full max-w-md flex-col overflow-hidden p-0">
          <div
            className="relative w-full bg-cream-2"
            style={{ aspectRatio: '1200 / 630' }}
          >
            {bannerUrl ? (
              <Image
                src={bannerUrl}
                alt="Preview banner"
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[12px] text-stone/70">
                (sube un banner para previsualizar)
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 px-4 py-3">
            <span className="text-[11px] uppercase tracking-[0.18em] text-stone/60">
              gestori.es
            </span>
            <span className="tight truncate text-[14px] font-medium text-ink">
              {salon.nombre}
            </span>
            <span className="line-clamp-2 text-[12.5px] text-stone">
              Te comparto mi negocio · Reserva con Juanita 24/7.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
