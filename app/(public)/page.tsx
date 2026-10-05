import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 pb-16 pt-32">
      <Image
        src="/images/logo-color.png"
        alt="FulbitoYa"
        width={280}
        height={80}
        className="h-16 w-auto object-contain sm:h-20"
        priority
      />
      <h1 className="mt-10 max-w-xl text-center font-heading text-3xl tracking-wide text-[#1A2E4A] sm:text-4xl">
        Panel de predios
      </h1>
      <p className="mt-4 max-w-lg text-center text-base text-[#1A2E4A]/75 sm:text-lg">
        Cargá horarios, cobrá seña o total, y seguí las reservas. Los jugadores reservan y arman partidos en
        PorLaCancha.
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/login"
          className="rounded-lg bg-[var(--fulbito-green)] px-8 py-3 text-base font-semibold text-white transition hover:bg-[var(--fulbito-green-hover)]"
        >
          Ingresar
        </Link>
        <Link
          href="/registro"
          className="rounded-lg border border-[#1A2E4A]/20 bg-white px-8 py-3 text-base font-semibold text-[#1A2E4A] transition hover:border-[#1A2E4A]/40"
        >
          Crear cuenta
        </Link>
      </div>
    </div>
  );
}
