"use client";

import { useReveal } from "@/lib/hooks/use-reveal";
import { Hero } from "./hero";
import { Strip } from "./strip";
import { ComoFunciona } from "./como-funciona";
import { Juanita } from "./juanita";
import { Comparativa } from "./comparativa";
import { Pricing } from "./pricing";
import { FAQ } from "./faq";
import { FinalCTA } from "./final-cta";
import { Footer } from "./footer";

/**
 * Landing pública de Gomper.
 *
 * Este wrapper es un Client Component porque tiene que llamar `useReveal()`
 * para que IntersectionObserver active las animaciones de cada `.reveal`.
 * Cada sección decide internamente si necesita estado/efectos: las que sí
 * (Hero, ChatDemo, ComoFunciona, Juanita, FAQ, TopNav) declaran su propio
 * `"use client"`. Strip, Comparativa, Pricing, FinalCta y Footer son server.
 *
 * El TopNav se renderiza dentro de `<Hero />` (igual que en el prototipo).
 */
export function Landing() {
  useReveal();
  return (
    <>
      <Hero />
      <Strip />
      <ComoFunciona />
      <Juanita />
      <Comparativa />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </>
  );
}
