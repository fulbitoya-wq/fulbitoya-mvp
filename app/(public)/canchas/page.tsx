"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Car, MapPin, Shirt, Star, UtensilsCrossed } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { buscarCanchasConDisponibilidad, type CanchaDisponibilidadCard } from "@/lib/canchas";
import type { Localidad, Partido, Provincia } from "@/lib/ubicaciones";
import { getLocalidadesByPartido, getPartidosByProvincia, getProvincias } from "@/lib/ubicaciones";

function tipoToTexto(tipo: string | null): string {
  const map: Record<string, string> = { "5": "Fútbol 5", "7": "Fútbol 7", "9": "Fútbol 9", "11": "Fútbol 11" };
  if (!tipo) return "";
  return map[tipo] ?? tipo;
}

export default function CanchasPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-16 text-center text-[#1A2E4A]/70">
          Cargando canchas...
        </div>
      }
    >
      <CanchasPageInner />
    </Suspense>
  );
}

function CanchasPageInner() {
  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const searchParams = useSearchParams();

  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);

  const [provinciaId, setProvinciaId] = useState<string>("");
  const [partidoId, setPartidoId] = useState<string>("");
  const [localidadId, setLocalidadId] = useState<string>("");
  const [zonaTexto, setZonaTexto] = useState<string>("");
  const [tipo, setTipo] = useState<string>(""); // campos.tipo ('5','7','9','11')
  const [fechaISO, setFechaISO] = useState<string>(todayISO);
  const [horaInicio, setHoraInicio] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CanchaDisponibilidadCard[]>([]);

  useEffect(() => {
    const load = async () => {
      const ps = await getProvincias();
      setProvincias(ps);
    };
    load();
  }, []);

  // Prefill desde query (viene de la homepage).
  useEffect(() => {
    const zona = searchParams.get("zona");
    const qpTipo = searchParams.get("tipo");
    const qpFecha = searchParams.get("fecha");
    const qpHora = searchParams.get("hora");
    const qpProvincia = searchParams.get("provinciaId");
    const qpPartido = searchParams.get("partidoId");
    const qpLocalidad = searchParams.get("localidadId");

    if (zona !== null) setZonaTexto(zona);
    if (qpTipo !== null) setTipo(qpTipo);
    if (qpFecha !== null && qpFecha.length === 10) setFechaISO(qpFecha);
    if (qpHora !== null) setHoraInicio(qpHora);
    if (qpProvincia !== null) setProvinciaId(qpProvincia);
    if (qpPartido !== null) setPartidoId(qpPartido);
    if (qpLocalidad !== null) setLocalidadId(qpLocalidad);
  }, [searchParams]);

  // Auto-búsqueda cuando vienen parámetros desde query.
  const [didAutoSearch, setDidAutoSearch] = useState(false);
  useEffect(() => {
    const hasAnyParam =
      searchParams.get("zona") ||
      searchParams.get("tipo") ||
      searchParams.get("fecha") ||
      searchParams.get("hora") ||
      searchParams.get("provinciaId") ||
      searchParams.get("partidoId") ||
      searchParams.get("localidadId");

    if (!hasAnyParam) return;
    if (didAutoSearch) return;
    setDidAutoSearch(true);

    // Usamos los valores actuales del query (no del state) para evitar timing.
    const zona = searchParams.get("zona");
    const qpTipo = searchParams.get("tipo");
    const qpFecha = searchParams.get("fecha");
    const qpHora = searchParams.get("hora");
    const qpProvincia = searchParams.get("provinciaId");
    const qpPartido = searchParams.get("partidoId");
    const qpLocalidad = searchParams.get("localidadId");

    // Si no viene fecha, usamos hoy.
    const fecha = qpFecha && qpFecha.length === 10 ? qpFecha : todayISO;

    setLoading(true);
    setError(null);
    buscarCanchasConDisponibilidad({
      zonaTexto: qpLocalidad || qpPartido ? null : zona || null,
      tipo: qpTipo || null,
      fechaISO: fecha,
      horaInicio: qpHora || null,
      provinciaId: qpProvincia || null,
      partidoId: qpPartido || null,
      localidadId: qpLocalidad || null,
    })
      .then((cards) => {
        setResults(cards);
        if (cards.length === 0) setError("No encontramos turnos con esos filtros.");
      })
      .catch((err: any) => setError(err?.message ?? "Ocurrió un error buscando canchas."))
      .finally(() => setLoading(false));
  }, [didAutoSearch, searchParams, todayISO]);

  useEffect(() => {
    if (!provinciaId) {
      setPartidos([]);
      setLocalidades([]);
      setPartidoId("");
      setLocalidadId("");
      return;
    }

    const load = async () => {
      const ps = await getPartidosByProvincia(provinciaId);
      setPartidos(ps);
      setLocalidades([]);
      setPartidoId("");
      setLocalidadId("");
    };

    load();
  }, [provinciaId]);

  useEffect(() => {
    if (!partidoId) {
      setLocalidades([]);
      setLocalidadId("");
      return;
    }

    const load = async () => {
      const ls = await getLocalidadesByPartido(partidoId);
      setLocalidades(ls);
      setLocalidadId("");
    };

    load();
  }, [partidoId]);

  async function handleBuscar(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const cards = await buscarCanchasConDisponibilidad({
        provinciaId: provinciaId || null,
        partidoId: partidoId || null,
        localidadId: localidadId || null,
        zonaTexto: localidadId || partidoId ? null : zonaTexto || null,
        tipo: tipo || null,
        fechaISO,
        horaInicio: horaInicio || null,
      });
      setResults(cards);
      if (cards.length === 0) setError("No encontramos turnos para esa fecha con esos filtros.");
    } catch (err: any) {
      setError(err?.message ?? "Ocurrió un error buscando canchas.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-10 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-heading text-4xl uppercase tracking-wide text-[#1A2E4A]">Buscar canchas</h1>
        <p className="mt-2 text-[#1A2E4A]/80">Elegí una zona, el tipo y la fecha. Te mostramos turnos disponibles.</p>
      </div>

      <form onSubmit={handleBuscar} className="mt-8 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[#1A2E4A]" htmlFor="zona">
              Zona / Ciudad
            </label>
            <input
              id="zona"
              type="text"
              placeholder="Ej. Palermo"
              value={zonaTexto}
              onChange={(e) => setZonaTexto(e.target.value)}
              disabled={!!localidadId || !!partidoId}
              className="mt-1 block w-full rounded-md border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A2E4A]" htmlFor="provincia">
              Provincia
            </label>
            <select
              id="provincia"
              value={provinciaId}
              onChange={(e) => setProvinciaId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {provincias.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A2E4A]" htmlFor="partido">
              Partido / Municipio
            </label>
            <select
              id="partido"
              value={partidoId}
              onChange={(e) => setPartidoId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
              disabled={!partidos.length}
            >
              <option value="">{partidos.length ? "Todos" : "Seleccioná una provincia"}</option>
              {partidos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A2E4A]" htmlFor="localidad">
              Localidad
            </label>
            <select
              id="localidad"
              value={localidadId}
              onChange={(e) => setLocalidadId(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
              disabled={!localidades.length}
            >
              <option value="">{localidades.length ? "Todas" : "Seleccioná un partido"}</option>
              {localidades.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nombre} ({l.codigo_postal ?? "CP"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A2E4A]" htmlFor="tipo">
              Tipo de cancha
            </label>
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="5">Fútbol 5</option>
              <option value="7">Fútbol 7</option>
              <option value="9">Fútbol 9</option>
              <option value="11">Fútbol 11</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A2E4A]" htmlFor="fecha">
              Fecha
            </label>
            <input
              id="fecha"
              type="date"
              value={fechaISO}
              onChange={(e) => setFechaISO(e.target.value)}
              min={todayISO}
              className="mt-1 block w-full rounded-md border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1A2E4A]" htmlFor="hora">
              Horario (desde)
            </label>
            <input
              id="hora"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="mt-1 block w-full rounded-md border border-[#E0E0E0] bg-white px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-lg bg-[var(--fulbito-green)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--fulbito-green-hover)] disabled:opacity-60"
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>
      </form>

      {error && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900" role="alert">
          {error}
        </div>
      )}

      <div className="mt-8">
        {results.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => {
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
          <div className="mt-4 rounded-xl border border-dashed border-[#E0E0E0] bg-white p-6 text-sm text-[#1A2E4A]/70">
            Cargá una zona y presioná <b>Buscar</b> para ver turnos disponibles.
          </div>
        )}
      </div>
    </div>
  );
}
