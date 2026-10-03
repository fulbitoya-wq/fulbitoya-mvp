import type { Metadata } from "next";
import { MarketingLayout, PageIntro } from "@/components/landing/MarketingLayout";
import { CONTACT_EMAIL } from "@/lib/site";
import Link from "next/link";

export const metadata: Metadata = { title: "Soporte" };

export default function SoportePage() {
  return (
    <MarketingLayout>
      <main className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-16 lg:py-16">
        <PageIntro
          kicker="AYUDA"
          title="Soporte"
          lead="Escribinos y te respondemos a la brevedad. El mail no sirve para inscribir un equipo: eso se hace en la app."
        />

        <div className="mt-10 max-w-xl space-y-4 text-[16px] leading-7 text-[#B8C4D6]">
          <p>
            Jugadores y equipos: cuenta, invitaciones, un desafío que no aparece, baja de cuenta.
          </p>
          <p>
            Predios: si querés sumarte y gestionar reservas, también escribinos. Eso se opera con
            FulbitoYa, no desde PorLaCancha.
          </p>
        </div>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="landing-cta mt-8 inline-flex h-12 items-center rounded-full px-6 text-[14px] font-semibold text-[#001B44]"
        >
          {CONTACT_EMAIL}
        </a>

        <p className="mt-8 text-sm text-[#B8C4D6]">
          Antes de escribir, mirá la{" "}
          <Link href="/faq" className="font-semibold text-[#8BC9EB] underline-offset-2 hover:underline">
            FAQ
          </Link>
          .
        </p>
      </main>
    </MarketingLayout>
  );
}
