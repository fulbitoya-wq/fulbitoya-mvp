import {
  ChartNoAxesColumnIncreasing,
  MapPin,
  Shield,
  Trophy,
} from "lucide-react";
import { LandingNav } from "./LandingNav";
import { PhoneStack } from "./PhoneStack";
import { StoreBadges } from "./StoreBadges";

const benefits = [
  {
    title: "Encontrá desafíos",
    body: "Descubrí partidos cerca tuyo.",
    Icon: MapPin,
  },
  {
    title: "Armá tu equipo",
    body: "Sumá jugadores y organizá tu plantel.",
    Icon: Shield,
  },
  {
    title: "Jugá",
    body: "Inscribite a desafíos reales.",
    Icon: Trophy,
  },
  {
    title: "Seguí tu progreso",
    body: "Partidos, resultados y estadísticas.",
    Icon: ChartNoAxesColumnIncreasing,
  },
];

export function LandingHero() {
  return (
    <section className="relative min-h-dvh overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/hero-stadium.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-center"
      />
      <div className="landing-hero-overlay absolute inset-0" aria-hidden />

      <LandingNav />

      <div className="relative mx-auto grid min-h-dvh max-w-[1440px] grid-cols-1 items-center gap-10 px-5 pb-10 pt-[108px] sm:px-8 lg:grid-cols-2 lg:gap-8 lg:px-12 lg:pb-8 lg:pt-[108px] xl:px-16">
        <div className="landing-copy max-w-[600px] lg:max-w-none">
          <p className="inline-flex rounded-full border border-[rgba(139,201,235,0.25)] bg-[rgba(7,54,109,0.65)] px-3 py-1.5 text-[11px] font-semibold tracking-[0.14em] text-[#8BC9EB]">
            — FÚTBOL AMATEUR, EN SERIO
          </p>
          <h1 className="mt-5 font-[family-name:var(--font-manrope)] text-[42px] font-extrabold leading-[1.02] text-[#F7F5EF] sm:text-5xl lg:text-[64px] xl:text-[72px]">
            Jugá más.
            <br />
            Organizate mejor.
            <br />
            <span className="text-[#D9A928]">Viví el fútbol.</span>
          </h1>
          <p className="mt-5 max-w-[600px] text-[17px] leading-7 text-[#B8C4D6] sm:text-[19px] sm:leading-8 lg:text-[20px]">
            PorLaCancha conecta equipos con desafíos reales en predios de fútbol amateur. Encontrá
            dónde jugar, armá tu equipo y viví cada partido.
          </p>
          <div id="descargar" className="mt-8">
            <StoreBadges />
          </div>
        </div>

        <PhoneStack />
      </div>

      <ul className="relative mx-auto grid max-w-[1440px] grid-cols-1 gap-6 px-5 pb-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:gap-0 lg:px-12 lg:pb-14 xl:px-16">
        {benefits.map(({ title, body, Icon }, i) => (
          <li
            key={title}
            className={`flex gap-3 lg:px-4 ${i > 0 ? "lg:border-l lg:border-[rgba(139,201,235,0.18)]" : ""}`}
          >
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(139,201,235,0.25)] bg-[rgba(7,54,109,0.65)] text-[#8BC9EB]">
              <Icon size={20} strokeWidth={2} aria-hidden />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-[#F7F5EF]">{title}</p>
              <p className="mt-0.5 text-[13px] leading-5 text-[#B8C4D6]">{body}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
