"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { crearCampo } from "@/lib/campos";
import { supabase } from "@/lib/supabase";

const BUCKET_FOTOS = "campo-fotos";
const MAX_FOTO_MB = 2;

export default function CrearCampoPlaceholderPage() {
  const params = useParams();
  const canchaId = params.id as string;
  const router = useRouter();

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<string>("5");
  const [superficie, setSuperficie] = useState<string>("cesped_sintetico");
  const [valorHora, setValorHora] = useState<string>("0");
  const [valorReserva, setValorReserva] = useState<string>("0");
  const [luz, setLuz] = useState(false);
  const [camaras, setCamaras] = useState(false);
  const [minutero, setMinutero] = useState(false);
  const [marcadorGol, setMarcadorGol] = useState(false);
  const [observaciones, setObservaciones] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [canchaId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("Debés estar logueado.");
      setLoading(false);
      return;
    }

    let fotoUrl: string | null = null;
    if (fotoFile) {
      const path = `${user.id}/${Date.now()}_${fotoFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET_FOTOS)
        .upload(path, fotoFile, { upsert: false });

      if (uploadErr) {
        setError(uploadErr.message || "Error al subir la foto.");
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from(BUCKET_FOTOS).getPublicUrl(path);
      fotoUrl = urlData.publicUrl;
    }

    const valorHoraNum = Number(valorHora);
    const valorReservaNum = Number(valorReserva);
    if (!Number.isFinite(valorHoraNum) || !Number.isFinite(valorReservaNum) || valorHoraNum < 0 || valorReservaNum < 0) {
      setError("Ingresá montos válidos para valor por hora y valor de reserva.");
      setLoading(false);
      return;
    }

    const { data, error: err } = await crearCampo({
      valor_hora: valorHoraNum,
      valor_reserva: valorReservaNum,
      cancha_id: canchaId,
      nombre: nombre.trim() || "Campo",
      tipo,
      superficie,
      luz,
      camaras,
      minutero,
      marcador_gol: marcadorGol,
      observaciones: observaciones.trim() || null,
      foto_url: fotoUrl,
    });

    setLoading(false);
    if (err) {
      setError(err);
      return;
    }

    router.push(`/dashboard/canchas/${canchaId}/campos`);
  };

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link href="/dashboard/canchas" className="text-sm font-medium text-[#1A2E4A]/70 hover:underline">
        ← Volver a mis canchas
      </Link>

      <h1 className="mt-4 font-subheading text-2xl font-semibold text-[#1A2E4A]">
        Nuevo campo
      </h1>
      <p className="mt-2 text-[#1A2E4A]/70">Complejo ID: {canchaId}</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div>
          <label htmlFor="nombre" className="block text-sm font-medium text-[#1A2E4A]">
            Nombre del campo
          </label>
          <input
            id="nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej. Cancha Principal"
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
          />
        </div>

        <div>
          <label htmlFor="tipo" className="block text-sm font-medium text-[#1A2E4A]">
            Tipo
          </label>
          <select
            id="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
          >
            <option value="5">Fútbol 5</option>
            <option value="7">Fútbol 7</option>
            <option value="9">Fútbol 9</option>
            <option value="11">Fútbol 11</option>
          </select>
        </div>

        <div>
          <label htmlFor="superficie" className="block text-sm font-medium text-[#1A2E4A]">
            Superficie
          </label>
          <select
            id="superficie"
            value={superficie}
            onChange={(e) => setSuperficie(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] bg-white px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
          >
            <option value="cesped_natural">Césped natural</option>
            <option value="cesped_sintetico">Césped sintético</option>
            <option value="tierra">Tierra</option>
            <option value="cemento">Cemento</option>
          </select>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="valor_hora" className="block text-sm font-medium text-[#1A2E4A]">
              Valor por hora (ARS)
            </label>
            <input
              id="valor_hora"
              type="number"
              min={0}
              step="0.01"
              value={valorHora}
              onChange={(e) => setValorHora(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
              placeholder="Ej. 40000"
            />
          </div>
          <div>
            <label htmlFor="valor_reserva" className="block text-sm font-medium text-[#1A2E4A]">
              Valor reserva / seña (ARS)
            </label>
            <input
              id="valor_reserva"
              type="number"
              min={0}
              step="0.01"
              value={valorReserva}
              onChange={(e) => setValorReserva(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
              placeholder="Ej. 15000"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-lg border border-[#E0E0E0] bg-white px-4 py-3">
            <span className="text-sm font-medium text-[#1A2E4A]">Luz</span>
            <input type="checkbox" checked={luz} onChange={(e) => setLuz(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-[#E0E0E0] bg-white px-4 py-3">
            <span className="text-sm font-medium text-[#1A2E4A]">Cámaras</span>
            <input type="checkbox" checked={camaras} onChange={(e) => setCamaras(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-[#E0E0E0] bg-white px-4 py-3">
            <span className="text-sm font-medium text-[#1A2E4A]">Minutero</span>
            <input type="checkbox" checked={minutero} onChange={(e) => setMinutero(e.target.checked)} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-[#E0E0E0] bg-white px-4 py-3">
            <span className="text-sm font-medium text-[#1A2E4A]">Marcador de gol</span>
            <input type="checkbox" checked={marcadorGol} onChange={(e) => setMarcadorGol(e.target.checked)} />
          </label>
        </div>

        <div>
          <label htmlFor="observaciones" className="block text-sm font-medium text-[#1A2E4A]">
            Observaciones (opcional)
          </label>
          <textarea
            id="observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Detalles del campo..."
            rows={4}
            className="mt-1 w-full resize-none rounded-lg border border-[#E0E0E0] px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A2E4A]">
            Foto del campo (opcional)
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) {
                    setFotoFile(null);
                    setFotoPreview(null);
                    return;
                  }
                  if (file.size > MAX_FOTO_MB * 1024 * 1024) {
                    setError(`La foto no puede superar ${MAX_FOTO_MB} MB.`);
                    setFotoFile(null);
                    setFotoPreview(null);
                    return;
                  }
                  setError(null);
                  setFotoFile(file);
                  setFotoPreview(URL.createObjectURL(file));
                }}
                className="block w-full text-sm text-[#1A2E4A] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--fulbito-green)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-[var(--fulbito-green-hover)]"
              />
            </div>
            {fotoPreview && (
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-[#E0E0E0] bg-[#F5F5F5]">
                <img src={fotoPreview} alt="Vista previa foto" className="h-full w-full object-cover" />
              </div>
            )}
          </div>
          <p className="mt-1 text-xs text-[#1A2E4A]/60">
            Formatos JPG, PNG, WebP, GIF. Máx. {MAX_FOTO_MB} MB.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 font-medium text-white transition hover:bg-[var(--fulbito-green-hover)] disabled:opacity-70"
          >
            {loading ? "Creando..." : "Crear campo"}
          </button>
          <button
            type="button"
            onClick={() => router.push(`/dashboard/canchas/${canchaId}/campos`)}
            className="rounded-lg border border-[#E0E0E0] px-4 py-2 font-medium text-[#1A2E4A] transition hover:bg-[#F5F5F5]"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

