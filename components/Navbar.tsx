import Link from "next/link";

export function Navbar() {
  return (
    <header className="bg-[#1A2E4A] text-white shadow-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="font-heading text-2xl tracking-wide text-white">
          FulbitoYa!
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/canchas"
            className="text-sm font-medium text-white/90 transition hover:text-white"
          >
            Canchas
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-white/90 transition hover:text-white"
          >
            Ingresar
          </Link>
          <Link
            href="/registro"
            className="rounded-lg bg-[#4CAF50] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#388E3C]"
          >
            Registrate
          </Link>
        </div>
      </nav>
    </header>
  );
}