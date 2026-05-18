import type { Metadata } from 'next';
import Link from 'next/link';

const FARMASI_TIENDA_URL = 'https://www.farmasi.es/gonperstudio';
const FARMASI_REGISTRO_URL =
  'https://www.farmasi.es/gonperstudio/register/beautyinfluencer';

export const metadata: Metadata = {
  title: 'Farmasi · Marlon Rodelo · Beauty Influencer España',
  description:
    'Compra cosmética Farmasi en mi tienda online. Maquillaje, skincare y bienestar con asesoría personal. Únete a mi red como Beauty Influencer.',
  alternates: { canonical: 'https://gonperstudio.shop/farmasi' },
  openGraph: {
    type: 'website',
    url: 'https://gonperstudio.shop/farmasi',
    title: 'Farmasi · Marlon Rodelo',
    description:
      'Tu Beauty Influencer Farmasi de confianza en España. Compra directo o únete a mi red.',
    siteName: 'Gonper Studio',
    locale: 'es_ES',
  },
};

export default function FarmasiLandingPage() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <section className="relative px-6 pb-16 pt-24 sm:pt-32">
        <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="pill" style={{ background: 'rgba(197,86,44,0.10)', color: '#A8451F' }}>
            <span className="pill-dot" style={{ background: '#C5562C' }} />
            Beauty Influencer oficial
          </span>
          <h1 className="tight text-[36px] font-medium leading-tight text-ink sm:text-[52px]">
            Hola, soy Marlon.
            <br />
            <span className="font-serif-it text-stone/80">
              tu Beauty Influencer Farmasi
            </span>
          </h1>
          <p className="max-w-xl text-[15.5px] leading-relaxed text-stone">
            Cosmética premium, maquillaje y bienestar Farmasi seleccionados por
            mí. Compra directo en mi tienda online o únete a mi red y empieza
            tu propio negocio de belleza.
          </p>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <a
              href={FARMASI_TIENDA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="gloss-btn tight inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[14px] font-medium"
            >
              Comprar en mi tienda Farmasi
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17L17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </a>
            <a
              href={FARMASI_REGISTRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="tight inline-flex items-center justify-center gap-2 rounded-full border border-line bg-paper px-7 py-3.5 text-[14px] font-medium text-ink transition hover:bg-cream"
            >
              Únete a mi red
            </a>
          </div>
          <p className="text-[12.5px] text-stone/70">
            Registro gratuito · Comisiones de hasta el 50%
          </p>
        </div>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-3">
          <article className="card p-6">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Compras al instante
            </span>
            <h2 className="tight mt-2 text-[18px] font-medium text-ink">
              Tu tienda Farmasi
            </h2>
            <p className="mt-2 text-[13.5px] text-stone">
              Más de 2.000 productos: maquillaje, skincare Dr. C. Tuna,
              perfumes y bienestar Nutriplus. Pago seguro en Farmasi.es.
            </p>
            <a
              href={FARMASI_TIENDA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="tight mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-terracotta hover:text-terracotta-2"
            >
              Ver catálogo →
            </a>
          </article>

          <article className="card p-6">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Tu negocio
            </span>
            <h2 className="tight mt-2 text-[18px] font-medium text-ink">
              Únete a mi red
            </h2>
            <p className="mt-2 text-[13.5px] text-stone">
              Regístrate como Beauty Influencer bajo mi sponsor y empieza a
              vender con 30-50% de comisión directa. Te acompaño desde el día
              uno.
            </p>
            <a
              href={FARMASI_REGISTRO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="tight mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-terracotta hover:text-terracotta-2"
            >
              Empezar registro →
            </a>
          </article>

          <article className="card p-6">
            <span className="text-[11px] uppercase tracking-[0.22em] text-stone/70">
              Si tienes un salón
            </span>
            <h2 className="tight mt-2 text-[18px] font-medium text-ink">
              Gonper Studio
            </h2>
            <p className="mt-2 text-[13.5px] text-stone">
              También llevo el SaaS de gestión para salones de belleza:
              agenda, agente conversacional y web profesional.
            </p>
            <Link
              href="/"
              className="tight mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-terracotta hover:text-terracotta-2"
            >
              Conoce Gonper →
            </Link>
          </article>
        </div>
      </section>

      <footer className="border-t border-line px-6 py-10 text-center text-[12.5px] text-stone">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3">
          <p className="font-medium text-ink">Marlon Rodelo</p>
          <p>
            Beauty Influencer Farmasi · Fundador de{' '}
            <Link href="/" className="text-terracotta hover:text-terracotta-2">
              Gonper Studio
            </Link>{' '}
            · Tenerife
          </p>
          <p className="text-[11px] text-stone/60">
            Página de afiliación oficial. Las compras se procesan en Farmasi.es.
          </p>
        </div>
      </footer>
    </main>
  );
}
