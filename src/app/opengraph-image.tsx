import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';

export const alt = 'Gestori — Lleva tu negocio desde tu móvil';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Imagen Open Graph minimalista que imita el logo de marca: fondo
// cream, "Gestori" en serif gigante color stone/violeta y slogan corto
// debajo. Sin badges ni gráficos complementarios para que respire.
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '64px 80px',
          background: '#FDF8EE',
          fontFamily: 'serif',
          color: '#5E4F58',
          position: 'relative',
        }}
      >
        {/* Línea acento terracota arriba */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: 6,
            background: '#C8703F',
          }}
        />

        {/* Gestori + estrellas decorativas en la misma línea */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
          }}
        >
          <div
            style={{
              fontSize: 220,
              fontWeight: 500,
              letterSpacing: '-6px',
              lineHeight: 1,
              color: '#5E4F58',
            }}
          >
            Gestori
          </div>
          {/* Estrellas tipo destellos */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              marginTop: -40,
              color: '#5E4F58',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 0 L13.5 9 22 12 13.5 14.5 12 24 10.5 14.5 2 12 10.5 9 Z" />
            </svg>
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ marginLeft: 28 }}
            >
              <path d="M12 0 L13.5 9 22 12 13.5 14.5 12 24 10.5 14.5 2 12 10.5 9 Z" />
            </svg>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
              style={{ marginLeft: 6 }}
            >
              <path d="M12 0 L13.5 9 22 12 13.5 14.5 12 24 10.5 14.5 2 12 10.5 9 Z" />
            </svg>
          </div>
        </div>

        {/* Slogan */}
        <div
          style={{
            display: 'flex',
            marginTop: 32,
            fontSize: 36,
            fontFamily: 'serif',
            fontStyle: 'italic',
            color: '#8B7B85',
            letterSpacing: '0.5px',
          }}
        >
          Lleva tu negocio desde tu móvil
        </div>

        {/* Footer minimal */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            fontSize: 18,
            fontFamily: 'sans-serif',
            color: '#A89B95',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
          }}
        >
          <span>30 días gratis</span>
          <span>·</span>
          <span>sin tarjeta</span>
          <span>·</span>
          <span>gestori.es</span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
