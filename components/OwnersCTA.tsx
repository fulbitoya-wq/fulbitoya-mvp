import Link from "next/link";
import { Building2, TrendingUp, Users } from "lucide-react";

export function OwnersCTA() {
  return (
    <section id="duenos" className="bg-[var(--fulbito-navy)] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center">
          <h2 className="font-heading text-3xl tracking-wide text-white sm:text-4xl md:text-5xl">
            ¿Tenés una cancha?
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-white/80">
            Sumá tu cancha a FulbitoYa! y empezá a recibir reservas hoy mismo. Es gratis y fácil de usar.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            <div className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--fulbito-green)]/20">
                <Users className="h-7 w-7 text-[var(--fulbito-green)]" />
              </div>
              <p className="mt-3 text-sm font-medium text-white">
                Miles de jugadores buscando canchas
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--fulbito-green)]/20">
                <TrendingUp className="h-7 w-7 text-[var(--fulbito-green)]" />
              </div>
              <p className="mt-3 text-sm font-medium text-white">
                Aumentá tus reservas hasta un 40%
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--fulbito-green)]/20">
                <Building2 className="h-7 w-7 text-[var(--fulbito-green)]" />
              </div>
              <p className="mt-3 text-sm font-medium text-white">
                Gestión simple de tu negocio
              </p>
            </div>
          </div>

          <Link
            href="/registro"
            className="mt-10 inline-block rounded-lg bg-[var(--fulbito-green)] px-8 py-6 text-lg font-semibold text-white transition hover:bg-[var(--fulbito-green-hover)]"
          >
            Sumá tu cancha gratis
          </Link>
        </div>
      </div>
    </section>
  );
}
