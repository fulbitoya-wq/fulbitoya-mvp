"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { crearEquipo } from "@/lib/equipos";
import { getLocalidadesByPartido, getPartidosByProvincia, getProvincias, type Localidad, type Partido, type Provincia } from "@/lib/ubicaciones";

const BUCKET_LOGOS = "equipo-logos";
const MAX_FILE_MB = 2;

export default function CrearEquipoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nombre, setNombre] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [provincias, setProvincias] = useState<Provincia[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [provinciaId, setProvinciaId] = useState<string>("");
  const [partidoId, setPartidoId] = useState<string>("");
  const [localidadId, setLocalidadId] = useState<string>("");
  const [loadingUbicaciones, setLoadingUbicaciones] = useState(false);
  const [tipoEquipo, setTipoEquipo] = useState<number>(5);
  const [capacidadMax, setCapacidadMax] = useState<number>(10);
  const [colorPrimario, setColorPrimario] = useState<string>("#1A2E4A");
  const [colorSecundario, setColorSecundario] = useState<string>("#00A152");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`La imagen no puede superar ${MAX_FILE_MB} MB.`);
      setLogoFile(null);
      setLogoPreview(null);
      return;
    }
    setError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
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

    let logoUrl: string | undefined;
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

    const { data, error: err } = await crearEquipo({
      nombre: nombre.trim(),
      ciudad: ciudad.trim() || undefined,
      tipo_equipo: tipoEquipo,
      capacidad_max: capacidadMax,
      color_primario: colorPrimario,
      color_secundario: colorSecundario,
      provincia_id: provinciaId || null,
      partido_id: partidoId || null,
      localidad_id: localidadId || null,
      uniforme_imagen_url: logoUrl,
      creado_por: user.id,
    });

    setLoading(false);
    if (err) {
      setError(err);
      return;
    }
    if (data) router.push(`/jugador/equipos/${data.id}`);
  };

  return (
    <div className="mx-auto max-w-xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/jugador/equipos" className="text-sm font-medium text-[#1A2E4A]/70 hover:underline">
        ← Volver a equipos
      </Link>
      <h1 className="mt-4 font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
        Crear equipo
      </h1>
      <p className="mt-2 text-sm text-[#1A2E4A]/70">
        Vos serás el capitán. Después podés invitar jugadores por email.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-[#1A2E4A]">
            Nombre del equipo *
          </label>
          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
            placeholder="Ej. Los Pumas FC"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A2E4A]">Ubicación del equipo</label>
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
                  setCiudad("");

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
                  setCiudad("");

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
                <option value="">
                  {provinciaId ? "Seleccioná un partido" : "Primero seleccioná provincia"}
                </option>
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
                onChange={(e) => {
                  const nextLocalidadId = e.target.value;
                  setLocalidadId(nextLocalidadId);
                  const loc = localidades.find((l) => l.id === nextLocalidadId);
                  setCiudad(loc?.nombre ?? "");
                }}
                disabled={!partidoId || loadingUbicaciones}
                className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)] disabled:opacity-60"
              >
                <option value="">
                  {partidoId ? "Seleccioná una localidad" : "Primero seleccioná partido"}
                </option>
                {localidades.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="tipoEquipo" className="block text-sm font-medium text-[#1A2E4A]">
            Tipo de equipo *
          </label>
          <select
            id="tipoEquipo"
            name="tipo_equipo"
            value={tipoEquipo}
            onChange={(e) => {
              const next = Number(e.target.value);
              setTipoEquipo(next);
              setCapacidadMax(next * 2);
            }}
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
          >
            <option value={5}>Fútbol 5</option>
            <option value={7}>Fútbol 7</option>
            <option value={11}>Fútbol 11</option>
          </select>
          <p className="mt-2 text-sm text-[#1A2E4A]/70">
            Capacidad máxima: {capacidadMax} jugadores
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="colorPrimario" className="block text-sm font-medium text-[#1A2E4A]">
              Color principal
            </label>
            <input
              id="colorPrimario"
              name="color_primario"
              type="color"
              value={colorPrimario}
              onChange={(e) => setColorPrimario(e.target.value)}
              className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-[#E0E0E0] bg-white p-1 focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
            />
            <p className="mt-1 text-xs text-[#1A2E4A]/60">HEX: {colorPrimario}</p>
          </div>

          <div>
            <label htmlFor="colorSecundario" className="block text-sm font-medium text-[#1A2E4A]">
              Color secundario
            </label>
            <input
              id="colorSecundario"
              name="color_secundario"
              type="color"
              value={colorSecundario}
              onChange={(e) => setColorSecundario(e.target.value)}
              className="mt-1 h-10 w-full cursor-pointer rounded-lg border border-[#E0E0E0] bg-white p-1 focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
            />
            <p className="mt-1 text-xs text-[#1A2E4A]/60">HEX: {colorSecundario}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A2E4A]">
            Logo del equipo
          </label>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-start">
            <div className="flex shrink-0 items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onLogoChange}
                className="block w-full max-w-xs text-sm text-[#1A2E4A] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--fulbito-green)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-[var(--fulbito-green-hover)]"
              />
              {logoPreview && (
                <div className="relative h-14 w-14 overflow-hidden rounded-lg border border-[#E0E0E0] bg-[#F5F5F5]">
                  <img src={logoPreview} alt="Vista previa logo" className="h-full w-full object-contain" />
                </div>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-[#1A2E4A]/60">
            Opcional. Máx. {MAX_FILE_MB} MB. Formatos: JPG, PNG, WebP, GIF.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 font-medium text-white transition hover:bg-[var(--fulbito-green-hover)] disabled:opacity-70"
          >
            {loading ? "Creando..." : "Crear equipo"}
          </button>
          <Link
            href="/jugador/equipos"
            className="rounded-lg border border-[#E0E0E0] px-4 py-2 font-medium text-[#1A2E4A] transition hover:bg-[#F5F5F5]"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
