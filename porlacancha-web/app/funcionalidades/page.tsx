import type { Metadata } from "next";
import {
  Bell,
  Compass,
  Link2,
  MapPin,
  Shield,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { MarketingLayout, PageIntro } from "@/components/landing/MarketingLayout";
import Link from "next/link";

export const metadata: Metadata = { title: "Funcionalidades" };

const features = [
  {
    title: "Explorar",
    body: "Lista y mapa de desafíos cerca tuyo. Filtrá por día y formato.",
    Icon: Compass,
  },
  {
    title: "Mis partidos",
    body: "Próximos e historial. Vés a qué te inscribiste y cómo salió.",
    Icon: Trophy,
  },
  {
    title: "Equipos",
    body: "Creá plantel, invitá jugadores y administrá el capitán.",
    Icon: Shield,
  },
  {
    title: "Perfil",
    body: "Tu ficha pública, cómo jugás y el progreso de tus partidos.",
    Icon: UserRound,
  },
  {
    title: "Unirse con enlace",
    body: "Te pasan un código o un link y entrá al equipo.",
    Icon: Link2,
  },
  {
    title: "Buscar jugadores",
    body: "El capitán encuentra gente para completar el 11.",
    Icon: Users,
  },
  {
    title: "Mapa",
    body: "Ves el predio en el mapa y abrís el desafío desde el pin.",
    Icon: MapPin,
  },
  {
    title: "Notificaciones",
    body: "Invitaciones, inscripciones y lo que tenés pendiente.",
    Icon: Bell,
  },
];

export default function FuncionalidadesPage() {
  return (
    <MarketingLayout>
      <main className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-16 lg:py-16">
        <PageIntro
          kicker="LA APP"
          title="Funcionalidades"
          lead="Esto es lo que hace PorLaCancha. No es el paso a paso: es el menú de la app. El recorrido completo está en Cómo funciona."
        />

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ title, body, Icon }) => (
            <li
              key={title}
              className="rounded-2xl border border-[rgba(139,201,235,0.18)] bg-[#07366D]/50 p-5"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[rgba(139,201,235,0.25)] bg-[rgba(7,54,109,0.65)] text-[#8BC9EB]">
                <Icon size={20} strokeWidth={2} aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-extrabold text-[#F7F5EF]">{title}</h2>
              <p className="mt-2 text-[14px] leading-6 text-[#B8C4D6]">{body}</p>
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm text-[#B8C4D6]">
          ¿Todavía no la usaste?{" "}
          <Link href="/como-funciona" className="font-semibold text-[#8BC9EB] underline-offset-2 hover:underline">
            Cómo funciona, paso a paso
          </Link>
          .
        </p>
      </main>
    </MarketingLayout>
  );
}
