import type { CSSProperties } from 'react';

export type GestoriLogoProps = {
  /** Tamaño del wordmark "Gonper Studio" en px (default 32). El resto escala proporcionalmente. */
  size?: number;
  /** Texto bajo el wordmark. Por defecto "Studio". null = sin tag (versión wordmark puro). */
  tag?: string | null;
  /** Color principal del wordmark. Default: currentColor (hereda). */
  color?: string;
  /** Color del punto sello. Default: terracotta. */
  accent?: string;
  /** Color del tag. Default: 60% del color principal. */
  tagColor?: string;
  className?: string;
  style?: CSSProperties;
  /** Si true, oculta para lectores de pantalla (decorativo). */
  ariaHidden?: boolean;
};

/**
 * Logo principal de Gonper Studio.
 *  Diseño: Wordmark "Gonper Studio" en Playfair Display (peso 500) + punto sello
 *  terracotta + tag opcional debajo en sans con tracking ancho.
 *
 *  Uso típico:
 *    <GestoriLogo size={32} />              // Header del panel
 *    <GestoriLogo size={56} tag="Salones" /> // Hero de la web pública
 *    <GestoriLogo size={20} tag={null} />   // Inline en footers
 */
export function GestoriLogo({
  size = 32,
  tag = 'Studio',
  color,
  accent = '#C5562C',
  tagColor,
  className,
  style,
  ariaHidden,
}: GestoriLogoProps) {
  // Tag bajo el wordmark: tamaño 18% del wordmark, mínimo 9px.
  const tagSize = Math.max(9, Math.round(size * 0.18));
  const dotSize = Math.max(3, Math.round(size * 0.1));

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        lineHeight: 1,
        color,
        ...style,
      }}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : 'Gonper Studio'}
    >
      <span
        className="font-playfair"
        style={{
          position: 'relative',
          fontSize: size,
          fontWeight: 500,
          letterSpacing: '-0.015em',
          paddingRight: dotSize + 6,
          color: 'inherit',
        }}
      >
        Gonper Studio
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: 0,
            bottom: Math.round(size * 0.12),
            width: dotSize,
            height: dotSize,
            borderRadius: '50%',
            background: accent,
          }}
        />
      </span>
      {tag ? (
        <span
          style={{
            marginTop: Math.max(2, Math.round(size * 0.1)),
            fontFamily:
              'var(--font-geist-sans), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: tagSize,
            fontWeight: 500,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            color: tagColor ?? 'rgba(107,99,86,0.9)',
          }}
        >
          {tag}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Marca compacta: "G" en círculo con gradiente terracota. Para favicons,
 * avatares de bot, brand mark pequeño en sidebars y headers.
 */
export function GestoriMark({
  size = 32,
  color = '#FBF8F2',
  background,
  borderColor,
  className,
  style,
}: {
  size?: number;
  /** Color de la 'G'. Default: cream. */
  color?: string;
  /** Fondo. Default: gradiente terracota. */
  background?: string;
  borderColor?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const bg =
    background ??
    'linear-gradient(135deg, #C5562C 0%, #A8451F 100%)';
  return (
    <span
      className={className}
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        border: borderColor ? `1.5px solid ${borderColor}` : 'none',
        color,
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.25), 0 4px 12px -4px rgba(168,69,31,0.4)',
        ...style,
      }}
      aria-hidden="true"
    >
      <span
        className="font-playfair"
        style={{
          fontSize: Math.round(size * 0.62),
          fontWeight: 600,
          lineHeight: 1,
          transform: `translateY(-${Math.round(size * 0.03)}px)`,
          letterSpacing: '-0.02em',
        }}
      >
        G
      </span>
    </span>
  );
}
