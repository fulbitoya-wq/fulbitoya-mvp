import Link from "next/link";

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
            FulbitoYa!
          </Link>
        </div>
        <nav className="mt-6 space-y-1 px-3">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-[#2C4A72]"
          >
            Panel
          </Link>
          <Link
            href="/dashboard/canchas"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-[#2C4A72]"
          >
            Mis canchas
          </Link>
          <Link
            href="/dashboard/campos"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-[#2C4A72]"
          >
            Mis campos
          </Link>
          <Link
            href="/dashboard/disponibilidades"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-[#2C4A72]"
          >
            Disponibilidades
          </Link>
          <Link
            href="/dashboard/reservas"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-[#2C4A72]"
          >
            Reservas recibidas
          </Link>
          <Link
            href="/dashboard/invitaciones"
            className="block rounded-lg px-3 py-2 text-sm hover:bg-[#2C4A72]"
          >
            Invitaciones
          </Link>
        </nav>
      </aside>
      <div className="flex-1 bg-[#F5F5F5]">
        {children}
      </div>
    </div>
  );
}
