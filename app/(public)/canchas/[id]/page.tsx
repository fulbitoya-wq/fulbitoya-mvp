type Props = { params: Promise<{ id: string }> };

export default async function CanchaDetallePage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-4xl uppercase tracking-wide text-[#1A2E4A]">
        Detalle cancha
      </h1>
      <p className="mt-2 text-[#1A2E4A]/80">
        Cancha ID: {id} — Calendario + modal reserva en construcción.
      </p>
    </div>
  );
}
