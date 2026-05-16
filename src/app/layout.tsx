import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif, Playfair_Display } from "next/font/google";
import "./globals.css";
import { PosthogPageview } from "@/components/posthog-pageview";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  style: "italic",
  weight: "400",
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://gonperstudio.shop";

const META_TITLE = "Gonper Studio — Lleva tu negocio desde tu móvil";
const META_DESCRIPTION =
  "El asistente IA que gestiona tu salón desde Telegram. Reservas, recordatorios y números a un mensaje de distancia. 7 días gratis, sin tarjeta.";

const LOGO_URL =
  "https://lyqvgdambamzbrzpwgpg.supabase.co/storage/v1/object/public/salon-assets/logos/gonperstudio.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: META_TITLE,
  description: META_DESCRIPTION,
  icons: {
    icon: [{ url: LOGO_URL, type: "image/png" }],
    shortcut: LOGO_URL,
    apple: LOGO_URL,
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: SITE_URL,
    siteName: "Gonper Studio",
    title: META_TITLE,
    description: META_DESCRIPTION,
    // La imagen se genera automaticamente desde src/app/opengraph-image.tsx
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PosthogPageview />
      </body>
    </html>
  );
}
