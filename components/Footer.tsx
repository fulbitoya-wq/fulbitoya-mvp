import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#E0E0E0] bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-heading text-xl text-[#1A2E4A]">
            FulbitoYa!
          </span>
          <div className="flex gap-6 text-sm text-[#1A2E4A]/80">
            <Link href="/canchas" className="hover:text-[#4CAF50]">
              Canchas
            </Link>
            <Link href="/login" className="hover:text-[#4CAF50]">
              Ingresar
            </Link>
            <Link href="/registro" className="hover:text-[#4CAF50]">
              Registrate
            </Link>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-[#1A2E4A]/60">
          Fútbol amateur en Buenos Aires — Reservá y jugá ya.
        </p>
      </div>
    </footer>
  );
}
