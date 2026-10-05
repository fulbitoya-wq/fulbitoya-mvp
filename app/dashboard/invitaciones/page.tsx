import Link from "next/link";

export default function DashboardInvitacionesPage() {
  return (
    <div className="p-8">
      <h1 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">Invitaciones de equipos</h1>
      <p className="mt-2 max-w-lg text-[#1A2E4A]/70">
        Las invitaciones a planteles son de PorLaCancha, no de este panel. Acá solo se gestiona el predio.
      </p>
      <Link href="/dashboard" className="mt-6 inline-block text-sm font-medium text-[var(--fulbito-green)] underline">
        Volver al inicio
      </Link>
    </div>
  );
}
