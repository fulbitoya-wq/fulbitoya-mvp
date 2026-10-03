import { LandingHero } from "@/components/landing/LandingHero";
import { MarketingFooter } from "@/components/landing/MarketingLayout";
import Link from "next/link";

const teases = [
  {
    href: "/como-funciona",
    title: "Cómo funciona",
    body: "Descargá, perfil, equipo, desafío, Mercado Pago y el premio. Paso a paso, sin apuestas.",
  },
  {
    href: "/funcionalidades",
    title: "Funcionalidades",
    body: "Explorar, equipos, mapa, perfil y el resto de lo que hay en la app.",
  },
  {
    href: "/predios",
    title: "Para predios",
    body: "Las reservas se gestionan con FulbitoYa. Contactanos si querés sumarte.",
  },
  {
    href: "/faq",
    title: "FAQ",
    body: "Premio vs apuesta, pagos y cómo se usa la app.",
  },
];

export default function HomePage() {
  return (
    <div className="bg-[#001B44]">
      <LandingHero />

      <section className="mx-auto grid max-w-[1440px] gap-4 px-5 py-16 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-16">
        {teases.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded-2xl border border-[rgba(139,201,235,0.18)] bg-[#07366D]/50 p-5 transition hover:border-[rgba(139,201,235,0.4)]"
          >
            <h2 className="text-xl font-extrabold text-[#F7F5EF]">{t.title}</h2>
            <p className="mt-2 text-[14px] leading-6 text-[#B8C4D6]">{t.body}</p>
            <p className="mt-4 text-[13px] font-semibold text-[#8BC9EB]">Ver más →</p>
          </Link>
        ))}
      </section>

      <MarketingFooter />
    </div>
  );
}
