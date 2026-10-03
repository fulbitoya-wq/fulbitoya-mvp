"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/site";

const links = [
  { href: "/", label: "Inicio", active: true },
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#predios", label: "Para predios" },
  { href: "#faq", label: "FAQ" },
  { href: "/soporte", label: "Soporte" },
  { href: "/terminos", label: "Términos y condiciones" },
];

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const downloadHref = APP_STORE_URL || PLAY_STORE_URL || "#descargar";

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <div className="mx-auto flex h-[88px] max-w-[1440px] items-center justify-between gap-4 px-5 py-5 sm:h-[96px] sm:px-8 lg:px-12 xl:px-16">
        <BrandLogo size="nav" />

        <nav className="hidden items-center gap-4 min-[1200px]:flex" aria-label="Principal">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`relative whitespace-nowrap text-[13px] font-semibold tracking-wide ${
                l.active ? "text-plc-white" : "text-[#B8C4D6] hover:text-plc-white"
              }`}
            >
              {l.label}
              {l.active ? (
                <span className="absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-[#D9A928]" />
              ) : null}
            </Link>
          ))}
        </nav>

        <a
          href={downloadHref}
          className="landing-cta hidden h-12 shrink-0 items-center rounded-full px-6 text-[14px] font-semibold text-[#001B44] min-[1200px]:inline-flex"
        >
          Descargar app →
        </a>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(139,201,235,0.25)] text-plc-white min-[1200px]:hidden"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-white/10 bg-[#001B44]/95 px-5 py-4 backdrop-blur-md min-[1200px]:hidden">
          <nav className="flex flex-col gap-1" aria-label="Móvil">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-3 py-3 text-[15px] font-semibold ${
                  l.active ? "text-plc-white" : "text-[#B8C4D6]"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <a
              href={downloadHref}
              className="landing-cta mt-2 inline-flex h-12 items-center justify-center rounded-full px-6 text-[14px] font-semibold text-[#001B44]"
              onClick={() => setOpen(false)}
            >
              Descargar app →
            </a>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
