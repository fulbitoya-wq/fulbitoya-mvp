import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/site";
import { LandingNav } from "./LandingNav";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-8 sm:px-8 lg:px-16">
      <div className="mx-auto flex max-w-[1440px] flex-wrap gap-x-6 gap-y-2 text-sm text-[#B8C4D6]">
        <Link href="/como-funciona">Cómo funciona</Link>
        <Link href="/funcionalidades">Funcionalidades</Link>
        <Link href="/predios">Para predios</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/terminos">Términos y condiciones</Link>
        <Link href="/privacidad">Privacidad</Link>
        <Link href="/soporte">Soporte</Link>
        <Link href="/eliminar-cuenta">Eliminar cuenta</Link>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </div>
    </footer>
  );
}

export function MarketingLayout({
  children,
  overlayNav = false,
}: {
  children: React.ReactNode;
  overlayNav?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-[#001B44]">
      <LandingNav overlay={overlayNav} />
      {children}
      <MarketingFooter />
    </div>
  );
}

export function PageIntro({
  kicker,
  title,
  lead,
}: {
  kicker: string;
  title: string;
  lead: string;
}) {
  return (
    <header className="max-w-3xl">
      <p className="text-[12px] font-semibold tracking-[0.14em] text-[#8BC9EB]">{kicker}</p>
      <h1 className="mt-3 text-4xl font-extrabold leading-[1.1] text-[#F7F5EF] sm:text-5xl">{title}</h1>
      <p className="mt-4 text-[17px] leading-7 text-[#B8C4D6] sm:text-[19px]">{lead}</p>
    </header>
  );
}
