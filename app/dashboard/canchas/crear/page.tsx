"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { crearCancha } from "@/lib/canchas";
import { getLocalidadesByPartido, getPartidosByProvincia, getProvincias, type Localidad, type Partido, type Provincia } from "@/lib/ubicaciones";
import { supabase } from "@/lib/supabase";

const BUCKET_LOGOS = "predio-logos";
const MAX_LOGO_FILE_MB = 2;
const BUCKET_FONDOS = "predio-fondos";
const MAX_FONDO_FILE_MB = 4;

export default function CrearCanchaPage() {
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [barrio, setBarrio] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [estacionamiento, setEstacionamiento] = useState(false);
  const [buffet, setBuffet] = useState(false);
  const [vestuarios, setVestuarios] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fondoInputRef = useRef<HTMLInputElement>(null);
  const [fondoFile, setFondoFile] = useState<File | null>(null);
  const [fondoPreview, setFondoPreview] = useState<string | null>(null);

  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);

  const [provinciaId, setProvinciaId] = useState<string>("");
  const [partidoId, setPartidoId] = useState<string>("");
  const [localidadId, setLocalidadId] = useState<string>("");

  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  const [loadingUbicaciones, setLoadingUbicaciones] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    if (file.size > MAX_LOGO_FILE_MB * 1024 * 1024) {
      setError(`El logo no puede superar ${MAX_LOGO_FILE_MB} MB.`);
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }

    setError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const onFondoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setFondoFile(null);
      setFondoPreview(null);
      return;
    }

    if (file.size > MAX_FONDO_FILE_MB * 1024 * 1024) {
      setError(`La imagen de fondo no puede superar ${MAX_FONDO_FILE_MB} MB.`);
      setFondoFile(null);
      setFondoPreview(null);
      return;
    }

    setError(null);
    setFondoFile(file);
    setFondoPreview(URL.createObjectURL(file));
  };

  useEffect(() => {
    const load = async () => {
      setLoadingUbicaciones(true);
      try {
        const provs = await getProvincias();
        setProvincias(provs);
      } finally {
        setLoadingUbicaciones(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    // Reset coordinates when locality changes (fresh selection)
    const loc = localidades.find((l) => l.id === localidadId);
    setLat(loc?.lat ?? null);
    setLng(loc?.lng ?? null);
  }, [localidadId, localidades]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Debés estar logueado.");
      setLoading(false);
      return;
    }

    let logoUrl: string | null = null;
    if (logoFile) {
      const path = `${user.id}/${Date.now()}_${logoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(BUCKET_LOGOS)
        .upload(path, logoFile, { upsert: false });

      if (uploadErr) {
        setError(uploadErr.message || "Error al subir el logo.");
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from(BUCKET_LOGOS).getPublicUrl(uploadData.path);
      logoUrl = urlData.publicUrl;
    }

    let fondoUrl: string | null = null;
    if (fondoFile) {
      const path = `${user.id}/${Date.now()}_${fondoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(BUCKET_FONDOS)
        .upload(path, fondoFile, { upsert: false });

      if (uploadErr) {
        setError(uploadErr.message || "Error al subir la imagen de fondo.");
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from(BUCKET_FONDOS).getPublicUrl(uploadData.path);
      fondoUrl = urlData.publicUrl;
    }

    const { data, error: err } = await crearCancha({
      nombre: nombre.trim(),
      direccion: direccion.trim() || null,
      barrio: barrio.trim() || null,
      descripcion: descripcion.trim() || null,
      logo_url: logoUrl,
      fondo_url: fondoUrl,
      estacionamiento,
      buffet,
      vestuarios,
      provincia_id: provinciaId || null,
      partido_id: partidoId || null,
      localidad_id: localidadId || null,
      lat,
      lng,
    });

    setLoading(false);
    if (err) {
      setError(err);
      return;
    }

    router.push("/dashboard/canchas");
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/dashboard/canchas" className="text-sm font-medium text-[#1A2E4A]/70 hover:underline">
        ← Volver a mis canchas
      </Link>

      <h1 className="mt-4 font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
        Crear cancha
      </h1>

      <p className="mt-2 text-sm text-[#1A2E4A]/70">
        Seleccioná la ubicación para poder buscarla cerca en el futuro.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-[#1A2E4A]">
            Nombre de la cancha *
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
            placeholder="Ej. Cancha Los Pinos"
          />
        </div>

        <div>
          <label htmlFor="direccion" className="block text-sm font-medium text-[#1A2E4A]">
            Dirección (opcional)
          </label>
          <input
            id="direccion"
            type="text"
            value={direccion}
            onChange={(e) => setDireccion(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
            placeholder="Ej. Av. Siempre Viva 123"
          />
        </div>

        <div>
          <label htmlFor="barrio" className="block text-sm font-medium text-[#1A2E4A]">
            Barrio / zona (opcional)
          </label>
          <input
            id="barrio"
            type="text"
            value={barrio}
            onChange={(e) => setBarrio(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
            placeholder="Ej. Monte Grande"
          />
        </div>

        <div>
          <label htmlFor="descripcion" className="block text-sm font-medium text-[#1A2E4A]">
            Descripción (opcional)
          </label>
          <textarea
            id="descripcion"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
            rows={3}
            placeholder="Contanos algo de la cancha..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A2E4A]">Logo del predio (opcional)</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onLogoChange}
                className="block w-full text-sm text-[#1A2E4A] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--fulbito-green)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-[var(--fulbito-green-hover)]"
              />
            </div>
            {logoPreview && (
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-[#E0E0E0] bg-[#F5F5F5]">
                <img src={logoPreview} alt="Vista previa logo" className="h-full w-full object-contain" />
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-[#1A2E4A]/60">
            Formatos: JPG, PNG, WebP, GIF. Máx. {MAX_LOGO_FILE_MB} MB.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A2E4A]">
            Imagen de fondo del predio (opcional)
          </label>
          <div className="mt-2 flex flex-col gap-3">
            <input
              ref={fondoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onFondoChange}
              className="block w-full text-sm text-[#1A2E4A] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--fulbito-green)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-[var(--fulbito-green-hover)]"
            />
            {fondoPreview && (
              <div className="relative h-28 w-full overflow-hidden rounded-lg border border-[#E0E0E0] bg-[#F5F5F5]">
                <img src={fondoPreview} alt="Vista previa fondo predio" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-[#1A2E4A]/60">
            Formatos: JPG, PNG, WebP, GIF. Máx. {MAX_FONDO_FILE_MB} MB.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-3 text-sm font-medium text-[#1A2E4A]">
            <input type="checkbox" checked={estacionamiento} onChange={(e) => setEstacionamiento(e.target.checked)} />
            Estacionamiento
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-3 text-sm font-medium text-[#1A2E4A]">
            <input type="checkbox" checked={buffet} onChange={(e) => setBuffet(e.target.checked)} />
            Buffet
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-[#E0E0E0] bg-white px-4 py-3 text-sm font-medium text-[#1A2E4A]">
            <input type="checkbox" checked={vestuarios} onChange={(e) => setVestuarios(e.target.checked)} />
            Vestuarios
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A2E4A]">Ubicación</label>
          <div className="mt-2 space-y-3">
            <div>
              <label htmlFor="provincia" className="block text-sm font-medium text-[#1A2E4A]/90">
                Provincia
              </label>
              <select
                id="provincia"
                value={provinciaId}
                onChange={async (e) => {
                  const nextProvinciaId = e.target.value;
                  setProvinciaId(nextProvinciaId);
                  setPartidoId("");
                  setLocalidadId("");
                  setPartidos([]);
                  setLocalidades([]);

                  if (!nextProvinciaId) return;
                  setLoadingUbicaciones(true);
                  try {
                    const nextPartidos = await getPartidosByProvincia(nextProvinciaId);
                    setPartidos(nextPartidos);
                  } finally {
                    setLoadingUbicaciones(false);
                  }
                }}
                disabled={loadingUbicaciones}
                className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)] disabled:opacity-60"
              >
                <option value="">Seleccioná una provincia</option>
                {provincias.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="partido" className="block text-sm font-medium text-[#1A2E4A]/90">
                Partido / Municipio
              </label>
              <select
                id="partido"
                value={partidoId}
                onChange={async (e) => {
                  const nextPartidoId = e.target.value;
                  setPartidoId(nextPartidoId);
                  setLocalidadId("");
                  setLocalidades([]);

                  if (!nextPartidoId) return;
                  setLoadingUbicaciones(true);
                  try {
                    const nextLocalidades = await getLocalidadesByPartido(nextPartidoId);
                    setLocalidades(nextLocalidades);
                  } finally {
                    setLoadingUbicaciones(false);
                  }
                }}
                disabled={!provinciaId || loadingUbicaciones}
                className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)] disabled:opacity-60"
              >
                <option value="">{provinciaId ? "Seleccioná un partido" : "Primero seleccioná provincia"}</option>
                {partidos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="localidad" className="block text-sm font-medium text-[#1A2E4A]/90">
                Localidad
              </label>
              <select
                id="localidad"
                value={localidadId}
                onChange={(e) => setLocalidadId(e.target.value)}
                disabled={!partidoId || loadingUbicaciones}
                required
                className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)] disabled:opacity-60"
              >
                <option value="">{partidoId ? "Seleccioná una localidad" : "Primero seleccioná partido"}</option>
                {localidades.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 font-medium text-white transition hover:bg-[var(--fulbito-green-hover)] disabled:opacity-70"
          >
            {loading ? "Creando..." : "Crear cancha"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/canchas")}
            className="rounded-lg border border-[#E0E0E0] px-4 py-2 font-medium text-[#1A2E4A] transition hover:bg-[#F5F5F5]"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

