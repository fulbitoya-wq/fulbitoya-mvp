import DisponibilidadCalendario from "@/components/canchas/DisponibilidadCalendario";
import { supabase } from "@/lib/supabase";
import {
  MapPin,
  Car,
  Shirt,
  UtensilsCrossed,
} from "lucide-react";

type Props = { params: Promise<{ id: string }> };

export default async function CanchaDetallePage({ params }: Props) {
  const { id } = await params;
  
  const fechaISO = new Date().toISOString().slice(0, 10);
  const fechaFin = new Date();
  fechaFin.setDate(fechaFin.getDate() + 9);
  const fechaFinISO = fechaFin.toISOString().slice(0, 10);

  const { data: cancha } = await supabase
    .from("canchas")
    .select("id, nombre, direccion, barrio, logo_url, foto_url, fondo_url, estacionamiento, buffet, vestuarios, activa, provincia_id, partido_id, localidad_id")
    .eq("id", id)
    .eq("activa", true)
    .single();

  if (!cancha) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <h1 className="font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
          Cancha no encontrada
        </h1>
        <p className="mt-2 text-[#1A2E4A]/80">No existe o no está activa.</p>
      </div>
    );
  }

  const { data: campos } = await supabase
    .from("campos")
    .select("id, nombre, tipo, superficie, luz, camaras, minutero, marcador_gol, foto_url, observaciones")
    .eq("cancha_id", id)
    .order("created_at", { ascending: false });

  const campoIds = (campos ?? []).map((c: any) => c.id);

  const { data: disponibilidades } = campoIds.length
    ? await supabase
    .from("disponibilidades")
    .select("id, fecha, hora_inicio, hora_fin, precio, campo_id")
    .gte("fecha", fechaISO)
    .lte("fecha", fechaFinISO)
    .eq("estado", "disponible")
    .in("campo_id", campoIds)
    : { data: [] };

  const [provNombre, partNombre, locNombre] = await Promise.all([
    cancha?.provincia_id
      ? supabase.from("provincias").select("nombre").eq("id", cancha.provincia_id).single()
      : Promise.resolve({ data: null, error: null }),
    cancha?.partido_id
      ? supabase.from("partidos").select("nombre").eq("id", cancha.partido_id).single()
      : Promise.resolve({ data: null, error: null }),
    cancha?.localidad_id
      ? supabase.from("localidades").select("nombre").eq("id", cancha.localidad_id).single()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const locationText = [provNombre?.data?.nombre, partNombre?.data?.nombre, locNombre?.data?.nombre]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-10 sm:px-6 lg:px-8">
      <div
        className="overflow-hidden rounded-2xl border border-[#E0E0E0] bg-white shadow-sm"
        style={
          cancha.fondo_url
            ? {
                backgroundImage: `linear-gradient(rgba(26,46,74,.65), rgba(26,46,74,.65)), url(${cancha.fondo_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }
            : undefined
        }
      >
        <div className={`p-6 sm:p-8 ${cancha.fondo_url ? "text-white" : ""}`}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-5">
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#F5F5F5] border border-[#E0E0E0]">
              {cancha.logo_url || cancha.foto_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cancha.logo_url ?? cancha.foto_url ?? ""}
                  alt={`Logo del predio ${cancha.nombre}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#1A2E4A]/50">?</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className={`font-heading text-4xl uppercase tracking-wide ${cancha.fondo_url ? "text-white" : "text-[#1A2E4A]"}`}>
                {cancha.nombre}
              </h1>
              {(cancha.direccion || cancha.barrio) && (
                <div className={`mt-2 flex items-center gap-2 text-sm ${cancha.fondo_url ? "text-white/90" : "text-[#1A2E4A]/70"}`}>
                  <MapPin className="h-4 w-4" />
                  <span>{cancha.direccion ?? cancha.barrio}</span>
                </div>
              )}
              {locationText && (
                <p className={`mt-1 text-sm ${cancha.fondo_url ? "text-white/90" : "text-[#1A2E4A]/70"}`}>{locationText}</p>
              )}

              {(cancha.estacionamiento || cancha.buffet || cancha.vestuarios) && (
                <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm ${cancha.fondo_url ? "text-white/90" : "text-[#1A2E4A]/70"}`}>
                  {cancha.estacionamiento && (
                    <span className="inline-flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      Estacionamiento
                    </span>
                  )}
                  {cancha.buffet && (
                    <span className="inline-flex items-center gap-2">
                      <UtensilsCrossed className="h-4 w-4" />
                      Buffet
                    </span>
                  )}
                  {cancha.vestuarios && (
                    <span className="inline-flex items-center gap-2">
                      <Shirt className="h-4 w-4" />
                      Vestuarios
                    </span>
                  )}
                </div>
              )}

              <p className={`mt-4 text-sm ${cancha.fondo_url ? "text-white/90" : "text-[#1A2E4A]/70"}`}>
                Seleccioná una fecha para ver horarios disponibles.
              </p>
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>

      <DisponibilidadCalendario
        campos={(campos ?? []) as any[]}
        disponibilidades={(disponibilidades ?? []) as any[]}
        initialDateISO={fechaISO}
      />
    </div>
  );
}
