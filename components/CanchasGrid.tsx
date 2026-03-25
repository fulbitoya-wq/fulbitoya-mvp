import Link from "next/link";
import Image from "next/image";
import { Car, MapPin, Shirt, Star, UtensilsCrossed } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";

export async function CanchasGrid() {
  type CampoRow = {
    id: string;
    nombre: string;
    tipo: string | null;
    superficie: string | null;
    valor_hora: number | null;
    valor_reserva: number | null;
    foto_url: string | null;
    cancha_id: string;
    canchas: {
      id: string;
      nombre: string;
      direccion: string | null;
      barrio: string | null;
      logo_url: string | null;
      foto_url: string | null;
      estacionamiento: boolean | null;
      buffet: boolean | null;
      vestuarios: boolean | null;
      activa: boolean;
    } | null;
  };

  const { data, error } = await supabase
    .from("campos")
    .select(
      `
        id,
        nombre,
        tipo,
        superficie,
        valor_hora,
        valor_reserva,
        foto_url,
        cancha_id,
        canchas(
          id,
          nombre,
          direccion,
          barrio,
          logo_url,
          foto_url,
          estacionamiento,
          buffet,
          vestuarios,
          activa
        )
      `
    )
    .order("created_at", { ascending: false })
    .limit(9);

  if (error) {
    console.error("Error cargando campos/canchas para CanchasGrid:", error);
  }

  const items = data ?? [];

  // Precio/Disponibilidad de "hoy" para mostrar el mismo look & feel.
  const todayISO = new Date().toISOString().slice(0, 10);
  const campoIds = items.map((r: any) => r.id).filter(Boolean);
  const { data: dispRows } = campoIds.length
    ? await supabase
        .from("disponibilidades")
        .select("campo_id, precio")
        .eq("fecha", todayISO)
        .eq("estado", "disponible")
        .in("campo_id", campoIds)
    : { data: [] };

  const precioByCampoId = new Map<string, number>();
  const countByCampoId = new Map<string, number>();
  for (const r of dispRows ?? []) {
    const cid = r.campo_id as string;
    const precio = Number(r.precio ?? 0);
    countByCampoId.set(cid, (countByCampoId.get(cid) ?? 0) + 1);
    if (!precioByCampoId.has(cid) || precio < (precioByCampoId.get(cid) ?? Infinity)) {
      precioByCampoId.set(cid, precio);
    }
  }
  const canchas = items
    .map((row) => {
      const nested = row.canchas as unknown;
      const canchaRaw = Array.isArray(nested) ? nested[0] : nested;
      if (!canchaRaw || typeof canchaRaw !== "object") return null;
      const cancha = canchaRaw as NonNullable<CampoRow["canchas"]>;

      const tipoTexto: Record<string, string> = {
        "5": "Fútbol 5",
        "7": "Fútbol 7",
        "9": "Fútbol 9",
        "11": "Fútbol 11",
      };

      const fotoFallback = cancha.logo_url ?? cancha.foto_url ?? "/images/cancha-1.jpg";
      const fotoCampo = row.foto_url ?? fotoFallback;

      const precioHoy = precioByCampoId.get(row.id) ?? 40000;
      const disponibleHoy = (countByCampoId.get(row.id) ?? 0) > 0;

      return {
        key: row.id,
        campoId: row.id,
        canchaId: cancha.id,
        canchaNombre: cancha.nombre,
        campoNombre: row.nombre,
        tipoTexto: row.tipo ? tipoTexto[row.tipo] ?? row.tipo : "",
        superficie: row.superficie ?? "",
        direccion: cancha.direccion ?? cancha.barrio ?? "",
        logo: fotoCampo,
        estacionamiento: cancha.estacionamiento ?? false,
        buffet: cancha.buffet ?? false,
        vestuarios: cancha.vestuarios ?? false,
        rating: 4.8,
        disponible: disponibleHoy,
        precio: precioHoy,
        valorHora: row.valor_hora === null || row.valor_hora === undefined ? null : Number(row.valor_hora),
        valorReserva: row.valor_reserva === null || row.valor_reserva === undefined ? null : Number(row.valor_reserva),
      };
    })
    .filter(
      (
        row
      ): row is {
        key: string;
        campoId: string;
        canchaId: string;
        canchaNombre: string;
        campoNombre: string;
        tipoTexto: string;
        superficie: string;
        direccion: string;
        logo: string;
        estacionamiento: boolean;
        buffet: boolean;
        vestuarios: boolean;
        rating: number;
        disponible: boolean;
        precio: number;
        valorHora: number | null;
        valorReserva: number | null;
      } => row !== null
    );

  return (
    <section id="canchas" className="bg-[var(--background)] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="font-heading text-3xl tracking-wide text-[var(--foreground)] sm:text-4xl">
          Canchas destacadas
        </h2>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Las canchas más populares cerca tuyo
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {canchas.map((cancha) => (
            <Link
              key={cancha.key}
              href={`/canchas/${cancha.canchaId}#campo-${cancha.campoId}`}
              className="block"
            >
              <Card
                className="group overflow-hidden border-2 border-transparent transition-all hover:border-[var(--fulbito-green)] hover:shadow-lg"
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--white-smoke)]">
                  <Image
                    src={cancha.logo}
                    alt={cancha.campoNombre || cancha.canchaNombre}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  {cancha.disponible && (
                    <span className="absolute right-3 top-3 rounded-full bg-[var(--fulbito-green)] px-3 py-1 text-xs font-semibold text-white">
                      Disponible
                    </span>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-[var(--foreground)]">
                        {cancha.canchaNombre}
                      </h3>
                      <div className="mt-1 flex items-center gap-1 text-sm text-[var(--muted-foreground)]">
                        <MapPin className="h-4 w-4" />
                        <span>{cancha.direccion}</span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                        {cancha.tipoTexto ? `${cancha.tipoTexto} - ` : ""}
                        {cancha.superficie || cancha.campoNombre}
                      </p>
                      {(cancha.estacionamiento || cancha.buffet || cancha.vestuarios) && (
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted-foreground)]">
                          {cancha.estacionamiento && (
                            <span className="inline-flex items-center gap-1">
                              <Car className="h-3.5 w-3.5" />
                              Estac.
                            </span>
                          )}
                          {cancha.buffet && (
                            <span className="inline-flex items-center gap-1">
                              <UtensilsCrossed className="h-3.5 w-3.5" />
                              Buffet
                            </span>
                          )}
                          {cancha.vestuarios && (
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
                      <span className="font-medium">{cancha.rating}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                    <span className="text-sm text-[var(--muted-foreground)]">Hora </span>
                    <span className="text-lg font-bold text-[var(--foreground)]">
                      ${((cancha.valorHora ?? cancha.precio) || 0).toLocaleString("es-AR")}
                    </span>
                    <span className="text-sm text-[var(--muted-foreground)]">/hora</span>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      Reserva: ${((cancha.valorReserva ?? 0) || 0).toLocaleString("es-AR")}
                    </div>
                    </div>
                  <span className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--fulbito-green-hover)]">
                    Reservar
                  </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
