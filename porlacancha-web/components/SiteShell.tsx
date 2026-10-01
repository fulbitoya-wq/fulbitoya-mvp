import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";
import { BrandLogo } from "./BrandLogo";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={className}>
      <BrandLogo size="header" />
    </span>
  );
}

export function DraftBanner() {
  return (
    <p className="rounded-xl bg-plc-warning/20 px-3 py-2 text-center text-xs font-semibold text-plc-gold-light">
      BORRADOR — pendiente de revisión legal
    </p>
  );
}

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-3 py-4">
      <BrandMark />
      <nav className="flex gap-3 text-xs font-semibold text-plc-text-secondary">
        <Link href="/soporte">Soporte</Link>
        <Link href="/privacidad">Privacidad</Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-14 border-t border-white/10 py-6 text-xs text-plc-text-secondary">
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <Link href="/terminos">Términos</Link>
        <Link href="/privacidad">Privacidad</Link>
        <Link href="/eliminar-cuenta">Eliminar cuenta</Link>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </div>
    </footer>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto min-h-dvh w-full max-w-md px-5">
      <div className="pitch-lines pointer-events-none absolute inset-0 opacity-40" aria-hidden />
      <div className="relative">
        <SiteHeader />
        {children}
        <SiteFooter />
      </div>
    </div>
  );
}
