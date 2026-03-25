import { HeroSection } from "@/components/HeroSection";
import { CanchasGrid } from "@/components/CanchasGrid";
import { HowItWorks } from "@/components/HowItWorks";
import { OwnersCTA } from "@/components/OwnersCTA";
import Image from "next/image";
import Link from "next/link";
import { Car, MapPin, Shirt, Star, UtensilsCrossed } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buscarCanchasConDisponibilidad, type CanchaDisponibilidadCard } from "@/lib/canchas";

function tipoToTexto(tipo: string | null): string {
  const map: Record<string, string> = { "5": "Fútbol 5", "7": "Fútbol 7", "9": "Fútbol 9", "11": "Fútbol 11" };
  if (!tipo) return "";
  return map[tipo] ?? tipo;
}

function getParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const v = searchParams[key];
  if (!v) return null;
  if (Array.isArray(v)) return v[0] ?? null;
  return v;
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;

  const fecha = getParam(resolvedSearchParams, "fecha") ?? new Date().toISOString().slice(0, 10);
  const hora = getParam(resolvedSearchParams, "hora");
  const nearby = getParam(resolvedSearchParams, "nearby");

  const zonaTexto = getParam(resolvedSearchParams, "zona");
  const provinciaId = getParam(resolvedSearchParams, "provinciaId");
  const partidoId = getParam(resolvedSearchParams, "partidoId");
  const localidadId = getParam(resolvedSearchParams, "localidadId");
  const tipo = getParam(resolvedSearchParams, "tipo");

  // Búsqueda por ubicación: por ahora ignoramos tipo/hora como filtros.
  const shouldSearchByLocation = !!fecha && (!!localidadId || !!partidoId || !!provinciaId || !!zonaTexto);

  // "Cerca de vos": ubicación + disponibilidad para hoy, sin filtrar por hora exacta.
  const shouldSearchNearby =
    nearby === "1" && !!fecha && (!!localidadId || !!partidoId || !!provinciaId);

  const shouldShowResults = shouldSearchByLocation || shouldSearchNearby;

  let cards: CanchaDisponibilidadCard[] = [];
  let nearbyLevel: "localidad" | "partido" | "provincia" | null = null;
  if (shouldSearchNearby && fecha) {
    nearbyLevel = "localidad";
    cards = await buscarCanchasConDisponibilidad({
      fechaISO: fecha,
      horaInicio: null,
      tipo: null,
      zonaTexto: null,
      provinciaId: provinciaId || null,
      partidoId: partidoId || null,
      localidadId: localidadId || null,
    });

    // Fallbacks de cercanía:
    // 1) si no hay resultados en localidad, ampliar a partido
    // 2) si no hay resultados en partido, ampliar a provincia
    if (cards.length === 0 && partidoId) {
      nearbyLevel = "partido";
      cards = await buscarCanchasConDisponibilidad({
        fechaISO: fecha,
        horaInicio: null,
        tipo: null,
        zonaTexto: null,
        provinciaId: provinciaId || null,
        partidoId,
        localidadId: null,
      });
    }

    if (cards.length === 0 && provinciaId) {
      nearbyLevel = "provincia";
      cards = await buscarCanchasConDisponibilidad({
        fechaISO: fecha,
        horaInicio: null,
        tipo: null,
        zonaTexto: null,
        provinciaId,
        partidoId: null,
        localidadId: null,
      });
    }
  } else if (shouldSearchByLocation && fecha) {
    cards = await buscarCanchasConDisponibilidad({
      fechaISO: fecha,
      horaInicio: null,
      tipo: null,
      zonaTexto: zonaTexto || null,
      provinciaId: provinciaId || null,
      partidoId: partidoId || null,
      localidadId: localidadId || null,
    });

  }

  // Filtro final de seguridad por ubicación (aplica para nearby y búsqueda manual).
  if (shouldSearchNearby) {
    if (nearbyLevel === "localidad" && localidadId) cards = cards.filter((c) => c.localidadId === localidadId);
    else if (nearbyLevel === "partido" && partidoId) cards = cards.filter((c) => c.partidoId === partidoId);
    else if (nearbyLevel === "provincia" && provinciaId) cards = cards.filter((c) => c.provinciaId === provinciaId);
  } else {
    if (localidadId) cards = cards.filter((c) => c.localidadId === localidadId);
    if (partidoId) cards = cards.filter((c) => c.partidoId === partidoId);
    if (provinciaId) cards = cards.filter((c) => c.provinciaId === provinciaId);
  }

  return (
    <main className="min-h-screen">
      <HeroSection />
      {shouldShowResults ? (
        <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mt-6">
            <h2 className="font-heading text-3xl tracking-wide text-[#1A2E4A] sm:text-4xl">
              {shouldSearchNearby ? "Cerca de vos" : "Resultados"}
            </h2>
            <p className="mt-2 text-[#1A2E4A]/80">
              {shouldSearchNearby
                ? "Turnos disponibles para hoy"
                : `${fecha} · ${zonaTexto ?? "Ubicación seleccionada"}`}
            </p>
          </div>

          {cards.length > 0 ? (
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((r) => {
                const imgSrc = r.fotoUrl ?? r.logoUrl ?? "/images/cancha-1.jpg";
                return (
                  <Link
                    key={`${r.canchaId}-${r.campoId}`}
                    href={`/canchas/${r.canchaId}#campo-${r.campoId}`}
                    className="block"
                  >
                    <Card className="group overflow-hidden border-2 border-transparent transition-all hover:border-[var(--fulbito-green)] hover:shadow-lg">
                      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--white-smoke)]">
                        <Image
                          src={imgSrc}
                          alt={r.campoNombre || r.canchaNombre}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                        {r.disponible && (
                          <span className="absolute right-3 top-3 rounded-full bg-[var(--fulbito-green)] px-3 py-1 text-xs font-semibold text-white">
                            Disponible
                          </span>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-[var(--foreground)]">{r.canchaNombre}</h3>
                            <div className="mt-1 flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                              <MapPin className="h-4 w-4" />
                              <span>{r.direccion || "Zona"}</span>
                            </div>
                            <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                              {r.tipo ? `${tipoToTexto(r.tipo)} - ` : ""}
                              {r.superficie || r.campoNombre}
                            </p>

                            {(r.estacionamiento || r.buffet || r.vestuarios) && (
                              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                                {r.estacionamiento && (
                                  <span className="inline-flex items-center gap-1">
                                    <Car className="h-3.5 w-3.5" />
                                    Estac.
                                  </span>
                                )}
                                {r.buffet && (
                                  <span className="inline-flex items-center gap-1">
                                    <UtensilsCrossed className="h-3.5 w-3.5" />
                                    Buffet
                                  </span>
                                )}
                                {r.vestuarios && (
                                  <span className="inline-flex items-center gap-1">
                                    <Shirt className="h-3.5 w-3.5" />
                                    Vestuarios
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-1 text-sm">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <span className="font-medium">4.8</span>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div>
                            <span className="text-sm text-[var(--muted-foreground)]">Hora </span>
                            <span className="text-lg font-bold text-[var(--foreground)]">
                              ${((r.valorHora ?? r.precioDesde) || 0).toLocaleString("es-AR")}
                            </span>
                            <span className="text-sm text-[var(--muted-foreground)]">/hora</span>
                            <div className="text-xs text-[var(--muted-foreground)]">
                              Reserva: ${((r.valorReserva ?? 0) || 0).toLocaleString("es-AR")}
                            </div>
                          </div>
                          <span className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--fulbito-green-hover)]">
                            Reservar
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 rounded-xl border border-dashed border-[#E0E0E0] bg-white p-6 text-sm text-[#1A2E4A]/70">
              {shouldSearchNearby ? "No encontramos turnos cerca de tu ubicación para hoy." : "No encontramos turnos para esa combinación."}
            </div>
          )}
        </section>
      ) : (
        <CanchasGrid />
      )}
      <HowItWorks />
      <OwnersCTA />
    </main>
  );
}
