"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createMatch } from "@/lib/matches";
import { getLocalidadesByPartido, getPartidosByProvincia, getProvincias, type Localidad, type Partido, type Provincia } from "@/lib/ubicaciones";
import type { MatchTipo, MatchVisibilidad } from "@/lib/types";
import { PlacesAutocompleteInput } from "@/components/maps/PlacesAutocompleteInput";
import { AddressPreviewMap } from "@/components/maps/AddressPreviewMap";

export default function CrearMatchPage() {
  const router = useRouter();
  const [tipo, setTipo] = useState<MatchTipo>("f5");
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [provinciaId, setProvinciaId] = useState("");
  const [partidoId, setPartidoId] = useState("");
  const [localidadId, setLocalidadId] = useState("");
  const [direccion, setDireccion] = useState("");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [duracionMin, setDuracionMin] = useState(60);
  const [visibilidad, setVisibilidad] = useState<MatchVisibilidad>("publico");
  const [loading, setLoading] = useState(false);
  const [loadingUbicaciones, setLoadingUbicaciones] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoadingUbicaciones(true);
      const provs = await getProvincias();
      setProvincias(provs);
      setLoadingUbicaciones(false);
    };
    load();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data, error: createErr } = await createMatch({
      tipo,
      provincia_id: provinciaId,
      partido_id: partidoId,
      localidad_id: localidadId,
      direccion: direccion || null,
      place_id: placeId,
      lat,
      lng,
      fecha,
      hora_inicio: horaInicio,
      duracion_min: Number(duracionMin),
      visibilidad,
    });

    setLoading(false);
    if (createErr || !data) {
      setError(createErr ?? "No se pudo crear el match.");
      return;
    }

    router.push(`/jugador/matches/${data.id}`);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/jugador/matches" className="text-sm font-medium text-[#1A2E4A]/70 hover:underline">
        ← Volver a matches
      </Link>
      <h1 className="mt-4 font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">Crear match</h1>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div>
          <label htmlFor="tipo" className="block text-sm font-medium text-[#1A2E4A]">Tipo *</label>
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
          <label className="block text-sm font-medium text-[#1A2E4A]">Ubicación *</label>
          <div className="mt-2 space-y-3">
            <select
              value={provinciaId}
              onChange={async (e) => {
                const next = e.target.value;
                setProvinciaId(next);
                setPartidoId("");
                setLocalidadId("");
                setPartidos([]);
                setLocalidades([]);
                if (!next) return;
                setLoadingUbicaciones(true);
                setPartidos(await getPartidosByProvincia(next));
                setLoadingUbicaciones(false);
              }}
              required
              disabled={loadingUbicaciones}
              className="w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2"
            >
              <option value="">Seleccioná una provincia</option>
              {provincias.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>

            <select
              value={partidoId}
              onChange={async (e) => {
                const next = e.target.value;
                setPartidoId(next);
                setLocalidadId("");
                setLocalidades([]);
                if (!next) return;
                setLoadingUbicaciones(true);
                setLocalidades(await getLocalidadesByPartido(next));
                setLoadingUbicaciones(false);
              }}
              required
              disabled={!provinciaId || loadingUbicaciones}
              className="w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2"
            >
              <option value="">{provinciaId ? "Seleccioná un partido" : "Primero seleccioná provincia"}</option>
              {partidos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>

            <select
              value={localidadId}
              onChange={(e) => setLocalidadId(e.target.value)}
              required
              disabled={!partidoId || loadingUbicaciones}
              className="w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2"
            >
              <option value="">{partidoId ? "Seleccioná una localidad" : "Primero seleccioná partido"}</option>
              {localidades.map((l) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
            </select>

            <div>
              <label htmlFor="direccionMatch" className="block text-sm font-medium text-[#1A2E4A]">
                Dirección exacta (Google Maps)
              </label>
              <PlacesAutocompleteInput
                id="direccionMatch"
                value={direccion}
                onChange={setDireccion}
                placeholder="Cancha, club o dirección"
                onPlaceSelected={(place) => {
                  setDireccion(place.formattedAddress);
                  setLat(place.lat);
                  setLng(place.lng);
                  setPlaceId(place.placeId);
                }}
              />
              {lat !== null && lng !== null && <AddressPreviewMap lat={lat} lng={lng} />}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="fecha" className="block text-sm font-medium text-[#1A2E4A]">Fecha *</label>
            <input id="fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2" />
          </div>
          <div>
            <label htmlFor="horaInicio" className="block text-sm font-medium text-[#1A2E4A]">Hora inicio *</label>
            <input id="horaInicio" type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} required className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="duracion" className="block text-sm font-medium text-[#1A2E4A]">Duración (min) *</label>
            <input id="duracion" type="number" min={30} step={15} value={duracionMin} onChange={(e) => setDuracionMin(Number(e.target.value))} required className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2" />
          </div>
          <div>
            <label htmlFor="visibilidad" className="block text-sm font-medium text-[#1A2E4A]">Visibilidad *</label>
            <select id="visibilidad" value={visibilidad} onChange={(e) => setVisibilidad(e.target.value as MatchVisibilidad)} className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2">
              <option value="publico">Público</option>
              <option value="privado">Privado</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={loading} className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 font-medium text-white hover:bg-[var(--fulbito-green-hover)] disabled:opacity-70">
            {loading ? "Creando..." : "Crear match"}
          </button>
          <Link href="/jugador/matches" className="rounded-lg border border-[#E0E0E0] px-4 py-2 font-medium text-[#1A2E4A] hover:bg-[#F5F5F5]">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
