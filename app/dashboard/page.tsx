import Link from "next/link";

const atajos = [
  {
    href: "/dashboard/canchas",
    title: "Predios y canchas",
    body: "Datos del complejo, fotos, seña y reglas de cancelación.",
  },
  {
    href: "/dashboard/disponibilidades",
    title: "Agenda",
    body: "Horarios, enlace de pago por WhatsApp y reservas en efectivo.",
  },
  {
    href: "/dashboard/reservas",
    title: "Reservas",
    body: "Turnos confirmados: app, WhatsApp o cobro en el predio.",
  },
];

export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">Panel del predio</h1>
      <p className="mt-1 max-w-xl text-[#1A2E4A]/70">
        FulbitoYa es para el dueño del complejo. El jugador reserva y busca partido en PorLaCancha. Acá no se
        publican desafíos por plata ni se gestionan equipos.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {atajos.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-xl border border-[#E0E0E0] bg-white p-5 shadow-sm transition hover:border-[#1A2E4A]/30"
          >
            <p className="font-semibold text-[#1A2E4A]">{a.title}</p>
            <p className="mt-1 text-sm text-[#1A2E4A]/70">{a.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
