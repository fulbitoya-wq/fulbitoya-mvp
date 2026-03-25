import Link from "next/link";

export default function ReservaOkPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-heading text-2xl uppercase tracking-wide text-[#1A2E4A]">
        Pago recibido
      </h1>
      <p className="mt-3 text-sm text-[#1A2E4A]/80">
        Si el pago fue aprobado, tu turno queda reservado enseguida. Si no ves el horario
        actualizado, esperá unos segundos y refrescá la página del predio.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--fulbito-green-hover)]"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
