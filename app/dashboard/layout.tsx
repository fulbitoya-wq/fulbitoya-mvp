import Link from "next/link";

const items: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/dashboard/canchas", label: "Predios" },
  { href: "/dashboard/disponibilidades", label: "Agenda" },
  { href: "/dashboard/reservas", label: "Reservas" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-56 flex-shrink-0 bg-[#1A2E4A] text-white">
        <div className="p-4">
          <Link href="/dashboard" className="font-heading text-xl">
            FulbitoYa
          </Link>
          <p className="mt-1 text-xs text-white/60">Panel del predio</p>
        </div>
        <nav className="mt-4 space-y-1 px-3">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className="block rounded-lg px-3 py-2 text-sm hover:bg-[#2C4A72]"
            >
              {it.label}
            </Link>
          ))}
        </nav>
        <p className="mt-8 px-4 text-xs leading-relaxed text-white/50">
          Los jugadores reservan y arman partidos en PorLaCancha. Acá cargás horarios, cobrás y ves la agenda.
        </p>
      </aside>
      <div className="flex-1 bg-[#F5F5F5]">{children}</div>
    </div>
  );
}
