"use client";

import { useReveal } from "@/lib/hooks/use-reveal";
import { Hero } from "./hero";
import { Strip } from "./strip";
import { Beneficios } from "./beneficios";
import { ComoFunciona } from "./como-funciona";
import { Juanita } from "./juanita";
import { Comparativa } from "./comparativa";
import { Pricing } from "./pricing";
import { FAQ } from "./faq";
import { FinalCTA } from "./final-cta";
import { Footer } from "./footer";
import { RoyceChatWidget } from "./royce-chat-widget";

type Props = {
  /** Mensaje de bienvenida de Royce, server-fetched desde `agentes.bienvenida`. */
  royceBienvenida: string;
  /** URL del avatar del agente, o null si no se ha configurado. */
  royceAvatarUrl: string | null;
};

/**
 * Landing pública de Gestori.
 *
 * Este wrapper es un Client Component porque tiene que llamar `useReveal()`
 * para que IntersectionObserver active las animaciones de cada `.reveal`.
 * Cada sección decide internamente si necesita estado/efectos.
 *
 * El TopNav se renderiza dentro de `<Hero />` (igual que en el prototipo).
 *
 * Royce vive como widget flotante en la esquina inferior derecha (igual
 * que el chat-widget de los salones). El mockup `<ChatDemo />` dentro de
 * `<Juanita />` se mantiene — es marketing visual, no el chat real.
 */
export function Landing({ royceBienvenida, royceAvatarUrl }: Props) {
  useReveal();
  return (
    <>
      <Hero />
      <Strip />
      <Beneficios />
      <ComoFunciona />
      <Juanita />
      <Comparativa />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
      <RoyceChatWidget
        bienvenida={royceBienvenida}
        avatarUrl={royceAvatarUrl}
        surface="landing"
      />
    </>
  );
}
