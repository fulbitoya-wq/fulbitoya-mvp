"use client";

import Link from "next/link";

export default function DesafiosPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
        Desafíos abiertos
      </h1>
      <p className="mt-2 text-[#1A2E4A]/70">
        Desafíos y eventos disponibles para sumarte con tu equipo.
      </p>
      <div className="mt-8 rounded-xl border border-[#E0E0E0] bg-white p-8 text-center">
        <p className="text-[#1A2E4A]/70">
          Próximamente: listado de desafíos abiertos.
        </p>
        <Link href="/jugador" className="mt-4 inline-block font-medium text-[var(--fulbito-green)] hover:underline">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
