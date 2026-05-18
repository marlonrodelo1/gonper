"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import { GestoriLogo, GestoriMark } from "@/components/brand/gestori-logo";

export function TopNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { label: "Cómo funciona", href: "#como" },
    { label: "Marketplace", href: "/marketplace" },
    { label: "Juanita", href: "#juanita" },
    { label: "Planes", href: "#planes" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none px-4 pt-4 sm:pt-5">
        <header
          className={`floating-nav pointer-events-auto mx-auto w-full max-w-[920px] flex items-center justify-between gap-2 transition-all duration-300 ${scrolled ? "is-scrolled" : ""}`}
          style={{
            padding: "8px 8px 8px 18px",
            borderRadius: "999px",
          }}
        >
          <a href="#" className="flex items-center gap-2 text-ink shrink-0 pr-2">
            <GestoriMark size={24} />
            <GestoriLogo size={18} tag={null} color="#1A1815" />
            <span className="hidden sm:inline ml-1 text-[10px] uppercase tracking-[0.2em] text-stone/70 font-medium">
              Beta
            </span>
          </a>

          <nav className="hidden lg:flex items-center gap-1 text-[13.5px] text-stone">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="px-3 py-1.5 rounded-full hover:bg-ink/[0.05] hover:text-ink transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href="https://www.farmasi.es/gonperstudio"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visitar tienda Farmasi de Gonper Studio"
              className="hidden sm:inline-flex items-center gap-1.5 text-[12.5px] font-medium px-3.5 py-2 rounded-full text-paper transition hover:scale-[1.03] active:scale-[0.97]"
              style={{
                background:
                  'linear-gradient(180deg, rgba(197,86,44,0.92) 0%, rgba(168,69,31,0.95) 100%)',
                border: '1px solid rgba(255,255,255,0.25)',
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.25), 0 6px 16px -8px rgba(168,69,31,0.45)',
              }}
            >
              <span
                className="inline-block w-1.5 h-1.5 rounded-full"
                style={{ background: '#FAEFEA' }}
                aria-hidden
              />
              Tienda Farmasi
            </a>
            <Link
              href="/login"
              className="hidden sm:inline-block text-[13.5px] text-stone hover:text-ink transition px-2"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/signup"
              className="text-[12.5px] font-medium px-4 py-2 rounded-full gloss-btn"
            >
              Empezar gratis
            </Link>
            <button
              type="button"
              aria-label="Abrir menú"
              onClick={() => setOpen((v) => !v)}
              className="lg:hidden h-9 w-9 grid place-items-center rounded-full border border-line/80 bg-white/60 text-ink hover:bg-white transition"
            >
              <svg
                viewBox="0 0 24 24"
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
              >
                {open ? (
                  <>
                    <path d="M6 6l12 12" />
                    <path d="M18 6L6 18" />
                  </>
                ) : (
                  <>
                    <path d="M4 7h16" />
                    <path d="M4 12h16" />
                    <path d="M4 17h16" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </header>
      </div>

      <div
        className={`fixed inset-0 z-40 lg:hidden transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setOpen(false)}
      >
        <div className="absolute inset-0 bg-ink/30 backdrop-blur-sm"></div>
        <div
          className={`absolute top-[88px] left-4 right-4 bg-cream/95 backdrop-blur-xl border border-line rounded-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)] p-3 transition-transform duration-300 ${open ? "translate-y-0" : "-translate-y-3"}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="px-4 py-3 rounded-xl text-[15px] text-ink hover:bg-ink/[0.05] transition-colors flex items-center justify-between"
              >
                <span>{l.label}</span>
                <Icon.Arrow width="14" height="14" />
              </a>
            ))}
            <div className="h-px bg-line/70 my-2"></div>
            <a
              href="https://www.farmasi.es/gonperstudio"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="mx-1 mb-1 px-4 py-3 rounded-xl text-[14.5px] font-medium text-paper transition flex items-center justify-between"
              style={{
                background:
                  'linear-gradient(180deg, rgba(197,86,44,0.92) 0%, rgba(168,69,31,0.95) 100%)',
                border: '1px solid rgba(255,255,255,0.25)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
              }}
            >
              <span>Tienda Farmasi</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 17L17 7" />
                <path d="M8 7h9v9" />
              </svg>
            </a>
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="px-4 py-3 rounded-xl text-[15px] text-stone hover:text-ink hover:bg-ink/[0.05] transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
