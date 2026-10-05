import Link from "next/link";

export default function CrearDesafioRetiradoPage() {
  return (
    <div className="p-8">
      <h1 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">Esto ya no se usa</h1>
      <p className="mt-2 max-w-lg text-[#1A2E4A]/70">
        El predio no publica desafíos ni partidos por plata. En Agenda cargás el horario; el jugador reserva o
        abre el partido desde PorLaCancha.
      </p>
      <Link
        href="/dashboard/disponibilidades"
        className="mt-6 inline-flex rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white"
      >
        Ir a la agenda
      </Link>
    </div>
  );
}
