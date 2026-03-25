import Link from "next/link";

export default function ReservaErrorPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <h1 className="font-heading text-2xl uppercase tracking-wide text-[#1A2E4A]">
        No se completó el pago
      </h1>
      <p className="mt-3 text-sm text-[#1A2E4A]/80">
        Podés volver al predio y elegir otro horario, o intentar de nuevo.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg border border-[#E0E0E0] px-4 py-2 text-sm font-medium text-[#1A2E4A] hover:bg-[#F5F5F5]"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
