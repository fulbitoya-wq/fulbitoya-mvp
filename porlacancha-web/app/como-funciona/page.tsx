import type { Metadata } from "next";
import {
  Download,
  Flag,
  Smartphone,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { MarketingLayout, PageIntro } from "@/components/landing/MarketingLayout";
import { StoreBadges } from "@/components/landing/StoreBadges";
import Link from "next/link";

export const metadata: Metadata = { title: "Cómo funciona" };

const pasos = [
  {
    n: "01",
    title: "Descargá la app",
    body: "PorLaCancha vive en el celular. Instalala en iOS o Android y listo.",
    Icon: Download,
  },
  {
    n: "02",
    title: "Creá tu perfil",
    body: "Tu nombre, username y cómo jugás. Así te encuentran los equipos.",
    Icon: Smartphone,
  },
  {
    n: "03",
    title: "Armá tu equipo",
    body: "Creá el plantel, invitá con un enlace y nombrá capitán.",
    Icon: Users,
  },
  {
    n: "04",
    title: "Creá un desafío o anotáte a un partido",
    body: "Publicá un desafío o inscribí al equipo en uno que ya está en el mapa.",
    Icon: Flag,
  },
  {
    n: "05",
    title: "Pagá simple, si hay inscripción",
    body: "Cuando el desafío lo pide, pagás con tu billetera virtual de Mercado Pago. Fácil y en pocos toques.",
    Icon: Wallet,
  },
  {
    n: "06",
    title: "Jugá y recibí el premio",
    body: "Se juega en la cancha. El premio lo anuncia quien arma el desafío: no es una apuesta.",
    Icon: Trophy,
  },
];

export default function ComoFuncionaPage() {
  return (
    <MarketingLayout>
      <main className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-16 lg:py-16">
        <PageIntro
          kicker="PASO A PASO"
          title="Cómo funciona"
          lead="PorLaCancha organiza fútbol amateur con premio. No es una casa de apuestas ni un juego de azar: es un partido real, en un predio, entre equipos."
        />

        <ol className="mt-12 grid gap-4 md:grid-cols-2">
          {pasos.map(({ n, title, body, Icon }) => (
            <li
              key={n}
              className="rounded-2xl border border-[rgba(139,201,235,0.18)] bg-[#07366D]/50 p-5 sm:p-6"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(139,201,235,0.25)] bg-[rgba(7,54,109,0.65)] text-[#8BC9EB]">
                  <Icon size={20} strokeWidth={2} aria-hidden />
                </span>
                <p className="text-[13px] font-semibold tracking-widest text-[#8BC9EB]">{n}</p>
              </div>
              <h2 className="mt-4 text-xl font-extrabold text-[#F7F5EF]">{title}</h2>
              <p className="mt-2 text-[15px] leading-6 text-[#B8C4D6]">{body}</p>
            </li>
          ))}
        </ol>

        <aside className="mt-10 rounded-2xl border border-[rgba(217,169,40,0.28)] bg-[#0D4A8C]/40 p-5 sm:p-6">
          <p className="text-sm font-semibold text-[#F3D477]">Importante</p>
          <p className="mt-2 text-[15px] leading-6 text-[#F7F5EF]">
            El premio es parte del desafío deportivo, no una apuesta. Nadie “juega a las cuotas”: se
            juega un partido. Si hay plata de por medio, es inscripción o premio anunciado, y el
            cobro lo procesa Mercado Pago.
          </p>
        </aside>

        <div className="mt-10">
          <p className="mb-4 text-sm font-semibold text-[#B8C4D6]">Empezá por acá</p>
          <StoreBadges />
        </div>

        <p className="mt-8 text-sm text-[#B8C4D6]">
          ¿Querés ver qué hay dentro de la app?{" "}
          <Link href="/funcionalidades" className="font-semibold text-[#8BC9EB] underline-offset-2 hover:underline">
            Funcionalidades
          </Link>
          .
        </p>
      </main>
    </MarketingLayout>
  );
}
