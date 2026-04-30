import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

/**
 * Set de iconos inline para la landing. Sin librerías externas (lucide etc.).
 * Reflejan exactamente los SVG del prototipo Landing.html.
 */
export const Icon = {
  Telegram: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M21.5 4.5L18.4 19.2c-.2 1-.9 1.3-1.8.8l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1L18 6.4c.4-.4-.1-.6-.6-.2L7.5 12.6 3.4 11.3c-.9-.3-.9-.9.2-1.3L20.4 3.4c.7-.3 1.4.2 1.1 1.1z"
        fill="currentColor"
      />
    </svg>
  ),
  Whatsapp: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" {...p}>
      <path
        d="M12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.2-1.3C8.7 21.5 10.3 22 12 22c5.5 0 10-4.5 10-10S17.5 2 12 2zm5.5 14.2c-.2.6-1.2 1.2-1.7 1.3-.4.1-1 .1-1.6-.1-.4-.1-.9-.3-1.5-.6-2.6-1.1-4.3-3.7-4.4-3.9-.1-.1-1.1-1.4-1.1-2.7 0-1.3.7-1.9.9-2.2.2-.2.5-.3.7-.3h.5c.2 0 .4 0 .6.4.2.5.7 1.7.7 1.8 0 .1.1.2 0 .4l-.3.4-.3.4c-.1.1-.2.2-.1.4.1.2.6 1 1.3 1.6.9.8 1.7 1.1 1.9 1.2.2.1.3.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.6.8c.2.1.3.2.4.3.1.1.1.5-.1 1z"
        fill="currentColor"
      />
    </svg>
  ),
  Star: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l2.9 6.3 6.9.6-5.2 4.7 1.6 6.8L12 17l-6.2 3.4 1.6-6.8L2.2 8.9l6.9-.6L12 2z" />
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <polyline points="4 12 10 18 20 6" />
    </svg>
  ),
  Arrow: (p: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  ),
  Plus: (p: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      {...p}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Scissors: (p: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  ),
  Calendar: (p: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  ),
  Sparkle: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2zm6 12l.8 2.4L21 17l-2.2.6L18 20l-.8-2.4L15 17l2.2-.6L18 14z" />
    </svg>
  ),
  Phone: (p: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.13 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.94.36 1.85.7 2.71a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.37-1.27a2 2 0 0 1 2.11-.45c.86.34 1.77.57 2.71.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  Bell: (p: IconProps) => (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...p}
    >
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
  Logo: (p: IconProps) => (
    <svg viewBox="0 0 32 32" fill="none" {...p}>
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M11 16c0-2.8 2.2-5 5-5s5 2.2 5 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="16" cy="19" r="1.6" fill="currentColor" />
    </svg>
  ),
};

export type IconKey = keyof typeof Icon;
