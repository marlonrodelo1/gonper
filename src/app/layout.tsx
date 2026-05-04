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

export const metadata: Metadata = {
  title: "Gonper · Una recepcionista que no descansa nunca",
  description:
    "Gonper atiende reservas por Telegram 24/7, confirma cada cita una hora antes y libera el hueco si no hay respuesta. Para barberías, peluquerías y centros de estética en España.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <PosthogPageview />
      </body>
    </html>
  );
}
