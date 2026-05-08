import { ImageResponse } from 'next/og';

// Edge runtime falla en el container Dokploy (502 Bad Gateway). Con
// nodejs runtime funciona y next/og sigue generando la imagen sin
// problema en build/runtime.
export const runtime = 'nodejs';

export const alt = 'Gestori — Lleva tu negocio desde tu móvil';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Imagen Open Graph que verán Telegram, WhatsApp, Twitter, LinkedIn,
// etc. al compartir https://gestori.es. Generada dinámicamente con
// el branding (cream + ink + terracotta) y sin necesidad de un PNG
// estático en /public.
export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 80px',
          background: '#FBF6EE',
          fontFamily: 'serif',
          color: '#1A1815',
          position: 'relative',
        }}
      >
        {/* Acento terracota arriba-izquierda */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 360,
            height: 8,
            background: '#C8703F',
          }}
        />

        {/* Header — marca */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'linear-gradient(135deg, #C8703F 0%, #A8451F 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FBF6EE',
              fontSize: 32,
              fontWeight: 700,
              fontFamily: 'sans-serif',
            }}
          >
            G
          </div>
          <div
            style={{
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: '-0.5px',
            }}
          >
            Gestori
          </div>
          <div
            style={{
              marginLeft: 8,
              padding: '4px 10px',
              borderRadius: 999,
              background: '#1A18150D',
              fontSize: 14,
              fontFamily: 'sans-serif',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#1A1815AA',
            }}
          >
            Beta
          </div>
        </div>

        {/* Titular principal */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              gap: '0 18px',
              fontSize: 88,
              fontWeight: 500,
              lineHeight: 1.05,
              letterSpacing: '-2px',
            }}
          >
            <span>Lleva tu negocio</span>
            <span style={{ display: 'flex', gap: '0 18px' }}>
              <span>desde tu</span>
              <span style={{ fontStyle: 'italic', color: '#C8703F' }}>
                móvil.
              </span>
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: 28,
              lineHeight: 1.4,
              color: '#5C5247',
              fontFamily: 'sans-serif',
              maxWidth: 880,
            }}
          >
            El asistente IA que gestiona tu salón desde Telegram. Reservas,
            recordatorios y números a un mensaje de distancia.
          </div>
        </div>

        {/* Footer — features */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
            fontSize: 20,
            fontFamily: 'sans-serif',
            color: '#1A1815',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: '#8B9D7A',
              }}
            />
            30 días gratis
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: '#8B9D7A',
              }}
            />
            Sin tarjeta
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: '#8B9D7A',
              }}
            />
            Cancela cuando quieras
          </div>
          <div
            style={{
              marginLeft: 'auto',
              fontSize: 18,
              color: '#5C5247',
              letterSpacing: '0.1em',
            }}
          >
            gestori.es
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
