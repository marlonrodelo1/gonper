import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

export const Icon = {
  Arrow: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  ),
  Check: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  Clock: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  ),
  Pin: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M12 21s-7-7.5-7-12a7 7 0 0114 0c0 4.5-7 12-7 12z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  ),
  Star: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l2.9 6.2 6.6.6-5 4.6 1.5 6.6L12 16.7 5.9 20l1.5-6.6-5-4.6 6.6-.6L12 2z" />
    </svg>
  ),
  Phone: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.19 4.18 2 2 0 015.18 2h3a2 2 0 012 1.72c.13.94.36 1.85.7 2.71a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006 6l1.37-1.27a2 2 0 012.11-.45c.86.34 1.77.57 2.71.7A2 2 0 0122 16.92z" />
    </svg>
  ),
  Instagram: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r=".7" fill="currentColor" />
    </svg>
  ),
  Whatsapp: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M20.5 3.5A11 11 0 003.6 17.3L2 22l4.8-1.6A11 11 0 1020.5 3.5zM12 20a8 8 0 01-4.1-1.1l-.3-.2-3 1 1-2.9-.2-.3A8 8 0 1112 20zm4.5-5.7c-.2-.1-1.3-.7-1.5-.8s-.4-.1-.5.1c-.2.2-.6.7-.7.8-.1.2-.3.2-.5.1-.2-.1-1-.4-1.9-1.1-.7-.6-1.1-1.4-1.3-1.6-.1-.2 0-.3.1-.4l.4-.5c.1-.1.2-.2.2-.4 0-.1.1-.3 0-.4 0-.1-.5-1.3-.7-1.7-.2-.5-.4-.4-.5-.4h-.4c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.8 2.3.9 2.4c.1.2 1.6 2.4 3.8 3.4.5.2.9.3 1.3.4.5.1 1 .1 1.4.1.4-.1 1.3-.5 1.5-1.1.2-.5.2-1 .1-1.1z" />
    </svg>
  ),
  Telegram: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M21.5 4.2L2.9 11.3c-1.1.4-1.1 1 0 1.4l4.6 1.4 1.8 5.6c.2.6.4.7.9.4l2.5-1.9 4.4 3.3c.8.5 1.4.2 1.6-.7l3.1-14.6c.3-1.1-.4-1.6-1.3-1.2zM9.7 14.5l9.8-5.9-7.5 7-1.4 4.5-.9-5.6z" />
    </svg>
  ),
  Logo: (p: IconProps) => (
    <svg viewBox="0 0 32 32" fill="none" {...p}>
      <circle cx="16" cy="16" r="15" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 16c0-2.8 2.2-5 5-5s5 2.2 5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="16" cy="19" r="1.6" fill="currentColor" />
    </svg>
  ),
  Sparkle: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l1.6 5.2L19 9l-5.4 1.8L12 16l-1.6-5.2L5 9l5.4-1.8L12 2zm6 12l.8 2.4L21 17l-2.2.6L18 20l-.8-2.4L15 17l2.2-.6L18 14z" />
    </svg>
  ),
  Drag: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M9 5l-3 3 3 3" />
      <path d="M15 5l3 3-3 3" />
      <path d="M9 13l-3 3 3 3" />
      <path d="M15 13l3 3-3 3" />
    </svg>
  ),
  ArrowL: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </svg>
  ),
  ArrowR: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  ),
};
