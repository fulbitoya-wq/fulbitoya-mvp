import type { Metadata } from "next";
import { MarketingLayout, PageIntro } from "@/components/landing/MarketingLayout";
import { CONTACT_EMAIL, FULBITOYA_URL } from "@/lib/site";

export const metadata: Metadata = { title: "Para predios" };

export default function PrediosPage() {
  return (
    <MarketingLayout>
      <main className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-16 lg:py-16">
        <PageIntro
          kicker="PREDIOS"
          title="¿Tenés un predio y querés sumarte?"
          lead="PorLaCancha es la app de los jugadores: equipos, desafíos y partidos amateur. La gestión de reservas de cancha no se hace acá."
        />

        <div className="mt-10 max-w-3xl space-y-5 text-[16px] leading-7 text-[#B8C4D6]">
          <p>
            Si querés que tu predio forme parte de la plataforma y administrar las reservas desde un
            panel, usamos <strong className="text-[#F7F5EF]">FulbitoYa</strong>: el producto para
            predios.
          </p>
          <p>
            Ahí se gestionan turnos y reservas. PorLaCancha muestra los desafíos a los equipos; no
            reemplaza el software del predio.
          </p>
          <p>Escribinos y te contamos cómo sumarte.</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Predio — sumarme a la plataforma")}`}
            className="landing-cta inline-flex h-12 items-center rounded-full px-6 text-[14px] font-semibold text-[#001B44]"
          >
            Contactanos
          </a>
          {FULBITOYA_URL ? (
            <a
              href={FULBITOYA_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center rounded-full border border-[rgba(139,201,235,0.35)] px-6 text-[14px] font-semibold text-[#F7F5EF]"
            >
              Ir a FulbitoYa
            </a>
          ) : null}
        </div>
      </main>
    </MarketingLayout>
  );
}
