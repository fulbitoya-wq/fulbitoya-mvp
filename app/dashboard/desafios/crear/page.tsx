"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createDesafio } from "@/lib/desafios";
import { getCanchasDelOwner } from "@/lib/canchas";
import { supabase } from "@/lib/supabase";
import { PlacesAutocompleteInput } from "@/components/maps/PlacesAutocompleteInput";
import { AddressPreviewMap } from "@/components/maps/AddressPreviewMap";
import type { MatchTipo } from "@/lib/types";

export default function CrearDesafioPage() {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<MatchTipo>("f5");
  const [premio, setPremio] = useState("");
  const [direccion, setDireccion] = useState("");
  const [barrio, setBarrio] = useState("");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [duracionMin, setDuracionMin] = useState(90);
  const [descripcion, setDescripcion] = useState("");
  const [canchaId, setCanchaId] = useState("");
  const [canchas, setCanchas] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const rows = await getCanchasDelOwner(user.id);
      setCanchas(rows.map((c) => ({ id: c.id, nombre: c.nombre })));
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (lat === null || lng === null) {
      setError("Elegí una dirección de las sugerencias de Google Maps.");
      return;
    }

    setLoading(true);
    const { data, error: createErr } = await createDesafio({
      titulo,
      tipo,
      premio: Number(premio),
      direccion,
      barrio: barrio || null,
      place_id: placeId,
      lat,
      lng,
      fecha,
      hora_inicio: horaInicio,
      duracion_min: Number(duracionMin),
      descripcion: descripcion || null,
      cancha_id: canchaId || null,
    });
    setLoading(false);

    if (createErr || !data) {
      setError(createErr ?? "No se pudo crear el desafío.");
      return;
    }
    router.push("/dashboard/desafios");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/dashboard/desafios" className="text-sm font-medium text-[#1A2E4A]/70 hover:underline">
        ← Volver a desafíos
      </Link>
      <h1 className="mt-4 font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">Crear desafío</h1>
      <p className="mt-2 text-sm text-[#1A2E4A]/70">
        Se publica en el mapa con el premio, al estilo de las cards de precio de Airbnb.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div>
          <label htmlFor="titulo" className="block text-sm font-medium text-[#1A2E4A]">
            Título *
          </label>
          <input
            id="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2"
            placeholder="Ej. Desafío F5 Los Pinos"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium text-[#1A2E4A]">
              Tipo *
            </label>
            <select
              id="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as MatchTipo)}
              className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2"
            >
              <option value="f5">Fútbol 5</option>
              <option value="f7">Fútbol 7</option>
              <option value="f9">Fútbol 9</option>
              <option value="f11">Fútbol 11</option>
            </select>
          </div>
          <div>
            <label htmlFor="premio" className="block text-sm font-medium text-[#1A2E4A]">
              Premio / plata *
            </label>
            <input
              id="premio"
              type="number"
              min={0}
              step={500}
              value={premio}
              onChange={(e) => setPremio(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2"
              placeholder="50000"
            />
          </div>
        </div>

        <div>
          <label htmlFor="direccion" className="block text-sm font-medium text-[#1A2E4A]">
            Dirección (Google Maps) *
          </label>
          <PlacesAutocompleteInput
            id="direccion"
            value={direccion}
            required
            onChange={(v) => {
              setDireccion(v);
              setLat(null);
              setLng(null);
            }}
            onPlaceSelected={(place) => {
              setDireccion(place.formattedAddress);
              setLat(place.lat);
              setLng(place.lng);
              setPlaceId(place.placeId);
              if (place.barrio) setBarrio(place.barrio);
            }}
            placeholder="Empezá a escribir y elegí de la lista"
          />
          {lat !== null && lng !== null && (
            <>
              <p className="mt-1 text-xs text-[var(--fulbito-green)]">Ubicación fijada en el mapa.</p>
              <AddressPreviewMap lat={lat} lng={lng} />
            </>
          )}
        </div>

        <div>
          <label htmlFor="cancha" className="block text-sm font-medium text-[#1A2E4A]">
            Cancha (opcional)
          </label>
          <select
            id="cancha"
            value={canchaId}
            onChange={(e) => setCanchaId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2"
          >
            <option value="">Sin vincular</option>
            {canchas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="fecha" className="block text-sm font-medium text-[#1A2E4A]">
              Fecha *
            </label>
            <input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2"
            />
          </div>
          <div>
            <label htmlFor="hora" className="block text-sm font-medium text-[#1A2E4A]">
              Hora *
            </label>
            <input
              id="hora"
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2"
            />
          </div>
        </div>

        <div>
          <label htmlFor="duracion" className="block text-sm font-medium text-[#1A2E4A]">
            Duración (min)
          </label>
          <input
            id="duracion"
            type="number"
            min={30}
            step={15}
            value={duracionMin}
            onChange={(e) => setDuracionMin(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2"
          />
        </div>

        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium text-[#1A2E4A]">
            Descripción
          </label>
          <textarea
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            rows={3}
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 font-medium text-white hover:bg-[var(--fulbito-green-hover)] disabled:opacity-70"
          >
            {loading ? "Publicando..." : "Publicar desafío"}
          </button>
          <Link
            href="/dashboard/desafios"
            className="rounded-lg border border-[#E0E0E0] px-4 py-2 font-medium text-[#1A2E4A] hover:bg-[#F5F5F5]"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
