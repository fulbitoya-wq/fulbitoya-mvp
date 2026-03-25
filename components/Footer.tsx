import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-[var(--fulbito-navy)]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
          <div className="flex flex-col items-center gap-3 md:items-start">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo-white.png"
                alt="FulbitoYa!"
                width={180}
                height={50}
                className="h-12 w-auto object-contain"
              />
            </Link>
            <p className="text-sm text-white/70">
              © {new Date().getFullYear()} FulbitoYa! Todos los derechos reservados.
            </p>
          </div>

          <nav className="flex flex-wrap justify-center gap-6 text-sm">
            <Link
              href="/canchas"
              className="text-white/70 transition-colors hover:text-white"
            >
              Canchas
            </Link>
            <Link
              href="/login"
              className="text-white/70 transition-colors hover:text-white"
            >
              Ingresar
            </Link>
            <Link
              href="/registro"
              className="text-white/70 transition-colors hover:text-white"
            >
              Registrate
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
