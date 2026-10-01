import Link from "next/link";
import { MapPin } from "lucide-react";
import { getDesafiosPublicos } from "@/lib/desafios";
import { formatPremioArs, MATCH_TIPO_LABEL } from "@/lib/google-maps";

export async function PublicDesafiosTeaser() {
  const { data } = await getDesafiosPublicos();
  const items = data.slice(0, 3);

  return (
    <section className="bg-[var(--white-smoke)] py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-heading text-3xl tracking-wide text-[var(--foreground)] sm:text-4xl">
              Desafíos por plata
            </h2>
            <p className="mt-2 text-[var(--muted-foreground)]">
              Explorá partidos en el mapa, con el premio en cada pin.
            </p>
          </div>
          <Link
            href="/desafios"
            className="inline-flex rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--fulbito-green-hover)]"
          >
            Ver mapa
          </Link>
        </div>

        {items.length === 0 ? (
          <p className="mt-8 text-sm text-[var(--muted-foreground)]">
            Todavía no hay desafíos publicados. Se crean desde el espacio admin del predio.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-3">
            {items.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/desafios/${d.id}`}
                  className="block rounded-2xl border border-[#E0E0E0] bg-white p-4 shadow-sm transition hover:border-[var(--fulbito-green)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold text-[#1A2E4A]">{d.titulo}</p>
                    <span className="rounded-full bg-[#1A2E4A] px-3 py-1 text-xs font-semibold text-white">
                      {formatPremioArs(Number(d.premio))}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-[#1A2E4A]/70">
                    {MATCH_TIPO_LABEL[d.tipo] ?? d.tipo} · {d.fecha}
                  </p>
                  <p className="mt-2 flex items-center gap-1 text-sm text-[#1A2E4A]/70">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span className="line-clamp-1">{d.direccion}</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
